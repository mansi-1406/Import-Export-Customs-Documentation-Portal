import React, { useState, useEffect } from 'react';
import { 
  Ship, 
  TrendingUp, 
  Clock, 
  AlertOctagon, 
  FileText, 
  ChevronRight, 
  ShieldAlert
} from 'lucide-react';

const API_BASE = 'http://localhost:5050/api';

function Dashboard({ setActiveTab, onCreateDoc, alerts }) {
  const [metrics, setMetrics] = useState({
    totalShipments: 0,
    pendingApprovals: 0,
    expiredCertificates: 0,
    expiringCertificates: 0,
    activeAlerts: 0,
    shipmentsStats: []
  });
  const [recentShipments, setRecentShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const metricsRes = await fetch(`${API_BASE}/dashboard`);
        const shipmentsRes = await fetch(`${API_BASE}/shipments`);
        
        let metricsData, shipmentsData;
        if (metricsRes.ok) {
          metricsData = await metricsRes.json();
        }
        if (shipmentsRes.ok) {
          shipmentsData = await shipmentsRes.json();
        }

        if (metricsData) setMetrics(metricsData);
        if (shipmentsData) setRecentShipments(shipmentsData.slice(0, 5));
      } catch (err) {
        console.warn('Backend offline, loading dashboard mock data...');
        // Mock fallback for offline run
        setMetrics({
          totalShipments: 24,
          pendingApprovals: 3,
          expiredCertificates: 1,
          expiringCertificates: 2,
          activeAlerts: 3,
          shipmentsStats: [
            { month: 'Jan', count: 8 },
            { month: 'Feb', count: 12 },
            { month: 'Mar', count: 18 },
            { month: 'Apr', count: 15 },
            { month: 'May', count: 24 }
          ]
        });
        setRecentShipments([
          { id: 1, tracking_number: 'SH-2026-0001', client_name: 'Global Shipping Logistics', type: 'Import', origin_country: 'Germany', destination_country: 'United States', status: 'Approved', created_at: new Date().toISOString() },
          { id: 2, tracking_number: 'SH-2026-0002', client_name: 'Apex Freight Forwarders', type: 'Export', origin_country: 'United States', destination_country: 'Japan', status: 'Pending Approval', created_at: new Date().toISOString() },
          { id: 3, tracking_number: 'SH-2026-0003', client_name: 'Oceanic Trade Corp', type: 'Import', origin_country: 'China', destination_country: 'Germany', status: 'Draft', created_at: new Date().toISOString() }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: '500' }}>Loading customs dashboard...</div>
      </div>
    );
  }

  // Calculate maximum count for chart scaling
  const maxShipmentCount = Math.max(...metrics.shipmentsStats.map(s => s.count), 1);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customs Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Real-time status of freight forwarder compliance and customs filings.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setActiveTab('shipments')}>
          Manage Shipments
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="dashboard-grid">
        <div className="glass-card metric-card">
          <div className="metric-info">
            <h3>Total Shipments</h3>
            <div className="metric-value">{metrics.totalShipments}</div>
          </div>
          <div className="metric-icon blue">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-info">
            <h3>Pending Customs Review</h3>
            <div className="metric-value">{metrics.pendingApprovals}</div>
          </div>
          <div className="metric-icon cyan">
            <Clock size={24} />
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-info">
            <h3>Expired Certificates</h3>
            <div className="metric-value" style={{ color: 'var(--accent-red)' }}>{metrics.expiredCertificates}</div>
          </div>
          <div className="metric-icon red">
            <AlertOctagon size={24} />
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-info">
            <h3>Expiring (30 days)</h3>
            <div className="metric-value" style={{ color: 'var(--accent-yellow)' }}>{metrics.expiringCertificates}</div>
          </div>
          <div className="metric-icon purple">
            <ShieldAlert size={24} />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Chart & Recent Actions */}
      <div className="content-grid-2">
        {/* Left: Beautiful CSS Bar Chart */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} style={{ color: 'var(--accent-cyan)' }} />
            Monthly Shipments Filing Activity
          </h2>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-end', 
            height: '240px', 
            padding: '1rem 0',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '1rem'
          }}>
            {metrics.shipmentsStats.map(stat => {
              const heightPercent = `${(stat.count / maxShipmentCount) * 100}%`;
              return (
                <div key={stat.month} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  width: '12%', 
                  height: '100%', 
                  justifyContent: 'flex-end' 
                }}>
                  {/* Glowing Bar */}
                  <div style={{
                    height: heightPercent,
                    width: '100%',
                    background: 'linear-gradient(to top, var(--accent-blue), var(--accent-cyan))',
                    borderRadius: '6px 6px 0 0',
                    position: 'relative',
                    boxShadow: '0 0 10px var(--glow-cyan)',
                    transition: 'height 0.8s ease-in-out',
                    cursor: 'pointer'
                  }} title={`${stat.count} Shipments`}>
                    <div style={{
                      position: 'absolute',
                      top: '-25px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      color: 'var(--text-primary)'
                    }}>{stat.count}</div>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem', fontWeight: '500' }}>{stat.month}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Data source: Port Authorities Declarations</span>
            <span>Last sync: Just now</span>
          </div>
        </div>

        {/* Right: Realtime Alerts Panel */}
        <div className="glass-panel" style={{ padding: '1.75rem', height: '100%' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={20} style={{ color: 'var(--accent-purple)' }} />
            Active Compliance Monitor
          </h2>
          <div className="alerts-list">
            {alerts.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>All systems compliant. No active alerts.</p>
            ) : (
              alerts.slice(0, 3).map(alert => (
                <div key={alert.id} className={`alert-item ${alert.message.includes('expired') ? 'expiry-urgent' : 'expiry'}`}>
                  <div className="alert-item-content">
                    <p className="alert-message">{alert.message}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                      <span className="alert-time">{new Date(alert.created_at).toLocaleDateString()}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setActiveTab('compliance')}>Fix License</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {alerts.length > 3 && (
            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: '1rem', padding: '0.6rem', fontSize: '0.8rem' }}
              onClick={() => setActiveTab('compliance')}
            >
              View All Alerts
            </button>
          )}
        </div>
      </div>

      {/* Recent Shipments Section */}
      <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} style={{ color: 'var(--accent-cyan)' }} />
            Recent Shipments
          </h2>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            onClick={() => setActiveTab('shipments')}
          >
            View All Shipments
          </button>
        </div>

        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Tracking No.</th>
                <th>Client</th>
                <th>Type</th>
                <th>Route</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentShipments.map(shipment => (
                <tr key={shipment.id}>
                  <td style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{shipment.tracking_number}</td>
                  <td>{shipment.client_name || `Client #${shipment.client_id}`}</td>
                  <td>{shipment.type}</td>
                  <td>{shipment.origin_country} &rarr; {shipment.destination_country}</td>
                  <td>
                    <span className={`badge badge-${shipment.status.toLowerCase().replace(' ', '-')}`}>
                      {shipment.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      onClick={() => onCreateDoc(shipment)}
                    >
                      Open Docs &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
