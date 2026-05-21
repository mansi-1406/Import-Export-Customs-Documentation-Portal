import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Database
try {
  await initDb();
  console.log('Database initialized successfully.');
} catch (err) {
  console.error('Failed to initialize database:', err);
}

// -------------------------------------------------------------
// DASHBOARD ENDPOINTS
// -------------------------------------------------------------
app.get('/api/dashboard', async (req, res) => {
  try {
    const totalShipmentsRes = await query("SELECT count(*) as count FROM shipments");
    const pendingShipmentsRes = await query("SELECT count(*) as count FROM shipments WHERE status = 'Pending Approval'");
    
    // For expired certificates
    const today = new Date().toISOString().split('T')[0];
    const expiredCertsRes = await query("SELECT count(*) as count FROM compliance_certificates WHERE expiry_date < $1", [today]);
    
    // For expiring soon certificates (next 30 days)
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const thirtyDaysLaterStr = thirtyDaysLater.toISOString().split('T')[0];
    const expiringCertsRes = await query("SELECT count(*) as count FROM compliance_certificates WHERE expiry_date >= $1 AND expiry_date <= $2", [today, thirtyDaysLaterStr]);

    const activeAlertsRes = await query("SELECT count(*) as count FROM alerts WHERE is_read = false");

    // Monthly shipments counts (simple mock grouping for charts)
    const shipmentsStats = [
      { month: 'Jan', count: 12 },
      { month: 'Feb', count: 19 },
      { month: 'Mar', count: 15 },
      { month: 'Apr', count: 25 },
      { month: 'May', count: 22 },
    ];

    res.json({
      totalShipments: parseInt(totalShipmentsRes.rows[0]?.count || totalShipmentsRes.rows[0]?.['count(*)'] || '0'),
      pendingApprovals: parseInt(pendingShipmentsRes.rows[0]?.count || pendingShipmentsRes.rows[0]?.['count(*)'] || '0'),
      expiredCertificates: parseInt(expiredCertsRes.rows[0]?.count || expiredCertsRes.rows[0]?.['count(*)'] || '0'),
      expiringCertificates: parseInt(expiringCertsRes.rows[0]?.count || expiringCertsRes.rows[0]?.['count(*)'] || '0'),
      activeAlerts: parseInt(activeAlertsRes.rows[0]?.count || activeAlertsRes.rows[0]?.['count(*)'] || '0'),
      shipmentsStats
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving dashboard metrics' });
  }
});

// -------------------------------------------------------------
// CLIENTS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/clients', async (req, res) => {
  try {
    const result = await query("SELECT * FROM clients ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving clients' });
  }
});

app.post('/api/clients', async (req, res) => {
  const { company_name, email, phone, compliance_status } = req.body;
  if (!company_name || !email) {
    return res.status(400).json({ error: 'Company name and Email are required' });
  }
  try {
    const result = await query(
      "INSERT INTO clients (company_name, email, phone, compliance_status) VALUES ($1, $2, $3, $4) RETURNING *",
      [company_name, email, phone, compliance_status || 'Pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'A client with this email already exists' });
    }
    res.status(500).json({ error: 'Server error creating client' });
  }
});

// -------------------------------------------------------------
// SHIPMENTS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/shipments', async (req, res) => {
  try {
    const result = await query(`
      SELECT s.*, c.company_name as client_name 
      FROM shipments s 
      LEFT JOIN clients c ON s.client_id = c.id 
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving shipments' });
  }
});

app.post('/api/shipments', async (req, res) => {
  const { tracking_number, client_id, type, origin_country, destination_country, status } = req.body;
  if (!tracking_number || !client_id || !type || !origin_country || !destination_country) {
    return res.status(400).json({ error: 'Missing required shipment details' });
  }
  try {
    const result = await query(
      "INSERT INTO shipments (tracking_number, client_id, type, origin_country, destination_country, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [tracking_number, client_id, type, origin_country, destination_country, status || 'Draft']
    );
    
    // Add custom alert if shipment status is pending approval
    if (status === 'Pending Approval') {
      await query("INSERT INTO alerts (message, type) VALUES ($1, $2)", [
        `New shipment ${tracking_number} submitted and requires approval.`,
        'Approval'
      ]);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Tracking number must be unique' });
    }
    res.status(500).json({ error: 'Server error creating shipment' });
  }
});

app.patch('/api/shipments/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await query(
      "UPDATE shipments SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating shipment' });
  }
});

// -------------------------------------------------------------
// DOCUMENTS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/shipments/:shipmentId/documents', async (req, res) => {
  const { shipmentId } = req.params;
  try {
    const result = await query("SELECT * FROM documents WHERE shipment_id = $1", [shipmentId]);
    res.json(result.rows.map(doc => ({
      ...doc,
      content: typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving documents' });
  }
});

app.post('/api/documents', async (req, res) => {
  const { shipment_id, doc_type, status, content } = req.body;
  if (!shipment_id || !doc_type || !content) {
    return res.status(400).json({ error: 'Shipment ID, document type, and content are required' });
  }
  try {
    const stringifiedContent = typeof content === 'string' ? content : JSON.stringify(content);
    
    // Check if document of this type already exists for the shipment
    const checkExists = await query(
      "SELECT id FROM documents WHERE shipment_id = $1 AND doc_type = $2",
      [shipment_id, doc_type]
    );

    let result;
    if (checkExists.rows.length > 0) {
      // Update existing
      result = await query(
        "UPDATE documents SET content = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *",
        [stringifiedContent, status || 'Draft', checkExists.rows[0].id]
      );
    } else {
      // Insert new
      result = await query(
        "INSERT INTO documents (shipment_id, doc_type, status, content) VALUES ($1, $2, $3, $4) RETURNING *",
        [shipment_id, doc_type, status || 'Draft', stringifiedContent]
      );
    }

    res.status(201).json({
      ...result.rows[0],
      content: JSON.parse(result.rows[0].content)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error saving document' });
  }
});

// -------------------------------------------------------------
// COMPLIANCE CERTIFICATES ENDPOINTS
// -------------------------------------------------------------
app.get('/api/certificates', async (req, res) => {
  try {
    const result = await query(`
      SELECT cc.*, c.company_name as client_name 
      FROM compliance_certificates cc
      LEFT JOIN clients c ON cc.client_id = c.id
      ORDER BY cc.expiry_date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving certificates' });
  }
});

app.post('/api/certificates', async (req, res) => {
  const { client_id, certificate_name, certificate_number, expiry_date, file_path } = req.body;
  if (!client_id || !certificate_name || !certificate_number || !expiry_date) {
    return res.status(400).json({ error: 'Missing required certificate fields' });
  }
  try {
    const result = await query(
      "INSERT INTO compliance_certificates (client_id, certificate_name, certificate_number, expiry_date, file_path) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [client_id, certificate_name, certificate_number, expiry_date, file_path || null]
    );

    // Calculate if it is already expired or expiring soon, and create an alert
    const expiry = new Date(expiry_date);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const clientRes = await query("SELECT company_name FROM clients WHERE id = $1", [client_id]);
    const clientName = clientRes.rows[0]?.company_name || 'Client';

    if (diffDays < 0) {
      await query("INSERT INTO alerts (message, type) VALUES ($1, $2)", [
        `${clientName}: ${certificate_name} has expired!`,
        'Expiry'
      ]);
    } else if (diffDays <= 30) {
      await query("INSERT INTO alerts (message, type) VALUES ($1, $2)", [
        `${clientName}: ${certificate_name} is expiring in ${diffDays} days!`,
        'Expiry'
      ]);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating certificate' });
  }
});

// -------------------------------------------------------------
// ALERTS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/alerts', async (req, res) => {
  try {
    const result = await query("SELECT * FROM alerts ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving alerts' });
  }
});

app.post('/api/alerts/read', async (req, res) => {
  const { id } = req.body;
  try {
    if (id) {
      await query("UPDATE alerts SET is_read = true WHERE id = $1", [id]);
    } else {
      await query("UPDATE alerts SET is_read = true");
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating alerts' });
  }
});

// Serve static client assets in production
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      // Graceful fallback if client hasn't been built yet
      res.status(404).send('Static assets not found. Please build the client project first.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
