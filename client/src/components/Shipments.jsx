import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  FileText, 
  Plus, 
  MapPin, 
  Ship, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle, 
  Edit3, 
  ArrowLeftRight 
} from 'lucide-react';
import DocumentEditor from './DocumentEditor';

const API_BASE = 'http://localhost:5050/api';

function Shipments({ selectedShipment, clearSelectedShipment }) {
  const [shipments, setShipments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeShipment, setActiveShipment] = useState(null);
  const [editingDocType, setEditingDocType] = useState(null);
  const [shipmentDocs, setShipmentDocs] = useState([]);

  // React Hook Form for new Shipment
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Load Shipments and Clients
  const loadData = async () => {
    try {
      const shipRes = await fetch(`${API_BASE}/shipments`);
      const clientRes = await fetch(`${API_BASE}/clients`);
      if (shipRes.ok && clientRes.ok) {
        const ships = await shipRes.json();
        const cls = await clientRes.json();
        setShipments(ships);
        setClients(cls);
        
        // If a shipment was pre-selected from Dashboard
        if (selectedShipment) {
          const match = ships.find(s => s.id === selectedShipment.id);
          if (match) {
            handleSelectShipment(match);
          }
        }
      }
    } catch (err) {
      console.warn('Backend offline, loading mock shipments...');
      // Fallbacks
      const mockClients = [
        { id: 1, company_name: "Global Shipping Logistics" },
        { id: 2, company_name: "Apex Freight Forwarders" },
        { id: 3, company_name: "Oceanic Trade Corp" }
      ];
      const mockShips = [
        { id: 1, tracking_number: 'SH-2026-0001', client_id: 1, client_name: 'Global Shipping Logistics', type: 'Import', origin_country: 'Germany', destination_country: 'United States', status: 'Approved', created_at: new Date().toISOString() },
        { id: 2, tracking_number: 'SH-2026-0002', client_id: 2, client_name: 'Apex Freight Forwarders', type: 'Export', origin_country: 'United States', destination_country: 'Japan', status: 'Pending Approval', created_at: new Date().toISOString() },
        { id: 3, tracking_number: 'SH-2026-0003', client_id: 3, client_name: 'Oceanic Trade Corp', type: 'Import', origin_country: 'China', destination_country: 'Germany', status: 'Draft', created_at: new Date().toISOString() }
      ];
      setShipments(mockShips);
      setClients(mockClients);

      if (selectedShipment) {
        const match = mockShips.find(s => s.id === selectedShipment.id);
        if (match) handleSelectShipment(match);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedShipment]);

  // Load documents for specific shipment
  const loadShipmentDocuments = async (shipmentId) => {
    try {
      const res = await fetch(`${API_BASE}/shipments/${shipmentId}/documents`);
      if (res.ok) {
        const docs = await res.json();
        setShipmentDocs(docs);
      }
    } catch (err) {
      console.warn('Backend offline, loading mock documents...');
      // Return mock docs matching this shipment
      if (shipmentId === 1) {
        setShipmentDocs([
          { id: 1, shipment_id: 1, doc_type: 'Bill of Lading', status: 'Approved', content: { shipper: "Global Shipping Logistics", consignee: "ACME Corp", carrier: "Maersk Line", portOfLoading: "Hamburg, Germany", portOfDischarge: "New York, USA", vesselName: "Maersk McKinney Moller", voyageNumber: "V-204", descriptionOfGoods: "Industrial machinery parts and sensors", grossWeight: "12,450 kg", measurement: "45 CBM" } }
        ]);
      } else if (shipmentId === 2) {
        setShipmentDocs([
          { id: 2, shipment_id: 2, doc_type: 'Packing List', status: 'Submitted', content: { shipper: "Apex Freight Forwarders", consignee: "Kyoto Logistics", invoiceNumber: "INV-APX-882", totalPackages: "12 Pallets", items: [{ description: "Microcontrollers", quantity: 5000, weight: "240 kg" }] } }
        ]);
      } else {
        setShipmentDocs([]);
      }
    }
  };

  const handleSelectShipment = (shipment) => {
    setActiveShipment(shipment);
    loadShipmentDocuments(shipment.id);
  };

  const handleCreateShipment = async (data) => {
    try {
      const res = await fetch(`${API_BASE}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          client_id: parseInt(data.client_id)
        })
      });
      if (res.ok) {
        setShowAddForm(false);
        reset();
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create shipment');
      }
    } catch (err) {
      // offline creation simulation
      const newShip = {
        id: Date.now(),
        tracking_number: data.tracking_number,
        client_id: parseInt(data.client_id),
        client_name: clients.find(c => c.id === parseInt(data.client_id))?.company_name || 'New Client',
        type: data.type,
        origin_country: data.origin_country,
        destination_country: data.destination_country,
        status: 'Draft',
        created_at: new Date().toISOString()
      };
      setShipments(prev => [newShip, ...prev]);
      setShowAddForm(false);
      reset();
    }
  };

  const handleUpdateShipmentStatus = async (shipmentId, status) => {
    try {
      const res = await fetch(`${API_BASE}/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveShipment(prev => ({ ...prev, status: updated.status }));
        loadData();
      }
    } catch (err) {
      // Offline fallback update
      setActiveShipment(prev => ({ ...prev, status }));
      setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status } : s));
    }
  };

  // Document status helper
  const getDocStatus = (docType) => {
    const doc = shipmentDocs.find(d => d.doc_type === docType);
    return doc ? doc.status : 'Not Prepared';
  };

  if (editingDocType) {
    const existingDoc = shipmentDocs.find(d => d.doc_type === editingDocType);
    return (
      <DocumentEditor 
        shipment={activeShipment} 
        docType={editingDocType} 
        existingData={existingDoc}
        onBack={() => {
          setEditingDocType(null);
          loadShipmentDocuments(activeShipment.id);
        }}
      />
    );
  }

  return (
    <div>
      {/* Shipment Details View */}
      {activeShipment ? (
        <div>
          <button 
            className="btn btn-secondary" 
            style={{ marginBottom: '1.5rem' }}
            onClick={() => {
              setActiveShipment(null);
              if (clearSelectedShipment) clearSelectedShipment();
            }}
          >
            <ArrowLeft size={16} /> Back to Shipments
          </button>

          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="badge badge-draft" style={{ marginBottom: '0.5rem' }}>{activeShipment.type} shipment</span>
                <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Ship size={28} style={{ color: 'var(--accent-cyan)' }} />
                  {activeShipment.tracking_number}
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Forwarder: <strong>{activeShipment.client_name}</strong> &bull; Route: {activeShipment.origin_country} &rarr; {activeShipment.destination_country}
                </p>
              </div>

              {/* Status Update Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Filing Status:</span>
                <span className={`badge badge-${activeShipment.status.toLowerCase().replace(' ', '-')}`} style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                  {activeShipment.status}
                </span>
                {activeShipment.status === 'Draft' && (
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    onClick={() => handleUpdateShipmentStatus(activeShipment.id, 'Pending Approval')}
                  >
                    Submit for Approval
                  </button>
                )}
                {activeShipment.status === 'Pending Approval' && (
                  <>
                    <button 
                      className="btn" 
                      style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-green)', borderColor: 'var(--accent-green)', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      onClick={() => handleUpdateShipmentStatus(activeShipment.id, 'Approved')}
                    >
                      Approve
                    </button>
                    <button 
                      className="btn" 
                      style={{ background: 'rgba(244, 63, 94, 0.2)', color: 'var(--accent-red)', borderColor: 'var(--accent-red)', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      onClick={() => handleUpdateShipmentStatus(activeShipment.id, 'Rejected')}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.4rem', marginBottom: '1.25rem' }}>Required Customs Documentation</h2>
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {['Bill of Lading', 'Packing List', 'Certificate of Origin', 'Commercial Invoice'].map((type) => {
              const status = getDocStatus(type);
              return (
                <div key={type} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '180px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <span style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        background: 'rgba(6, 182, 212, 0.1)',
                        color: 'var(--accent-cyan)'
                      }}>
                        <FileText size={20} />
                      </span>
                      <span className={`badge ${
                        status === 'Approved' ? 'badge-approved' : 
                        status === 'Submitted' ? 'badge-pending' :
                        status === 'Draft' ? 'badge-draft' : 'badge-rejected'
                      }`}>
                        {status}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>{type}</h3>
                  </div>
                  
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
                    onClick={() => setEditingDocType(type)}
                  >
                    <Edit3 size={14} />
                    {status === 'Not Prepared' ? 'Prepare Form' : 'Edit Document'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Shipments List View */
        <div>
          <div className="page-header">
            <div>
              <h1 className="page-title">Customs Shipments</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Prepare and submit documentation packages for import/export clearances.
              </p>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus size={16} /> Create Shipment
            </button>
          </div>

          {/* Slide down Add Shipment Form */}
          {showAddForm && (
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Register New Shipment</h3>
              <form onSubmit={handleSubmit(handleCreateShipment)}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Tracking / Reference Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. SH-2026-9912"
                      {...register('tracking_number', { required: 'Tracking number is required' })} 
                    />
                    {errors.tracking_number && <span className="form-error">{errors.tracking_number.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Freight Forwarder Client</label>
                    <select 
                      className="form-control"
                      {...register('client_id', { required: 'Client selection is required' })}
                    >
                      <option value="">Select onboarded client</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.company_name}</option>
                      ))}
                    </select>
                    {errors.client_id && <span className="form-error">{errors.client_id.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Shipment Type</label>
                    <select 
                      className="form-control"
                      {...register('type', { required: 'Type is required' })}
                    >
                      <option value="Import">Import</option>
                      <option value="Export">Export</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Origin Country</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Germany"
                      {...register('origin_country', { required: 'Origin country is required' })} 
                    />
                    {errors.origin_country && <span className="form-error">{errors.origin_country.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Destination Country</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. United States"
                      {...register('destination_country', { required: 'Destination country is required' })} 
                    />
                    {errors.destination_country && <span className="form-error">{errors.destination_country.message}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => { setShowAddForm(false); reset(); }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Shipment
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Shipments Data Table */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Tracking Number</th>
                    <th>Forwarder / Client</th>
                    <th>Type</th>
                    <th>Origin &rarr; Destination</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                        No shipments registered yet. Click "Create Shipment" above to start.
                      </td>
                    </tr>
                  ) : (
                    shipments.map(ship => (
                      <tr key={ship.id} style={{ cursor: 'pointer' }} onClick={() => handleSelectShipment(ship)}>
                        <td style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Ship size={16} />
                            {ship.tracking_number}
                          </span>
                        </td>
                        <td>{ship.client_name || `Client #${ship.client_id}`}</td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <ArrowLeftRight size={14} style={{ color: ship.type === 'Import' ? 'var(--accent-blue)' : 'var(--accent-purple)' }} />
                            {ship.type}
                          </span>
                        </td>
                        <td>{ship.origin_country} &rarr; {ship.destination_country}</td>
                        <td>
                          <span className={`badge badge-${ship.status.toLowerCase().replace(' ', '-')}`}>
                            {ship.status}
                          </span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                            onClick={() => handleSelectShipment(ship)}
                          >
                            Documentation &rarr;
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Shipments;
