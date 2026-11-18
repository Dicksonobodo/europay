import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Check } from 'lucide-react';
import { getTransferRecipients, sendAccountTransfer } from '../firebase/firestore';
import useAuth from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import BottomNav from '../components/ui/BottomNav';
import { useCurrency } from '../hooks/useCurrency';
import { parseAmountToMinorUnits } from '../utils/withdrawal';

const Transfer = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { currentUser, userData, accountNumberError, refreshUserData } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const quickAmounts = [50, 100, 250, 500];
  const fmt = formatCurrency;

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError('');
    try {
      const all = await getTransferRecipients(query);
      const filtered = all.filter((recipient) =>
        recipient.uid !== currentUser.uid
      );
      setResults(filtered);
    } catch (searchError) {
      setError(searchError.message || 'Recipient search failed.');
    } finally {
      setSearching(false);
    }
  };

  const handleTransfer = async () => {
    const amountMinor = parseAmountToMinorUnits(amount);
    if (amountMinor === null || amountMinor <= 0) {
      setError('Enter a valid amount with no more than two decimal places.');
      setConfirm(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendAccountTransfer(selected.accountNumber, amountMinor);
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
      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Transfer Sent!</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 4 }}>
        {fmt(parseFloat(amount))} sent to {selected?.fullName}
      </p>
      <Button onClick={() => navigate('/dashboard')} style={{ marginTop: 32 }} fullWidth>Back to Dashboard</Button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 96 }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 10, cursor: 'pointer' }}>
          <ArrowLeft size={18} color="var(--text-secondary)" />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Transfer</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Send money instantly</p>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {/* Balance */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--border)', marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Your Balance</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(userData?.balance)}</p>
        </div>
        {accountNumberError && (
          <p role="alert" style={{ color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
            {accountNumberError}
          </p>
        )}

        {/* Search */}
        {!selected ? (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Find Recipient</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input
                style={{
                  flex: 1, background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)', borderRadius: 14,
                  padding: '14px 16px', color: 'var(--text-primary)', fontSize: 15,
                }}
                placeholder="Name, email, or account number"
                aria-label="Search recipient by name, email, or account number"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button onClick={handleSearch} style={{
                background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                border: 'none', borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
              }}>
                <Search size={18} color="#fff" />
              </button>
            </div>
            {searching && <p style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center', padding: 16 }}>Searching…</p>}
            {results.map((u) => (
              <button key={u.uid} onClick={() => setSelected(u)} style={{
                width: '100%', background: 'var(--bg-card)',
                border: '1px solid var(--border)', borderRadius: 16,
                padding: '16px', display: 'flex', alignItems: 'center', gap: 14,
                cursor: 'pointer', marginBottom: 10, textAlign: 'left',
              }}>
                <div style={{
                  width: 44, height: 44,
                  background: 'linear-gradient(135deg, #7c3aed, #2d1b69)',
                  borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{u.fullName[0]}</span>
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{u.fullName}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Account number: {u.accountNumber}
                  </p>
                </div>
              </button>
            ))}
            {!searching && query.trim() && results.length === 0 && !error && (
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: 16 }}>
                No recipient found. Check the name, email, or 12-digit Europay account number.
              </p>
            )}
          </>
        ) : (
          <>
            {/* Selected recipient + amount */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
                <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #7c3aed, #2d1b69)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{selected.fullName[0]}</span>
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{selected.fullName}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Account number: {selected.accountNumber}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} style={{ marginLeft: 'auto', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>Change</button>
              </div>
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

            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
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

            <Button onClick={() => { setError(''); setConfirm(true); }} disabled={parseAmountToMinorUnits(amount) === null || parseAmountToMinorUnits(amount) <= 0} fullWidth>
              Continue
            </Button>
          </>
        )}
      </div>

      {/* Confirm Modal */}
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Confirm Transfer">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(parseFloat(amount || 0))}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginTop: 8 }}>to {selected?.fullName}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button onClick={() => setConfirm(false)} variant="secondary" fullWidth>Cancel</Button>
          <Button onClick={handleTransfer} disabled={loading} fullWidth>
            {loading ? 'Sending…' : 'Confirm'}
          </Button>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
};

export default Transfer;
