import sqlite3 from 'sqlite3';
import pg from 'pg';
import { readFileSync } from 'fs';
import path from 'path';

const usePg = process.env.DATABASE_URL || process.env.PGUSER;

let pool;
let sqliteDb;

if (usePg) {
  console.log('Connecting to PostgreSQL database...');
  const { Pool } = pg;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT || 5432,
  });
} else {
  console.log('Connecting to local SQLite database (database.sqlite)...');
  sqliteDb = new sqlite3.Database('./database.sqlite');
}

export async function query(sql, params = []) {
  if (usePg) {
    const res = await pool.query(sql, params);
    return res;
  } else {
    return new Promise((resolve, reject) => {
      // Translate PostgreSQL parameters $1, $2... to SQLite ?
      const sqliteSql = sql.replace(/\$\d+/g, '?');
      sqliteDb.all(sqliteSql, params, (err, rows) => {
        if (err) {
          console.error('SQLite query error:', err, 'SQL:', sqliteSql);
          return reject(err);
        }
        resolve({ rows });
      });
    });
  }
}

export async function initDb() {
  if (usePg) {
    // Read schema.sql and execute
    const schemaPath = path.resolve('schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);
  } else {
    // Read schema.sql, convert to SQLite format, and run exec
    const schemaPath = path.resolve('schema.sql');
    let schemaSql = readFileSync(schemaPath, 'utf8');
    
    // SQLite adjustments
    schemaSql = schemaSql.replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
    // Remove references checks that are unsupported or modify them to be simple
    schemaSql = schemaSql.replace(/CHECK\s*\((.*?)\)/gi, (match) => {
      // Keep CHECK constraint if simple, sqlite supports them
      return match;
    });
    
    await new Promise((resolve, reject) => {
      sqliteDb.exec(schemaSql, (err) => {
        if (err) {
          console.error('SQLite Schema Execution Error:', err);
          return reject(err);
        }
        resolve();
      });
    });
  }
  
  // Seed initial data if empty
  await seedData();
}

async function seedData() {
  try {
    let clientsCountQuery = usePg 
      ? "SELECT count(*) FROM clients" 
      : "SELECT count(*) as count FROM clients";
      
    const clientsRes = await query(clientsCountQuery);
    const count = parseInt(clientsRes.rows[0]['count'] || clientsRes.rows[0]['count(*)'] || '0');
    
    if (count === 0) {
      console.log("Seeding initial data...");
      
      // Seed Clients
      await query("INSERT INTO clients (company_name, email, phone, compliance_status) VALUES ($1, $2, $3, $4)", 
        ["Global Shipping Logistics", "info@globalshipping.com", "+1-555-0199", "Approved"]);
      await query("INSERT INTO clients (company_name, email, phone, compliance_status) VALUES ($1, $2, $3, $4)", 
        ["Apex Freight Forwarders", "contact@apexforward.com", "+1-555-0142", "Pending"]);
      await query("INSERT INTO clients (company_name, email, phone, compliance_status) VALUES ($1, $2, $3, $4)", 
        ["Oceanic Trade Corp", "compliance@oceanictrade.com", "+1-555-0188", "Approved"]);

      // Seed Certificates
      // Client 1 (Global Shipping): Valid certificate
      await query("INSERT INTO compliance_certificates (client_id, certificate_name, certificate_number, expiry_date, file_path) VALUES ($1, $2, $3, $4, $5)",
        [1, "Standard Import/Export License", "IEC-GLO-2024-99", "2027-12-31", "/uploads/iec_glo_2024.pdf"]);
      // Client 2 (Apex Freight): Certificate expiring soon (in 10 days)
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + 10);
      const expiringDateStr = expiringDate.toISOString().split('T')[0];
      await query("INSERT INTO compliance_certificates (client_id, certificate_name, certificate_number, expiry_date, file_path) VALUES ($1, $2, $3, $4, $5)",
        [2, "Customs Broker License", "CBL-APX-2025-42", expiringDateStr, "/uploads/cbl_apx_2025.pdf"]);
      // Client 3 (Oceanic Trade): Expired certificate (15 days ago)
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 15);
      const expiredDateStr = expiredDate.toISOString().split('T')[0];
      await query("INSERT INTO compliance_certificates (client_id, certificate_name, certificate_number, expiry_date, file_path) VALUES ($1, $2, $3, $4, $5)",
        [3, "Dangerous Goods Handling Permit", "DGP-OCN-2023-11", expiredDateStr, "/uploads/dgp_ocn_2023.pdf"]);

      // Seed Shipments
      await query("INSERT INTO shipments (tracking_number, client_id, type, origin_country, destination_country, status) VALUES ($1, $2, $3, $4, $5, $6)",
        ["SH-2026-0001", 1, "Import", "Germany", "United States", "Approved"]);
      await query("INSERT INTO shipments (tracking_number, client_id, type, origin_country, destination_country, status) VALUES ($1, $2, $3, $4, $5, $6)",
        ["SH-2026-0002", 2, "Export", "United States", "Japan", "Pending Approval"]);
      await query("INSERT INTO shipments (tracking_number, client_id, type, origin_country, destination_country, status) VALUES ($1, $2, $3, $4, $5, $6)",
        ["SH-2026-0003", 3, "Import", "China", "Germany", "Draft"]);

      // Seed Documents
      // Document for Shipment 1: Bill of Lading
      const bolContent = JSON.stringify({
        shipper: "Global Shipping Logistics",
        consignee: "ACME Corp",
        carrier: "Maersk Line",
        portOfLoading: "Hamburg, Germany",
        portOfDischarge: "New York, USA",
        vesselName: "Maersk McKinney Moller",
        voyageNumber: "V-204",
        descriptionOfGoods: "Industrial machinery parts and sensors",
        grossWeight: "12,450 kg",
        measurement: "45 CBM"
      });
      await query("INSERT INTO documents (shipment_id, doc_type, status, content) VALUES ($1, $2, $3, $4)",
        [1, "Bill of Lading", "Approved", bolContent]);

      // Document for Shipment 2: Packing List
      const plContent = JSON.stringify({
        shipper: "Apex Freight Forwarders",
        consignee: "Kyoto Logistics",
        invoiceNumber: "INV-APX-882",
        totalPackages: "12 Pallets",
        items: [
          { description: "Microcontrollers", quantity: 5000, weight: "240 kg" },
          { description: "Solid State Drives", quantity: 1200, weight: "180 kg" }
        ]
      });
      await query("INSERT INTO documents (shipment_id, doc_type, status, content) VALUES ($1, $2, $3, $4)",
        [2, "Packing List", "Submitted", plContent]);

      // Seed Alerts
      await query("INSERT INTO alerts (message, type) VALUES ($1, $2)",
        ["Apex Freight Forwarders: Customs Broker License is expiring in 10 days!", "Expiry"]);
      await query("INSERT INTO alerts (message, type) VALUES ($1, $2)",
        ["Oceanic Trade Corp: Dangerous Goods Handling Permit has expired!", "Expiry"]);
      await query("INSERT INTO alerts (message, type) VALUES ($1, $2)",
        ["New shipment SH-2026-0002 submitted and requires approval.", "Approval"]);
      
      console.log("Database seeded successfully!");
    }
  } catch (err) {
    console.error("Error seeding database:", err);
  }
}
