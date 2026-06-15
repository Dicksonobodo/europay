const Button = ({ children, onClick, variant = 'primary', disabled, style = {}, fullWidth }) => {
  const base = {
    border: 'none',
    borderRadius: 14,
    padding: '14px 24px',
    fontSize: 15,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.5 : 1,
  };

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
      color: '#fff',
      boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
    },
    secondary: {
      background: 'var(--bg-elevated)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-light)',
    },
    danger: {
      background: 'rgba(239,68,68,0.12)',
      color: '#ef4444',
      border: '1px solid rgba(239,68,68,0.3)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--purple-light)',
    },
  };

  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
};

export default Button;
