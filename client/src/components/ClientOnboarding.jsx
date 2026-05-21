import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  UserPlus, 
  Building, 
  Mail, 
  Phone, 
  ShieldCheck, 
  ShieldAlert,
  Calendar, 
  FileCheck, 
  UploadCloud, 
  Briefcase 
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

function ClientOnboarding() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientCertificates, setClientCertificates] = useState([]);
  const [showAddClientForm, setShowAddClientForm] = useState(false);
  const [showAddCertForm, setShowAddCertForm] = useState(false);

  // Forms
  const { register: registerClient, handleSubmit: handleSubmitClient, reset: resetClient, formState: { errors: clientErrors } } = useForm();
  const { register: registerCert, handleSubmit: handleSubmitCert, reset: resetCert, formState: { errors: certErrors } } = useForm();

  // Load clients
  const loadClients = async () => {
    try {
      const res = await fetch(`${API_BASE}/clients`);
      if (res.ok) {
        const data = await res.json();
        setClients(data);
        if (data.length > 0 && !selectedClient) {
          setSelectedClient(data[0]);
        }
      }
    } catch (err) {
      console.warn('Backend offline, using mock clients list...');
      const mockClients = [
        { id: 1, company_name: "Global Shipping Logistics", email: "info@globalshipping.com", phone: "+1-555-0199", compliance_status: "Approved", created_at: new Date().toISOString() },
        { id: 2, company_name: "Apex Freight Forwarders", email: "contact@apexforward.com", phone: "+1-555-0142", compliance_status: "Pending", created_at: new Date().toISOString() },
        { id: 3, company_name: "Oceanic Trade Corp", email: "compliance@oceanictrade.com", phone: "+1-555-0188", compliance_status: "Approved", created_at: new Date().toISOString() }
      ];
      setClients(mockClients);
      if (!selectedClient) setSelectedClient(mockClients[0]);
    } finally {
      setLoading(false);
    }
  };

  // Load certificates for the selected client
  const loadCertificates = async () => {
    if (!selectedClient) return;
    try {
      const res = await fetch(`${API_BASE}/certificates`);
      if (res.ok) {
        const data = await res.json();
        // Filter certificates for selected client
        setClientCertificates(data.filter(c => c.client_id === selectedClient.id));
      }
    } catch (err) {
      console.warn('Backend offline, loading mock certificates...');
      const mockCerts = [
        { id: 1, client_id: 1, certificate_name: "Standard Import/Export License", certificate_number: "IEC-GLO-2024-99", expiry_date: "2027-12-31", file_path: "/uploads/iec_glo_2024.pdf" },
        { id: 2, client_id: 2, certificate_name: "Customs Broker License", certificate_number: "CBL-APX-2025-42", expiry_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], file_path: "/uploads/cbl_apx_2025.pdf" },
        { id: 3, client_id: 3, certificate_name: "Dangerous Goods Handling Permit", certificate_number: "DGP-OCN-2023-11", expiry_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], file_path: "/uploads/dgp_ocn_2023.pdf" }
      ];
      setClientCertificates(mockCerts.filter(c => c.client_id === selectedClient.id));
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    loadCertificates();
  }, [selectedClient]);

  // Onboard client
  const handleOnboardClient = async (data) => {
    try {
      const res = await fetch(`${API_BASE}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setShowAddClientForm(false);
        resetClient();
        loadClients();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to onboard client');
      }
    } catch (err) {
      // offline simulation
      const newClient = {
        id: Date.now(),
        ...data,
        compliance_status: 'Pending',
        created_at: new Date().toISOString()
      };
      setClients(prev => [newClient, ...prev]);
      setSelectedClient(newClient);
      setShowAddClientForm(false);
      resetClient();
    }
  };

  // Upload/Add certificate
  const handleAddCertificate = async (data) => {
    try {
      const res = await fetch(`${API_BASE}/certificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClient.id,
          certificate_name: data.certificate_name,
          certificate_number: data.certificate_number,
          expiry_date: data.expiry_date,
          file_path: '/uploads/simulated_upload.pdf' // simulate file upload path
        })
      });
      if (res.ok) {
        setShowAddCertForm(false);
        resetCert();
        loadCertificates();
      }
    } catch (err) {
      // offline simulation
      const newCert = {
        id: Date.now(),
        client_id: selectedClient.id,
        certificate_name: data.certificate_name,
        certificate_number: data.certificate_number,
        expiry_date: data.expiry_date,
        file_path: '/uploads/simulated_upload.pdf'
      };
      setClientCertificates(prev => [...prev, newCert]);
      setShowAddCertForm(false);
      resetCert();
    }
  };

  const getDaysLeftColor = (dateStr) => {
    const expiry = new Date(dateStr);
    const today = new Date();
    const diff = expiry - today;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return 'var(--accent-red)';
    if (days <= 30) return 'var(--accent-yellow)';
    return 'var(--accent-green)';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: '500' }}>Loading clients compliance database...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Client Onboarding</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Manage client compliance licenses, permits, and customs authorization levels.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddClientForm(!showAddClientForm)}>
          <UserPlus size={16} /> Onboard Forwarder
        </button>
      </div>

      {/* Onboard Client Form */}
      {showAddClientForm && (
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Onboard New Freight Forwarder</h3>
          <form onSubmit={handleSubmitClient(handleOnboardClient)}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Acme Forwarding Inc"
                  {...registerClient('company_name', { required: 'Company name is required' })} 
                />
                {clientErrors.company_name && <span className="form-error">{clientErrors.company_name.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="e.g. corporate@acme.com"
                  {...registerClient('email', { required: 'Email is required' })} 
                />
                {clientErrors.email && <span className="form-error">{clientErrors.email.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Phone Line</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. +1-555-8812"
                  {...registerClient('phone')} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => { setShowAddClientForm(false); resetClient(); }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Register Onboard Status
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Two Column Section: Left (Clients List Selector), Right (Client Compliance Certificates Folder) */}
      <div className="content-grid-2">
        {/* Left Side: Clients list */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building size={18} style={{ color: 'var(--accent-cyan)' }} />
            Active Clients
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {clients.map(client => (
              <div 
                key={client.id}
                className="glass-card"
                style={{ 
                  padding: '1.25rem', 
                  cursor: 'pointer',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: selectedClient?.id === client.id ? 'var(--accent-cyan)' : 'var(--border-color)',
                  background: selectedClient?.id === client.id ? 'var(--bg-hover)' : 'var(--bg-card)'
                }}
                onClick={() => setSelectedClient(client)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>{client.company_name}</h3>
                  <span className={`badge ${
                    client.compliance_status === 'Approved' ? 'badge-approved' : 
                    client.compliance_status === 'Pending' ? 'badge-pending' : 'badge-rejected'
                  }`}>
                    {client.compliance_status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={12} /> {client.email}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={12} /> {client.phone || 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Selected Client Compliance Folder */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          {selectedClient ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <span className="form-label" style={{ margin: 0 }}>Compliance Folder</span>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginTop: '0.25rem' }}>{selectedClient.company_name}</h2>
                </div>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  onClick={() => setShowAddCertForm(!showAddCertForm)}
                >
                  + Add License
                </button>
              </div>

              {/* Add Certificate form */}
              {showAddCertForm && (
                <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--accent-cyan)' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Register Compliance Document</h4>
                  <form onSubmit={handleSubmitCert(handleAddCertificate)}>
                    <div className="form-group">
                      <label className="form-label">Document Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Hazardous Materials Handling Permit" 
                        {...registerCert('certificate_name', { required: true })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">License / Certificate Number</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. LIC-CHEM-8812" 
                        {...registerCert('certificate_number', { required: true })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Expiry Date</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        {...registerCert('expiry_date', { required: true })}
                      />
                    </div>
                    
                    {/* Simulated file upload drag & drop box */}
                    <div style={{
                      border: '1px dashed var(--border-color)',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      textAlign: 'center',
                      marginBottom: '1rem',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem'
                    }}>
                      <UploadCloud size={24} style={{ color: 'var(--accent-cyan)', marginBottom: '0.5rem' }} />
                      <p>Drag compliance PDF here or <strong>browse</strong></p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => { setShowAddCertForm(false); resetCert(); }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        File License
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Certificates List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {clientCertificates.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                    <ShieldAlert size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.9rem' }}>No compliance documents filed for this client.</p>
                  </div>
                ) : (
                  clientCertificates.map(cert => {
                    const daysLeft = Math.ceil((new Date(cert.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={cert.id} className="glass-card" style={{ padding: '1.25rem', borderLeft: `4px solid ${getDaysLeftColor(cert.expiry_date)}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <div>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>{cert.certificate_name}</h4>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Lic No: {cert.certificate_number}</span>
                          </div>
                          
                          <span className="badge" style={{ 
                            background: getDaysLeftColor(cert.expiry_date) + '1c', 
                            color: getDaysLeftColor(cert.expiry_date),
                            border: `1px solid ${getDaysLeftColor(cert.expiry_date)}` 
                          }}>
                            {daysLeft < 0 ? 'Expired' : `${daysLeft} days left`}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={12} /> Expiry: {new Date(cert.expiry_date).toLocaleDateString()}
                          </span>
                          <a href="#" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 'bold' }}>View License File</a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Select a client on the left to see compliance data.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClientOnboarding;
