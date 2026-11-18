import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Check, Clock3 } from 'lucide-react';
import { getAllTransactionsList, getTransferRecipients, sendAccountTransfer } from '../firebase/firestore';
import useAuth from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import BottomNav from '../components/ui/BottomNav';
import { useCurrency } from '../hooks/useCurrency';
import { formatMinorUnits, parseAmountToMinorUnits } from '../utils/withdrawal';
import { formatAccountNumber } from '../utils/accountNumber';

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
  const [receipt, setReceipt] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [error, setError] = useState('');

  const fmt = formatCurrency;
  const balanceMinor = Math.max(0, Math.round(Number(userData?.balance || 0) * 100));
  const amountMinor = parseAmountToMinorUnits(amount);
  const amountError = useMemo(() => {
    if (!amount) return '';
    if (amountMinor === null || amountMinor <= 0) return 'Enter a valid amount with no more than two decimal places.';
    if (amountMinor > balanceMinor) return 'The transfer amount exceeds your available balance.';
    if (userData?.isFrozen) return 'Your account is frozen. Unfreeze it before sending a transfer.';
    if (userData?.isSuspended) return 'Your account is suspended. Contact support before sending a transfer.';
    return '';
  }, [amount, amountMinor, balanceMinor, userData?.isFrozen, userData?.isSuspended]);

  useEffect(() => {
    if (!currentUser) return undefined;
    let active = true;
    getAllTransactionsList(currentUser.uid)
      .then((transactions) => {
        if (active) {
          setHistory(transactions.filter((item) =>
            item.description?.startsWith('Transfer to ')
          ).slice(0, 5));
        }
      })
      .catch((historyLoadError) => {
        if (active) setHistoryError(historyLoadError.message || 'Could not load transfer history.');
      });
    return () => {
      active = false;
    };
  }, [currentUser, receipt]);

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
    if (amountError) {
      setError(amountError);
      setConfirm(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await sendAccountTransfer(selected.accountNumber, amountMinor);
      await refreshUserData();
      setReceipt({
        ...result,
        amountMinor,
        createdAt: new Date(),
      });
      setConfirm(false);
    } catch (e) {
      setError(e.message);
      setConfirm(false);
    }
    setLoading(false);
  };

  const setQuickAmount = (percentage) => {
    const value = percentage === 100 ? balanceMinor : Math.floor(balanceMinor * percentage / 100);
    setAmount(formatMinorUnits(value));
    setError('');
  };

  if (receipt) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '56px 20px 96px' }}>
      <main style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, background: 'rgba(16,185,129,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '24px auto 20px' }}>
          <Check size={32} color="#10b981" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Transfer complete</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 20 }}>
          {fmt(receipt.amountMinor / 100)} sent to {receipt.recipient.fullName}
        </p>
        <section style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 18, border: '1px solid var(--border)', textAlign: 'left', marginBottom: 20 }}>
          {[
            ['Recipient', receipt.recipient.fullName],
            ['Account number', formatAccountNumber(receipt.recipient.accountNumber)],
            ['Reference', receipt.reference],
            ['Status', 'Completed in Europay'],
            ['Processing', 'In-app transfer; no external bank payout'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <strong style={{ color: 'var(--text-primary)', textAlign: 'right', overflowWrap: 'anywhere' }}>{value}</strong>
            </div>
          ))}
        </section>
        <Button onClick={() => navigate('/transactions')} fullWidth>View transaction history</Button>
        <Button
          variant="secondary"
          onClick={() => {
            setReceipt(null);
            setSelected(null);
            setAmount('');
            setQuery('');
          }}
          fullWidth
          style={{ marginTop: 10 }}
        >
          Make another transfer
        </Button>
        <Button variant="secondary" onClick={() => navigate('/dashboard')} fullWidth style={{ marginTop: 10 }}>
          Back to Dashboard
        </Button>
      </main>
      <BottomNav />
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
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Transfer to another Europay account</p>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {/* Balance */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--border)', marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Available balance</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(userData?.balance)}</p>
        </div>
        <aside style={{
          background: 'rgba(124,58,237,0.08)',
          border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: 12,
          padding: 12,
          marginBottom: 20,
          color: 'var(--text-secondary)',
          fontSize: 12,
          lineHeight: 1.5,
        }}>
          Transfers are between Europay users only. The recipient’s Europay account number is not a bank account number.
        </aside>
        {accountNumberError && (
          <p role="alert" style={{ color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
            {accountNumberError}
          </p>
        )}

        {/* Search */}
        {!selected ? (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Recipient</p>
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
            {searching && <p role="status" style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center', padding: 16 }}>Searching…</p>}
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
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Transfer to</h2>
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

            <label htmlFor="transfer-amount" style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
              Transfer amount (EUR)
            </label>

            <div style={{ position: 'relative', marginBottom: 16 }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--purple-light)', fontWeight: 700 }}>€</span>
              <input
                id="transfer-amount"
                style={{
                  width: '100%', background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)', borderRadius: 14,
                  padding: '15px 16px 15px 36px', color: 'var(--text-primary)', fontSize: 22, fontWeight: 700,
                }}
                placeholder="0.00"
                type="number"
                min="0.01"
                max={formatMinorUnits(balanceMinor)}
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                aria-describedby="transfer-amount-error"
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              {[25, 50, 75, 100].map((percentage) => (
                <button key={percentage} type="button" onClick={() => setQuickAmount(percentage)} style={{
                  flex: 1, background: amount === formatMinorUnits(Math.floor(balanceMinor * percentage / 100)) ? 'rgba(124,58,237,0.2)' : 'var(--bg-card)',
                  border: `1px solid ${amount === formatMinorUnits(Math.floor(balanceMinor * percentage / 100)) ? 'rgba(124,58,237,0.5)' : 'var(--border)'}`,
                  borderRadius: 12, padding: '10px 0',
                  color: amount === formatMinorUnits(Math.floor(balanceMinor * percentage / 100)) ? '#a78bfa' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>{percentage === 100 ? 'Max' : `${percentage}%`}</button>
              ))}
            </div>

            {(amountError || error) && (
              <p id="transfer-amount-error" role="alert" style={{ color: '#ef4444', fontSize: 13, margin: '0 0 16px' }}>
                {error || amountError}
              </p>
            )}

            <section style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 14, padding: 14, margin: '8px 0 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Transfer amount</span>
                <strong>{fmt(amountMinor === null ? 0 : amountMinor / 100)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Europay transfer fee</span>
                <strong>€0.00</strong>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                No transfer fee is charged by Europay. This sends funds only to another Europay user, not to an external bank account.
              </p>
              <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginTop: 10, fontSize: 11, color: 'var(--text-secondary)' }}>
                <Clock3 size={14} style={{ flexShrink: 0 }} />
                Processing: recipient balance updates when the transfer is confirmed.
              </div>
            </section>

            <Button onClick={() => { setError(''); setConfirm(true); }} disabled={!amount || Boolean(amountError) || loading} fullWidth>
              Continue
            </Button>
          </>
        )}

        <section style={{ marginTop: 28, paddingBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Recent transfers</h2>
            <button type="button" onClick={() => navigate('/transactions')} style={{ border: 0, background: 'transparent', color: '#a78bfa', fontSize: 12, fontWeight: 700 }}>
              All transactions
            </button>
          </div>
          {historyError && <p role="alert" style={{ color: '#ef4444', fontSize: 12 }}>{historyError}</p>}
          {history.length === 0 && !historyError ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No transfers yet.</p>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              {history.map((item, index) => (
                <div key={item.id} style={{ padding: 12, borderBottom: index < history.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>{item.description.replace('Transfer to ', '')}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>In-app transfer</p>
                  </div>
                  <strong style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(item.amount || 0)}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Confirm Modal */}
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Confirm Transfer">
        <div style={{ display: 'grid', gap: 12, marginBottom: 24, fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Recipient</span>
            <strong>{selected?.fullName}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Account number</span>
            <strong>{formatAccountNumber(selected?.accountNumber)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
            <strong>{fmt(amountMinor === null ? 0 : amountMinor / 100)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Fee</span>
            <strong>€0.00</strong>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5 }}>
            This transfer moves funds to the selected Europay account. Confirm the recipient details before sending.
          </p>
          {error && <p role="alert" style={{ color: '#ef4444' }}>{error}</p>}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button onClick={() => setConfirm(false)} variant="secondary" fullWidth>Cancel</Button>
          <Button onClick={handleTransfer} disabled={loading} fullWidth>
            {loading ? 'Sending…' : 'Confirm transfer'}
          </Button>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
};

export default Transfer;
