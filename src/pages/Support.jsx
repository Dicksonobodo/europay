import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import BottomNav from '../components/ui/BottomNav';

// Support page — Smartsupp widget will be injected via script tag in index.html
const Support = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 96 }}>
      <div style={{ padding: '56px 20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 10, cursor: 'pointer' }}>
          <ArrowLeft size={18} color="var(--text-secondary)" />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Support</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>We're here to help</p>
        </div>
      </div>

      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{
          width: 80, height: 80,
          background: 'rgba(124,58,237,0.12)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          border: '1px solid rgba(124,58,237,0.2)',
        }}>
          <MessageCircle size={32} color="#7c3aed" />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          Live Chat Support
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
          Our support chat is available in the bottom-right corner of your screen via Smartsupp.
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default Support;
