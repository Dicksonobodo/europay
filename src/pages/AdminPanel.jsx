import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, DollarSign, BarChart2, Shield } from 'lucide-react';
import FundUserForm from '../components/admin/FundUserForm';
import AuditLog from '../components/admin/AuditLog';
import {
  getAllUsers, upgradeToTier2, downgradeToTier1,
  suspendUser, setDailyLimit, getAdminStats, logAdminAction,
} from '../firebase/firestore';
import useAuth from '../hooks/useAuth';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [tab, setTab] = useState('stats');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [limitInputs, setLimitInputs] = useState({});
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showAudit, setShowAudit] = useState(false);

  const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);

  useEffect(() => {
    const fetchStats = async () => {
      const s = await getAdminStats();
      setStats(s);
      setLoadingStats(false);
    };
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const all = await getAllUsers();
    setUsers(all);
    setLoadingUsers(false);
  };

  const handleTabChange = (t) => {
    setTab(t);
    if (t === 'users') fetchUsers();
  };

  const handleUpgrade = async (u) => {
    await upgradeToTier2(u.uid);
    await logAdminAction(userData.uid, userData.fullName, 'Upgraded user to Tier 2', u.fullName, `Email: ${u.email}`);
    await fetchUsers();
  };

  const handleDowngrade = async (u) => {
    await downgradeToTier1(u.uid);
    await logAdminAction(userData.uid, userData.fullName, 'Downgraded user to Tier 1', u.fullName, `Email: ${u.email}`);
    await fetchUsers();
  };

  const handleSuspend = async (u) => {
    const newState = !u.isSuspended;
    await suspendUser(u.uid, newState);
    await logAdminAction(userData.uid, userData.fullName, newState ? 'Suspended user' : 'Unsuspended user', u.fullName, `Email: ${u.email}`);
    await fetchUsers();
  };

  const handleSetLimit = async (u) => {
    const val = limitInputs[u.uid];
    if (!val) return;
    await setDailyLimit(u.uid, parseFloat(val));
    await logAdminAction(userData.uid, userData.fullName, `Set daily limit to €${val}`, u.fullName, `Email: ${u.email}`);
    await fetchUsers();
    setLimitInputs((prev) => ({ ...prev, [u.uid]: '' }));
  };

  if (showAudit) return <AuditLog onBack={() => setShowAudit(false)} />;

  const tabs = [
    { key: 'stats', label: 'Stats', icon: BarChart2 },
    { key: 'fund', label: 'Fund', icon: DollarSign },
    { key: 'users', label: 'Users', icon: Users },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 40 }}>
      <div style={{
        background: 'linear-gradient(135deg, #0f0f1a, #1a0a2e)',
        borderBottom: '1px solid var(--border)',
        padding: '56px 20px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 12, padding: 10, cursor: 'pointer' }}>
            <ArrowLeft size={18} color="#a78bfa" />
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' }}>Admin Panel</p>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Europay Admin</h1>
          </div>
          <button onClick={() => setShowAudit(true)} style={{
            background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: 10, padding: '8px 12px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            color: '#a78bfa', fontSize: 12, fontWeight: 600,
          }}>
            <Shield size={13} /> Audit Log
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => handleTabChange(key)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 12,
              background: tab === key ? 'rgba(124,58,237,0.25)' : 'transparent',
              border: `1px solid ${tab === key ? 'rgba(124,58,237,0.5)' : 'var(--border)'}`,
              color: tab === key ? '#a78bfa' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>

        {/* Stats Tab */}
        {tab === 'stats' && (
          loadingStats ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>Loading stats…</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Total Users', value: stats.totalUsers, color: '#7c3aed', suffix: '' },
                  { label: 'Total Funds', value: fmt(stats.totalBalance), color: '#10b981', suffix: '' },
                  { label: 'Tier 2 Users', value: stats.tier2Users, color: '#a78bfa', suffix: '' },
                  { label: 'Suspended', value: stats.suspendedUsers, color: '#ef4444', suffix: '' },
                  { label: 'Frozen Cards', value: stats.frozenUsers, color: '#3b82f6', suffix: '' },
                  { label: 'Tier 1 Users', value: stats.totalUsers - stats.tier2Users, color: '#f59e0b', suffix: '' },
                ].map((s) => (
                  <div key={s.label} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 16, padding: '18px 16px',
                  }}>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Tier breakdown bar */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>User Tier Breakdown</p>
                <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{
                    width: `${stats.totalUsers > 0 ? ((stats.totalUsers - stats.tier2Users) / stats.totalUsers) * 100 : 50}%`,
                    background: '#f59e0b',
                  }} />
                  <div style={{
                    width: `${stats.totalUsers > 0 ? (stats.tier2Users / stats.totalUsers) * 100 : 50}%`,
                    background: '#10b981',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Tier 1 ({stats.totalUsers - stats.tier2Users})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Tier 2 ({stats.tier2Users})</span>
                  </div>
                </div>
              </div>
            </>
          )
        )}

        {/* Fund Tab */}
        {tab === 'fund' && <FundUserForm />}

        {/* Users Tab */}
        {tab === 'users' && (
          <div>
            {loadingUsers ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>Loading users…</p>
            ) : (
              users.map((u) => (
                <div key={u.uid} style={{
                  background: u.isSuspended ? 'rgba(239,68,68,0.05)' : 'var(--bg-card)',
                  border: `1px solid ${u.isSuspended ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
                  borderRadius: 16, padding: '16px 20px', marginBottom: 12,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{u.fullName}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{u.email}</p>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                          background: u.tier === 2 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                          color: u.tier === 2 ? '#10b981' : '#f59e0b',
                          border: `1px solid ${u.tier === 2 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                        }}>Tier {u.tier}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                          background: u.role === 'admin' ? 'rgba(124,58,237,0.12)' : 'rgba(75,85,99,0.2)',
                          color: u.role === 'admin' ? '#a78bfa' : 'var(--text-secondary)',
                        }}>{u.role}</span>
                        {u.isFrozen && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>Frozen</span>}
                        {u.isSuspended && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>Suspended</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(u.balance)}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Limit: €{u.dailyLimit || 1000}/day</p>
                    </div>
                  </div>

                  {u.role !== 'admin' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {u.tier === 1 ? (
                          <button onClick={() => handleUpgrade(u)} style={{
                            flex: 1, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                            borderRadius: 10, padding: '8px', color: '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}>↑ Upgrade T2</button>
                        ) : (
                          <button onClick={() => handleDowngrade(u)} style={{
                            flex: 1, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                            borderRadius: 10, padding: '8px', color: '#f59e0b', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}>↓ Downgrade T1</button>
                        )}
                        <button onClick={() => handleSuspend(u)} style={{
                          flex: 1,
                          background: u.isSuspended ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          border: `1px solid ${u.isSuspended ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                          borderRadius: 10, padding: '8px',
                          color: u.isSuspended ? '#10b981' : '#ef4444',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}>{u.isSuspended ? '✓ Unsuspend' : '⛔ Suspend'}</button>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--purple-light)', fontWeight: 700 }}>€</span>
                          <input
                            style={{
                              width: '100%', background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-light)', borderRadius: 10,
                              padding: '8px 10px 8px 22px', color: 'var(--text-primary)', fontSize: 13,
                            }}
                            placeholder={`Daily limit (€${u.dailyLimit || 1000})`}
                            type="number"
                            value={limitInputs[u.uid] || ''}
                            onChange={(e) => setLimitInputs((prev) => ({ ...prev, [u.uid]: e.target.value }))}
                          />
                        </div>
                        <button onClick={() => handleSetLimit(u)} style={{
                          background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
                          borderRadius: 10, padding: '8px 14px', color: '#a78bfa',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}>Set Limit</button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
