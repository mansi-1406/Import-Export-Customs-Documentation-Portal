import React, { useState, useEffect } from 'react';
import { formatDistanceToNow, isBefore, parseISO, differenceInDays } from 'date-fns';
import { 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  Trash2, 
  Calendar, 
  FileText, 
  Award,
  BellRing
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

function ComplianceAlerts({ alerts, refreshAlerts }) {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, expired, expiring

  const loadCertificates = async () => {
    try {
      const res = await fetch(`${API_BASE}/certificates`);
      if (res.ok) {
        const data = await res.json();
        setCertificates(data);
      }
    } catch (err) {
      console.warn('Backend offline, using fallback mock certificates...');
      setCertificates([
        { id: 1, client_name: "Global Shipping Logistics", certificate_name: "Standard Import/Export License", certificate_number: "IEC-GLO-2024-99", expiry_date: "2027-12-31" },
        { id: 2, client_name: "Apex Freight Forwarders", certificate_name: "Customs Broker License", certificate_number: "CBL-APX-2025-42", expiry_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        { id: 3, client_name: "Oceanic Trade Corp", certificate_name: "Dangerous Goods Handling Permit", certificate_number: "DGP-OCN-2023-11", expiry_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  const handleDismissAlert = async (alertId) => {
    try {
      await fetch(`${API_BASE}/alerts/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: alertId })
      });
      refreshAlerts();
    } catch (err) {
      // offline fallback
      refreshAlerts();
    }
  };

  // Calculations using date-fns
  const checkStatus = (expiryDateStr) => {
    const expiry = parseISO(expiryDateStr);
    const today = new Date();
    
    if (isBefore(expiry, today)) {
      return { label: 'Expired', color: 'var(--accent-red)', bg: 'rgba(244, 63, 94, 0.1)', class: 'expired' };
    }
    
    const daysToExpiry = differenceInDays(expiry, today);
    if (daysToExpiry <= 30) {
      return { label: `Expiring in ${daysToExpiry}d`, color: 'var(--accent-yellow)', bg: 'rgba(251, 191, 36, 0.1)', class: 'expiring' };
    }
    
    return { label: 'Valid', color: 'var(--accent-green)', bg: 'rgba(16, 185, 129, 0.1)', class: 'valid' };
  };

  // Filter Certificates
  const filteredCerts = certificates.filter(cert => {
    const status = checkStatus(cert.expiry_date);
    if (filter === 'expired') return status.label === 'Expired';
    if (filter === 'expiring') return status.label.includes('Expiring');
    return true;
  });

  // Calculate Overall Compliance Score
  const totalCertsCount = certificates.length;
  const expiredCertsCount = certificates.filter(c => checkStatus(c.expiry_date).label === 'Expired').length;
  const complianceScore = totalCertsCount > 0 ? Math.round(((totalCertsCount - expiredCertsCount) / totalCertsCount) * 100) : 100;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: '500' }}>Loading compliance dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Compliance & Alerts</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Monitor corporate compliance status and resolve active document expiry alerts.
          </p>
        </div>
      </div>

      {/* Compliance Score Header Panel */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', gap: '2.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Compliance Dial */}
        <div style={{ position: 'relative', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
          <svg style={{ transform: 'rotate(-90deg)', width: '100px', height: '100px' }}>
            <circle cx="50" cy="50" r="42" stroke="var(--bg-hover)" strokeWidth="8" fill="transparent" />
            <circle 
              cx="50" 
              cy="50" 
              r="42" 
              stroke={complianceScore < 70 ? 'var(--accent-red)' : complianceScore < 90 ? 'var(--accent-yellow)' : 'var(--accent-green)'} 
              strokeWidth="8" 
              fill="transparent" 
              strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={2 * Math.PI * 42 * (1 - complianceScore / 100)}
              style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
            />
          </svg>
          <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: '800', fontFamily: 'var(--font-family-title)' }}>{complianceScore}%</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Health</span>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.25rem' }}>Compliance Level: {complianceScore >= 90 ? 'Secure' : complianceScore >= 70 ? 'Needs Attention' : 'Critical'}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '600px' }}>
            A total of {expiredCertsCount} expired certificates detected across your freight network. Renew licenses promptly to avoid heavy regulatory customs holding or penalties.
          </p>
        </div>
      </div>

      <div className="content-grid-2">
        {/* Left Side: Certificates Directory */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={20} style={{ color: 'var(--accent-cyan)' }} />
              Certificate Folder Directory
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn" 
                style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem', background: filter === 'all' ? 'var(--bg-hover)' : 'transparent', border: 'none', color: 'var(--text-primary)' }}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button 
                className="btn" 
                style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem', background: filter === 'expired' ? 'var(--bg-hover)' : 'transparent', border: 'none', color: 'var(--accent-red)' }}
                onClick={() => setFilter('expired')}
              >
                Expired
              </button>
              <button 
                className="btn" 
                style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem', background: filter === 'expiring' ? 'var(--bg-hover)' : 'transparent', border: 'none', color: 'var(--accent-yellow)' }}
                onClick={() => setFilter('expiring')}
              >
                Expiring Soon
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredCerts.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>No certificates matched the filter.</p>
            ) : (
              filteredCerts.map(cert => {
                const status = checkStatus(cert.expiry_date);
                const expiryDate = parseISO(cert.expiry_date);
                return (
                  <div key={cert.id} className="glass-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>{cert.certificate_name}</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Client: <strong>{cert.client_name || `Client #${cert.client_id}`}</strong> &bull; Lic No: {cert.certificate_number}</span>
                      </div>
                      <span className="badge" style={{ background: status.bg, color: status.color, border: `1px solid ${status.color}` }}>
                        {status.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} /> Expiring {formatDistanceToNow(expiryDate, { addSuffix: true })}
                      </span>
                      <a href="#" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 'bold' }}>Download PDF</a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Alerts Feed Log */}
        <div className="glass-panel" style={{ padding: '1.75rem', height: '100%' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BellRing size={20} style={{ color: 'var(--accent-purple)' }} />
            Customs Notification Log
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {alerts.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>All system warnings clear.</p>
            ) : (
              alerts.map(alert => (
                <div 
                  key={alert.id} 
                  className={`alert-item ${alert.message.includes('expired') ? 'expiry-urgent' : 'expiry'}`} 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: '500' }}>{alert.message}</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(alert.created_at).toLocaleDateString()} &bull; Alert Id: #{alert.id}</span>
                  </div>
                  {!alert.is_read && (
                    <button 
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      onClick={() => handleDismissAlert(alert.id)}
                      title="Archive notification"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComplianceAlerts;
