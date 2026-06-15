const BankCard = ({ balance, cardNumber, fullName }) => {
  const fmt = (n) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1e0a3c 50%, #2d1b69 100%)',
      borderRadius: 24,
      padding: '28px 24px',
      position: 'relative',
      overflow: 'hidden',
      border: '1px solid rgba(124,58,237,0.3)',
      boxShadow: '0 8px 40px rgba(124,58,237,0.25)',
      minHeight: 180,
    }}>
      {/* Glow circles */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 150, height: 150,
        background: 'rgba(124,58,237,0.2)',
        borderRadius: '50%', filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute', bottom: -20, left: 20,
        width: 100, height: 100,
        background: 'rgba(167,139,250,0.1)',
        borderRadius: '50%', filter: 'blur(30px)',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 10, color: 'rgba(167,139,250,0.7)', fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
            Europay
          </p>
          <p style={{ fontSize: 12, color: 'rgba(241,241,249,0.6)' }}>Virtual Card</p>
        </div>
        <div style={{
          background: 'rgba(124,58,237,0.3)',
          borderRadius: 10,
          padding: '6px 12px',
          border: '1px solid rgba(124,58,237,0.4)',
        }}>
          <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700 }}>€ EUR</span>
        </div>
      </div>

      {/* Balance */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, color: 'rgba(241,241,249,0.5)', marginBottom: 4, letterSpacing: 0.5 }}>
          Available Balance
        </p>
        <p style={{ fontSize: 30, fontWeight: 800, color: '#f1f1f9', letterSpacing: -0.5 }}>
          {fmt(balance)}
        </p>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p style={{ fontSize: 10, color: 'rgba(241,241,249,0.4)', marginBottom: 2 }}>Cardholder</p>
          <p style={{ fontSize: 13, color: '#f1f1f9', fontWeight: 600 }}>{fullName || '—'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 10, color: 'rgba(241,241,249,0.4)', marginBottom: 2 }}>Card No.</p>
          <p style={{ fontSize: 14, color: '#a78bfa', fontWeight: 700, letterSpacing: 2 }}>
            •••• {cardNumber || '0000'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BankCard;
