import AnimatedBalance from './AnimatedBalance';

const BankCard = ({ balance, cardNumber, fullName, isFrozen }) => {
  return (
    <div style={{
      background: isFrozen
        ? 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)'
        : 'linear-gradient(135deg, #0f0f1a 0%, #1e0a3c 50%, #2d1b69 100%)',
      borderRadius: 24, padding: '28px 24px',
      position: 'relative', overflow: 'hidden',
      border: isFrozen ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(124,58,237,0.3)',
      boxShadow: isFrozen ? '0 8px 40px rgba(59,130,246,0.2)' : '0 8px 40px rgba(124,58,237,0.25)',
      minHeight: 180, transition: 'all 0.4s',
    }}>
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 150, height: 150,
        background: isFrozen ? 'rgba(59,130,246,0.15)' : 'rgba(124,58,237,0.2)',
        borderRadius: '50%', filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute', bottom: -20, left: 20, width: 100, height: 100,
        background: isFrozen ? 'rgba(59,130,246,0.1)' : 'rgba(167,139,250,0.1)',
        borderRadius: '50%', filter: 'blur(30px)',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 10, color: isFrozen ? 'rgba(147,197,253,0.7)' : 'rgba(167,139,250,0.7)', fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Europay</p>
          <p style={{ fontSize: 12, color: 'rgba(241,241,249,0.6)' }}>Virtual Card</p>
        </div>
        <div style={{
          background: isFrozen ? 'rgba(59,130,246,0.25)' : 'rgba(124,58,237,0.3)',
          borderRadius: 10, padding: '6px 12px',
          border: isFrozen ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(124,58,237,0.4)',
        }}>
          {isFrozen
            ? <span style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700 }}>🔒 FROZEN</span>
            : <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700 }}>€ EUR</span>
          }
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, color: 'rgba(241,241,249,0.5)', marginBottom: 4, letterSpacing: 0.5 }}>Available Balance</p>
        <p style={{ fontSize: 30, fontWeight: 800, color: '#f1f1f9', letterSpacing: -0.5 }}>
          <AnimatedBalance value={balance || 0} />
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p style={{ fontSize: 10, color: 'rgba(241,241,249,0.4)', marginBottom: 2 }}>Cardholder</p>
          <p style={{ fontSize: 13, color: '#f1f1f9', fontWeight: 600 }}>{fullName || '—'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 10, color: 'rgba(241,241,249,0.4)', marginBottom: 2 }}>Card No.</p>
          <p style={{ fontSize: 14, color: isFrozen ? '#93c5fd' : '#a78bfa', fontWeight: 700, letterSpacing: 2 }}>
            •••• {cardNumber || '0000'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BankCard;