import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Ship, 
  FileText, 
  UserPlus, 
  ShieldAlert, 
  Bell, 
  Sun, 
  Moon, 
  Menu,
  Clock
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Shipments from './components/Shipments';
import ClientOnboarding from './components/ClientOnboarding';
import ComplianceAlerts from './components/ComplianceAlerts';

const API_BASE = import.meta.env.DEV ? 'http://localhost:5050/api' : '/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  const [alerts, setAlerts] = useState([]);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [selectedShipmentForDoc, setSelectedShipmentForDoc] = useState(null);

  // Toggle Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Fetch Alerts on Load and Polling
  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE}/alerts`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.warn('Backend offline, using fallback mock alerts.');
      // Fallback alerts
      setAlerts([
        { id: 1, message: "Apex Freight Forwarders: Customs Broker License is expiring in 10 days!", type: "Expiry", is_read: false, created_at: new Date().toISOString() },
        { id: 2, message: "Oceanic Trade Corp: Dangerous Goods Handling Permit has expired!", type: "Expiry", is_read: true, created_at: new Date().toISOString() },
        { id: 3, message: "New shipment SH-2026-0002 submitted and requires approval.", type: "Approval", is_read: false, created_at: new Date().toISOString() }
      ]);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  const markAlertsAsRead = async () => {
    try {
      await fetch(`${API_BASE}/alerts/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      fetchAlerts();
    } catch (err) {
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    }
  };

  const handleCreateDocument = (shipment) => {
    setSelectedShipmentForDoc(shipment);
    setActiveTab('shipments'); // It will show the shipment editor
  };

  const unreadAlertsCount = alerts.filter(a => !a.is_read).length;

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar glass-panel">
        <div className="brand">
          <div className="brand-logo">C</div>
          <div className="brand-name">WebSpark Customs</div>
        </div>

        <nav>
          <ul className="nav-links">
            <li>
              <a 
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => { setActiveTab('dashboard'); setSelectedShipmentForDoc(null); }}
              >
                <LayoutDashboard /> Dashboard
              </a>
            </li>
            <li>
              <a 
                className={`nav-item ${activeTab === 'shipments' ? 'active' : ''}`}
                onClick={() => setActiveTab('shipments')}
              >
                <FileText /> Shipments & Docs
              </a>
            </li>
            <li>
              <a 
                className={`nav-item ${activeTab === 'onboarding' ? 'active' : ''}`}
                onClick={() => { setActiveTab('onboarding'); setSelectedShipmentForDoc(null); }}
              >
                <UserPlus /> Client Onboarding
              </a>
            </li>
            <li>
              <a 
                className={`nav-item ${activeTab === 'compliance' ? 'active' : ''}`}
                onClick={() => { setActiveTab('compliance'); setSelectedShipmentForDoc(null); }}
              >
                <ShieldAlert /> Compliance & Alerts
              </a>
            </li>
          </ul>
        </nav>

        {/* Sidebar Footer Info */}
        <div style={{ marginTop: 'auto', padding: '1rem 0 0 0', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <Clock size={14} />
            <span>Sys Status: Operational</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Control Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          {/* Theme Toggle */}
          <button 
            className="theme-switch" 
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} style={{ color: 'var(--accent-cyan)' }} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* Notifications Trigger */}
          <div style={{ position: 'relative' }}>
            <button 
              className="theme-switch" 
              onClick={() => {
                setShowNotificationDrawer(!showNotificationDrawer);
                if (!showNotificationDrawer && unreadAlertsCount > 0) {
                  markAlertsAsRead();
                }
              }}
              title="Notifications"
            >
              <Bell size={16} />
              {unreadAlertsCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'var(--accent-red)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  fontWeight: 'bold'
                }}>
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Drawer */}
            {showNotificationDrawer && (
              <div className="glass-panel" style={{
                position: 'absolute',
                top: '45px',
                right: '0',
                width: '320px',
                maxHeight: '400px',
                overflowY: 'auto',
                zIndex: 50,
                padding: '1rem',
                boxShadow: 'var(--shadow-lg)'
              }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Notifications</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{alerts.length} total</span>
                </h3>
                <div className="alerts-list">
                  {alerts.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No notifications</p>
                  ) : (
                    alerts.slice(0, 5).map(alert => (
                      <div key={alert.id} className={`alert-item ${!alert.is_read ? 'unread' : ''}`} style={{ padding: '0.5rem', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '0.5rem', borderLeftWidth: '3px' }}>
                        <div className="alert-item-content">
                          <p className="alert-message">{alert.message}</p>
                          <span className="alert-time">{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {alerts.length > 5 && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem', marginTop: '0.5rem' }}
                    onClick={() => { setActiveTab('compliance'); setShowNotificationDrawer(false); }}
                  >
                    View All Alerts
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Page Switcher */}
        {activeTab === 'dashboard' && (
          <Dashboard 
            setActiveTab={setActiveTab} 
            onCreateDoc={handleCreateDocument} 
            alerts={alerts}
          />
        )}
        
        {activeTab === 'shipments' && (
          <Shipments 
            selectedShipment={selectedShipmentForDoc}
            clearSelectedShipment={() => setSelectedShipmentForDoc(null)}
          />
        )}

        {activeTab === 'onboarding' && (
          <ClientOnboarding />
        )}

        {activeTab === 'compliance' && (
          <ComplianceAlerts 
            alerts={alerts} 
            refreshAlerts={fetchAlerts}
          />
        )}
      </main>
    </div>
  );
}

export default App;
