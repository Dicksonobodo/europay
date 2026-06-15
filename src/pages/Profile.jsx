import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, Bell, Shield, HelpCircle, Users, Lock, MessageCircle,
  Copy, Check, LogOut, ChevronRight, ShieldCheck,
} from 'lucide-react';
import { logoutUser } from '../firebase/auth';
import useAuth from '../hooks/useAuth';
import BottomNav from '../components/ui/BottomNav';
import Modal from '../components/ui/Modal';

const Profile = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [copied, setCopied] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(userData?.cardNumber?.toString() || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyIban = () => {
    navigator.clipboard.writeText(userData?.iban || '');
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2000);
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
  };

  const joined = userData?.createdAt?.toDate?.()?.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  }) || 'N/A';

  const formatIban = (iban) => {
    if (!iban) return 'Not assigned';
    return iban.replace(/(.{4})/g, '$1 ').trim();
  };

  const menuItems = [
    { icon: Settings, label: 'Account Settings', color: '#7c3aed' },
    { icon: Bell, label: 'Notifications', color: '#5b21b6' },
    { icon: Shield, label: 'Security', color: '#4c1d95' },
    { icon: HelpCircle, label: 'Help & FAQ', color: '#6d28d9' },
    { icon: Users, label: 'Refer Friends', color: '#7c3aed' },
    { icon: Lock, label: 'Privacy Policy', color: '#5b21b6' },
    { icon: MessageCircle, label: 'Message Support', action: () => navigate('/support'), color: '#4c1d95' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 96 }}>
      <div style={{ padding: '56px 20px 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24 }}>Profile</h1>

        {/* Admin Panel button — only visible to admins */}
        {userData?.role === 'admin' && (
          <button
            onClick={() => navigate('/admin')}
            style={{
              width: '100%', marginBottom: 16,
              background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(45,27,105,0.3))',
              border: '1px solid rgba(124,58,237,0.5)',
              borderRadius: 16, padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            }}
          >
            <div style={{ width: 40, height: 40, background: 'rgba(124,58,237,0.25)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={18} color="#a78bfa" />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#a78bfa' }}>Admin Panel</p>
              <p style={{ fontSize: 12, color: 'rgba(167,139,250,0.6)' }}>Manage users & accounts</p>
            </div>
            <ChevronRight size={16} color="#a78bfa" />
          </button>
        )}

        {/* User Card */}
        <div style={{
          background: 'linear-gradient(135deg, #0f0f1a, #1e0a3c)',
          borderRadius: 24, padding: '24px 20px',
          border: '1px solid rgba(124,58,237,0.3)',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 60, height: 60,
              background: 'linear-gradient(135deg, #7c3aed, #2d1b69)',
              borderRadius: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(124,58,237,0.4)',
            }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>
                {userData?.fullName?.[0] || 'U'}
              </span>
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{userData?.fullName}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{userData?.email}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'rgba(124,58,237,0.12)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(124,58,237,0.2)' }}>
              <p style={{ fontSize: 10, color: 'rgba(167,139,250,0.7)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Tier</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: userData?.tier === 2 ? '#10b981' : '#f59e0b' }}>
                {userData?.tier === 2 ? 'Tier 2 ✓' : 'Tier 1'}
              </p>
            </div>
            <div style={{ background: 'rgba(124,58,237,0.12)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(124,58,237,0.2)' }}>
              <p style={{ fontSize: 10, color: 'rgba(167,139,250,0.7)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Joined</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{joined}</p>
            </div>
          </div>
        </div>

        {/* Card number */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--border)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Card Number</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#a78bfa', letterSpacing: 3 }}>
              •••• {userData?.cardNumber}
            </p>
          </div>
          <button onClick={handleCopy} style={{
            background: copied ? 'rgba(16,185,129,0.12)' : 'var(--bg-elevated)',
            border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'var(--border-light)'}`,
            borderRadius: 10, padding: '8px 14px',
            color: copied ? '#10b981' : 'var(--text-secondary)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* IBAN */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--border)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, marginRight: 12 }}>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>IBAN</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', letterSpacing: 1, lineHeight: 1.5 }}>
                {formatIban(userData?.iban)}
              </p>
            </div>
            <button onClick={handleCopyIban} style={{
              background: copiedIban ? 'rgba(16,185,129,0.12)' : 'var(--bg-elevated)',
              border: `1px solid ${copiedIban ? 'rgba(16,185,129,0.3)' : 'var(--border-light)'}`,
              borderRadius: 10, padding: '8px 14px',
              color: copiedIban ? '#10b981' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            }}>
              {copiedIban ? <Check size={14} /> : <Copy size={14} />}
              {copiedIban ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Menu */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {menuItems.map(({ icon: Icon, label, action, color }, i) => (
            <button
              key={label}
              onClick={action || undefined}
              style={{
                width: '100%', background: 'none', border: 'none',
                borderBottom: i < menuItems.length - 1 ? '1px solid var(--border)' : 'none',
                padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 14,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ width: 36, height: 36, background: `${color}22`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={color} />
              </div>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
              <ChevronRight size={16} color="var(--text-muted)" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={() => setLogoutModal(true)}
          style={{
            width: '100%', marginTop: 16,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 16, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
          }}
        >
          <div style={{ width: 36, height: 36, background: 'rgba(239,68,68,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={16} color="#ef4444" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#ef4444' }}>Log Out</span>
        </button>
      </div>

      <Modal open={logoutModal} onClose={() => setLogoutModal(false)} title="Log Out?">
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 24 }}>
          Are you sure you want to log out of Europay?
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setLogoutModal(false)} style={{
            flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-light)',
            borderRadius: 14, padding: '14px', color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleLogout} style={{
            flex: 1, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 14, padding: '14px', color: '#ef4444', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}>Log Out</button>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
};

export default Profile;