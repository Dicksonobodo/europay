import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

const Splash = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '60px 24px 48px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glows */}
      <div style={{
        position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
        width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />
      <div style={{
        position: 'absolute', bottom: 100, right: -60,
        width: 200, height: 200,
        background: 'radial-gradient(circle, rgba(45,27,105,0.4) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />

      {/* Logo area */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <div style={{
          width: 80, height: 80,
          background: 'linear-gradient(135deg, #7c3aed, #2d1b69)',
          borderRadius: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
          border: '1px solid rgba(124,58,237,0.4)',
        }}>
          <span style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>E</span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
          Europay
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          Banking reimagined for Europe
        </p>
      </div>

      {/* Center illustration */}
      <div style={{ zIndex: 1, textAlign: 'center' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0f0f1a 0%, #1e0a3c 50%, #2d1b69 100%)',
          borderRadius: 24,
          padding: '28px 24px',
          border: '1px solid rgba(124,58,237,0.3)',
          boxShadow: '0 8px 40px rgba(124,58,237,0.2)',
          width: 280,
          margin: '0 auto',
        }}>
          <p style={{ fontSize: 11, color: 'rgba(167,139,250,0.7)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>
            Virtual Card
          </p>
          <p style={{ fontSize: 28, fontWeight: 800, color: '#f1f1f9', marginBottom: 20 }}>€ 0.00</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(241,241,249,0.5)' }}>John Doe</span>
            <span style={{ fontSize: 13, color: '#a78bfa', letterSpacing: 2 }}>•••• 4291</span>
          </div>
        </div>

        <div style={{ marginTop: 32, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['Instant Transfers', 'Secure Wallet', 'Smart Insights'].map((f) => (
            <div key={f} style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '8px 16px',
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}>{f}</div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ width: '100%', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Button onClick={() => navigate('/register')} fullWidth>
          Create Account
        </Button>
        <Button onClick={() => navigate('/login')} variant="secondary" fullWidth>
          Sign In
        </Button>
      </div>
    </div>
  );
};

export default Splash;
