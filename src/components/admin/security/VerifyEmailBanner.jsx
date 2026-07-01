import { useState } from 'react';
import { MailCheck, X } from 'lucide-react';
import { resendVerificationEmail } from '../../../firebase/auth';

const VerifyEmailBanner = ({ onDismiss }) => {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    try {
      await resendVerificationEmail();
      setSent(true);
    } catch (_) {}
    setLoading(false);
  };

  return (
    <div style={{
      margin: '0 20px 16px',
      background: 'rgba(245,158,11,0.08)',
      border: '1px solid rgba(245,158,11,0.3)',
      borderRadius: 14,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: 'rgba(245,158,11,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <MailCheck size={16} color="#f59e0b" />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 2 }}>
          Verify your email
        </p>
        <p style={{ fontSize: 12, color: 'rgba(245,158,11,0.7)', lineHeight: 1.5 }}>
          {sent
            ? 'Verification email sent! Check your inbox.'
            : 'Please verify your email address to unlock all features.'}
        </p>
        {!sent && (
          <button onClick={handleResend} disabled={loading} style={{
            marginTop: 8, background: 'none', border: 'none',
            color: '#f59e0b', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', padding: 0, textDecoration: 'underline',
          }}>
            {loading ? 'Sending…' : 'Resend verification email'}
          </button>
        )}
      </div>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <X size={16} color="rgba(245,158,11,0.5)" />
      </button>
    </div>
  );
};

export default VerifyEmailBanner;
