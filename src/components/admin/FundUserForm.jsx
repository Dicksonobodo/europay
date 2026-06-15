import { useState } from 'react';
import { getAllUsers, fundUserAccount, upgradeToTier2, downgradeToTier1 } from '../../firebase/firestore';
import Button from '../ui/Button';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';

const FundUserForm = () => {
  const [search, setSearch] = useState('');
  const [amount, setAmount] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    setMsg(null);
    setFoundUser(null);
    try {
      const users = await getAllUsers();
      const q = search.trim().toLowerCase();
      const user = users.find(
        (u) =>
          u.email?.toLowerCase() === q ||
          u.iban?.toLowerCase() === q ||
          String(u.cardNumber) === q
      );
      if (!user) throw new Error('No user found with that email, IBAN, or card number');
      setFoundUser(user);
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
    setSearching(false);
  };

  const handleFund = async () => {
    if (!foundUser || !amount) return;
    setLoading(true);
    setMsg(null);
    try {
      await fundUserAccount(foundUser.uid, parseFloat(amount));
      setMsg({ type: 'success', text: `Funded ${fmt(parseFloat(amount))} to ${foundUser.fullName}` });
      setAmount('');
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
    setLoading(false);
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await upgradeToTier2(foundUser.uid);
      setFoundUser({ ...foundUser, tier: 2 });
      setMsg({ type: 'success', text: `${foundUser.fullName} upgraded to Tier 2` });
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
    setLoading(false);
  };

  const handleDowngrade = async () => {
    setLoading(true);
    try {
      await downgradeToTier1(foundUser.uid);
      setFoundUser({ ...foundUser, tier: 1 });
      setMsg({ type: 'success', text: `${foundUser.fullName} downgraded to Tier 1` });
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%', background: 'var(--bg-secondary)',
    border: '1px solid var(--border-light)', borderRadius: 14,
    padding: '14px 16px', color: 'var(--text-primary)', fontSize: 15,
  };

  return (
    <div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
        Search by email, IBAN, or card number to manage a user account.
      </p>

      {/* Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          placeholder="Email, IBAN, or card number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} style={{
          background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
          border: 'none', borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
        }}>
          <Search size={18} color="#fff" />
        </button>
      </div>

      {searching && <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>Searching…</p>}

      {/* Found user card */}
      {foundUser && (
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: 16, padding: '18px 20px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, background: 'linear-gradient(135deg, #7c3aed, #2d1b69)',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{foundUser.fullName[0]}</span>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{foundUser.fullName}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{foundUser.email}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Balance</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(foundUser.balance)}</p>
            </div>
            <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Tier</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: foundUser.tier === 2 ? '#10b981' : '#f59e0b' }}>
                Tier {foundUser.tier}
              </p>
            </div>
          </div>

          {/* IBAN display */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>IBAN</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa', letterSpacing: 1 }}>
              {foundUser.iban
                ? foundUser.iban.replace(/(.{4})/g, '$1 ').trim()
                : 'Not assigned'}
            </p>
          </div>

          {/* Tier controls */}
          <div style={{ display: 'flex', gap: 10 }}>
            {foundUser.tier === 1 ? (
              <button onClick={handleUpgrade} disabled={loading} style={{
                flex: 1, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 10, padding: '10px', color: '#10b981', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <TrendingUp size={14} /> Upgrade to Tier 2
              </button>
            ) : (
              <button onClick={handleDowngrade} disabled={loading} style={{
                flex: 1, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 10, padding: '10px', color: '#f59e0b', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <TrendingDown size={14} /> Downgrade to Tier 1
              </button>
            )}
          </div>
        </div>
      )}

      {/* Fund section */}
      {foundUser && (
        <>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            Fund Account
          </p>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--purple-light)', fontWeight: 700 }}>€</span>
            <input
              style={{ ...inputStyle, paddingLeft: 34 }}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              min="0"
            />
          </div>
          <Button onClick={handleFund} disabled={loading || !amount} fullWidth>
            {loading ? 'Processing…' : 'Fund Account'}
          </Button>
        </>
      )}

      {msg && (
        <div style={{
          padding: '12px 16px', borderRadius: 12, marginTop: 14,
          background: msg.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          color: msg.type === 'success' ? '#10b981' : '#ef4444',
          fontSize: 14,
        }}>
          {msg.text}
        </div>
      )}
    </div>
  );
};

export default FundUserForm;