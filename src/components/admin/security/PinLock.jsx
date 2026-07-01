import { useState, useEffect } from 'react';
import { Delete } from 'lucide-react';

// Simple hash — not cryptographic, just obfuscation for local PIN
const hashPin = (pin) => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = (hash << 5) - hash + pin.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
};

// ── PIN Setup ─────────────────────────────────────────────────
export const PinSetup = ({ onSave, onSkip }) => {
  const [step, setStep] = useState('create'); // create | confirm
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const current = step === 'create' ? pin : confirm;
  const setCurrent = step === 'create' ? setPin : setConfirm;

  const handleKey = (key) => {
    setError('');
    if (key === 'del') {
      setCurrent((p) => p.slice(0, -1));
      return;
    }
    if (current.length >= 4) return;
    const next = current + key;
    setCurrent(next);

    if (next.length === 4) {
      if (step === 'create') {
        setTimeout(() => setStep('confirm'), 300);
      } else {
        if (next === pin) {
          const hashed = hashPin(pin);
          localStorage.setItem('europay_pin', hashed);
          onSave(hashed);
        } else {
          setError('PINs do not match. Try again.');
          setConfirm('');
        }
      }
    }
  };

  const dots = step === 'create' ? pin : confirm;

  return <PinPad
    title={step === 'create' ? 'Create PIN' : 'Confirm PIN'}
    subtitle={step === 'create' ? 'Choose a 4-digit PIN to secure your app' : 'Enter your PIN again to confirm'}
    dots={dots}
    error={error}
    onKey={handleKey}
    footerAction={onSkip ? { label: 'Skip for now', onClick: onSkip } : null}
  />;
};

// ── PIN Entry (lock screen) ───────────────────────────────────
export const PinEntry = ({ onSuccess, onForgot }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleKey = (key) => {
    setError('');
    if (key === 'del') { setPin((p) => p.slice(0, -1)); return; }
    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next);

    if (next.length === 4) {
      const stored = localStorage.getItem('europay_pin');
      if (hashPin(next) === stored) {
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setError(newAttempts >= 3 ? 'Too many attempts. Use forgot PIN.' : 'Wrong PIN. Try again.');
        setPin('');
      }
    }
  };

  return <PinPad
    title="Enter PIN"
    subtitle="Enter your 4-digit PIN to continue"
    dots={pin}
    error={error}
    onKey={handleKey}
    footerAction={onForgot ? { label: 'Forgot PIN?', onClick: onForgot } : null}
  />;
};

// ── Shared PinPad UI ──────────────────────────────────────────
const PinPad = ({ title, subtitle, dots, error, onKey, footerAction }) => {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','del'];

  useEffect(() => {
    const handler = (e) => {
      if (e.key >= '0' && e.key <= '9') onKey(e.key);
      if (e.key === 'Backspace') onKey('del');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onKey]);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg-primary)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 999, padding: 24,
    }}>
      {/* Logo */}
      <div style={{
        width: 60, height: 60,
        background: 'linear-gradient(135deg, #7c3aed, #2d1b69)',
        borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24, boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
      }}>
        <span style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>E</span>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{title}</h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 36, textAlign: 'center' }}>{subtitle}</p>

      {/* Dots */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        {[0,1,2,3].map((i) => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: '50%',
            background: i < dots.length ? '#7c3aed' : 'var(--border-light)',
            border: `2px solid ${i < dots.length ? '#7c3aed' : 'var(--border-light)'}`,
            transition: 'all 0.2s',
            boxShadow: i < dots.length ? '0 0 12px rgba(124,58,237,0.5)' : 'none',
          }} />
        ))}
      </div>

      {error && (
        <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 16, textAlign: 'center' }}>{error}</p>
      )}

      {/* Keypad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: 280, marginTop: 8 }}>
        {keys.map((key, i) => (
          key === '' ? <div key={i} /> :
          <button
            key={i}
            onClick={() => onKey(key)}
            style={{
              height: 64, borderRadius: 16,
              background: key === 'del' ? 'transparent' : 'var(--bg-elevated)',
              border: key === 'del' ? 'none' : '1px solid var(--border-light)',
              color: 'var(--text-primary)',
              fontSize: key === 'del' ? 14 : 22,
              fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            {key === 'del' ? <Delete size={20} color="var(--text-secondary)" /> : key}
          </button>
        ))}
      </div>

      {footerAction && (
        <button onClick={footerAction.onClick} style={{
          marginTop: 32, background: 'none', border: 'none',
          color: 'var(--purple-light)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          {footerAction.label}
        </button>
      )}
    </div>
  );
};

export { hashPin };
