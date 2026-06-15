import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, DollarSign } from 'lucide-react';
import FundUserForm from '../components/admin/FundUserForm';
import { getAllUsers, upgradeToTier2 } from '../firebase/firestore';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('fund');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

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

  const handleUpgrade = async (uid) => {
    await upgradeToTier2(uid);
    await fetchUsers();
  };

  const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f0f1a, #1a0a2e)',
        borderBottom: '1px solid var(--border)',
        padding: '56px 20px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 12, padding: 10, cursor: 'pointer' }}>
            <ArrowLeft size={18} color="#a78bfa" />
          </button>
          <div>
            <p style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' }}>Admin Panel</p>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Europay Admin</h1>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'fund', label: 'Fund User', icon: DollarSign },
            { key: 'users', label: 'All Users', icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              style={{
                flex: 1, padding: '10px 16px',
                borderRadius: 12,
                background: tab === key ? 'rgba(124,58,237,0.25)' : 'transparent',
                border: `1px solid ${tab === key ? 'rgba(124,58,237,0.5)' : 'var(--border)'}`,
                color: tab === key ? '#a78bfa' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 20px' }}>
        {tab === 'fund' && <FundUserForm />}

        {tab === 'users' && (
          <div>
            {loadingUsers ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>Loading users…</p>
            ) : (
              users.map((u) => (
                <div key={u.uid} style={{
                  background: 'var(--bg-card)', borderRadius: 16,
                  border: '1px solid var(--border)', padding: '16px 20px',
                  marginBottom: 12,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{u.fullName}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{u.email}</p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
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
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(u.balance)}</p>
                      {u.tier === 1 && u.role !== 'admin' && (
                        <button
                          onClick={() => handleUpgrade(u.uid)}
                          style={{
                            marginTop: 8,
                            background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)',
                            borderRadius: 8, padding: '4px 10px',
                            color: '#a78bfa', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Upgrade → T2
                        </button>
                      )}
                    </div>
                  </div>
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
