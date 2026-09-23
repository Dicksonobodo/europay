import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Check } from 'lucide-react';
import { withdrawFunds } from '../firebase/firestore';
import useAuth from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import BottomNav from '../components/ui/BottomNav';

const Withdraw = () => {
  const navigate = useNavigate();
  const { currentUser, userData, refreshUserData } = useAuth();
  const [amount, setAmount] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tierModal, setTierModal] = useState(userData?.tier === 1);

  const quickAmounts = [50, 100, 250, 500];
  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(n || 0);

  const handleWithdraw = async () => {
    setLoading(true);
    setError('');
    try {
      await withdrawFunds(currentUser.uid, parseFloat(amount));
      await refreshUserData();
      setSuccess(true);
      setConfirm(false);
    } catch (e) {
      setError(e.message);
      setConfirm(false);
    }
    setLoading(false);
  };

  if (success) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: 72, height: 72, background: 'rgba(16,185,129,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Check size={32} color="#10b981" />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Withdrawn!</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>{fmt(parseFloat(amount))} withdrawn successfully</p>
      <Button onClick={() => navigate('/dashboard')} style={{ marginTop: 32 }} fullWidth>Back to Dashboard</Button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 96 }}>
      <div style={{ padding: '56px 20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 10, cursor: 'pointer' }}>
          <ArrowLeft size={18} color="var(--text-secondary)" />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Withdraw</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Withdraw your funds</p>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--border)', marginBottom: 28 }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Available Balance</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(userData?.balance)}</p>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Amount</p>

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--purple-light)', fontWeight: 700 }}>€</span>
          <input
            style={{
              width: '100%', background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)', borderRadius: 14,
              padding: '15px 16px 15px 36px', color: 'var(--text-primary)', fontSize: 22, fontWeight: 700,
            }}
            placeholder="0.00"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          {quickAmounts.map((q) => (
            <button key={q} onClick={() => setAmount(q.toString())} style={{
              flex: 1, background: amount === q.toString() ? 'rgba(124,58,237,0.2)' : 'var(--bg-card)',
              border: `1px solid ${amount === q.toString() ? 'rgba(124,58,237,0.5)' : 'var(--border)'}`,
              borderRadius: 12, padding: '10px 0',
              color: amount === q.toString() ? '#a78bfa' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>€{q}</button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', color: '#ef4444', fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <Button onClick={() => { setError(''); setConfirm(true); }} disabled={!amount || parseFloat(amount) <= 0} fullWidth>
          Continue
        </Button>
      </div>

      {/* Tier 1 Modal */}
      <Modal open={tierModal} title="Upgrade Required">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, background: 'rgba(245,158,11,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Lock size={28} color="#f59e0b" />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            Withdrawals are only available for <strong style={{ color: '#f59e0b' }}>Tier 2</strong> accounts. Contact support to upgrade.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button onClick={() => navigate('/dashboard')} variant="secondary" fullWidth>Back</Button>
          <Button onClick={() => { setTierModal(false); navigate('/support'); }} fullWidth>Contact Support</Button>
        </div>
      </Modal>

      {/* Confirm Modal */}
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Confirm Withdrawal">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(parseFloat(amount || 0))}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 8 }}>This will be deducted from your balance</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button onClick={() => setConfirm(false)} variant="secondary" fullWidth>Cancel</Button>
          <Button onClick={handleWithdraw} disabled={loading} fullWidth>
            {loading ? 'Processing…' : 'Withdraw'}
          </Button>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
};

export default Withdraw;
