import { useState } from 'react';
import { ArrowRight, Shield, Zap, Globe } from 'lucide-react';

const slides = [
  {
    icon: Globe,
    color: '#7c3aed',
    title: 'Welcome to Europay',
    subtitle: 'Your modern European banking experience. Send, receive, and manage money with ease.',
  },
  {
    icon: Zap,
    color: '#5b21b6',
    title: 'Instant Transfers',
    subtitle: 'Send money to anyone on Europay instantly. Split bills, request payments, and schedule recurring transfers.',
  },
  {
    icon: Shield,
    color: '#4c1d95',
    title: 'Bank-Grade Security',
    subtitle: 'Protect your account with a PIN lock, freeze your card anytime, and monitor every login session.',
  },
];

const Onboarding = ({ onFinish }) => {
  const [step, setStep] = useState(0);
  const current = slides[step];
  const Icon = current.icon;
  const isLast = step === slides.length - 1;

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: '80px 32px 56px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
        width: 320, height: 320,
        background: `radial-gradient(circle, ${current.color}30 0%, transparent 70%)`,
        borderRadius: '50%', transition: 'all 0.5s',
      }} />

      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', zIndex: 1 }}>
        <button onClick={onFinish} style={{
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>Skip</button>
      </div>

      <div style={{ textAlign: 'center', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 100, height: 100,
          background: `linear-gradient(135deg, ${current.color}, ${current.color}88)`,
          borderRadius: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 40, boxShadow: `0 16px 48px ${current.color}40`,
          border: `1px solid ${current.color}60`,
        }}>
          <Icon size={44} color="#fff" />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.2 }}>
          {current.title}
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 300 }}>
          {current.subtitle}
        </p>
      </div>

      <div style={{ width: '100%', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          {slides.map((_, i) => (
            <div key={i} style={{
              height: 6, borderRadius: 3,
              width: i === step ? 24 : 6,
              background: i === step ? '#7c3aed' : 'var(--border-light)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
        <button
          onClick={() => isLast ? onFinish() : setStep(step + 1)}
          style={{
            width: '100%', background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
            border: 'none', borderRadius: 16, padding: '16px',
            color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 8px 24px rgba(124,58,237,0.4)',
          }}
        >
          {isLast ? 'Get Started' : 'Next'}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Onboarding;