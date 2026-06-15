const Modal = ({ open, onClose, children, title }) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          borderRadius: '24px 24px 0 0',
          padding: '24px 20px 40px',
          width: '100%',
          maxWidth: 430,
          border: '1px solid var(--border-light)',
          borderBottom: 'none',
        }}
      >
        {title && (
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
};

export default Modal;
