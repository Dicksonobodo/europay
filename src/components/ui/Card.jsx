const Card = ({ children, style = {} }) => (
  <div style={{
    background: 'var(--bg-card)',
    borderRadius: 20,
    border: '1px solid var(--border)',
    padding: 20,
    ...style,
  }}>
    {children}
  </div>
);

export default Card;
