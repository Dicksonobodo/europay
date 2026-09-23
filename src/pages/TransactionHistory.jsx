import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Copy, Check } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { getAllTransactions, updateTransactionDate, deleteTransaction } from '../firebase/firestore';
import TransactionItem from '../components/dashboard/TransactionItem';
import Modal from '../components/ui/Modal';
import { getCategoryInfo } from '../utils/categories';
import BottomNav from '../components/ui/BottomNav';

const TransactionHistory = () => {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState('all'); // all | credit | debit
  const [dateDraft, setDateDraft] = useState('');
  const transactionUnsubRef = useRef(null);

  const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);

  const formatDateInputValue = (dateValue) => {
    const d = dateValue?.toDate?.() || new Date(dateValue || Date.now());
    const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
    return localDate.toISOString().slice(0, 16);
  };

  const refreshTransactions = () => {
    if (!currentUser) return;
    transactionUnsubRef.current?.();
    transactionUnsubRef.current = getAllTransactions(currentUser.uid, (txs) => {
      setTransactions(txs);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (!currentUser) return;
    refreshTransactions();

    const handleTxRefresh = (event) => {
      const uid = event.detail?.uid;
      if (uid === currentUser.uid) refreshTransactions();
    };

    const handleStorageRefresh = (event) => {
      if (event.key !== 'europay_tx_refresh') return;
      try {
        const payload = JSON.parse(event.newValue || '{}');
        if (payload.uid === currentUser.uid) refreshTransactions();
      } catch {
        // ignore malformed payloads
      }
    };

    window.addEventListener('europay-tx-refresh', handleTxRefresh);
    window.addEventListener('storage', handleStorageRefresh);

    return () => {
      transactionUnsubRef.current?.();
      window.removeEventListener('europay-tx-refresh', handleTxRefresh);
      window.removeEventListener('storage', handleStorageRefresh);
    };
  }, [currentUser]);

  const filtered = transactions.filter((tx) => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  // Group by month
  const grouped = filtered.reduce((acc, tx) => {
    const date = tx.date?.toDate?.() || new Date();
    const key = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});

  const handleCopyRef = () => {
    navigator.clipboard.writeText(selected?.id || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveTransactionDate = async () => {
    if (!selected) return;
    const nextDate = dateDraft || formatDateInputValue(selected.date);
    if (!nextDate) return;
    await updateTransactionDate(currentUser.uid, selected.id, new Date(nextDate));
    setTransactions((prev) => prev.map((tx) => tx.id === selected.id ? { ...tx, date: new Date(nextDate) } : tx));
    setSelected(null);
  };

  const handleDeleteTransaction = async () => {
    if (!selected) return;
    await deleteTransaction(currentUser.uid, selected.id);
    setTransactions((prev) => prev.filter((tx) => tx.id !== selected.id));
    setSelected(null);
  };

  useEffect(() => {
    if (selected) {
      setDateDraft(formatDateInputValue(selected.date));
    }
  }, [selected]);

  const cat = selected ? getCategoryInfo(selected.description) : null;
  const isCredit = selected?.type === 'credit';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 96 }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/dashboard')} style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 10, cursor: 'pointer',
        }}>
          <ArrowLeft size={18} color="var(--text-secondary)" />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Transactions</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Full transaction history</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px' }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'credit', label: 'Received' },
          { key: 'debit', label: 'Sent' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            flex: 1, padding: '10px 8px', borderRadius: 12,
            background: filter === key ? 'rgba(124,58,237,0.2)' : 'var(--bg-card)',
            border: `1px solid ${filter === key ? 'rgba(124,58,237,0.5)' : 'var(--border)'}`,
            color: filter === key ? '#a78bfa' : 'var(--text-secondary)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {/* Transaction list */}
      <div style={{ padding: '0 20px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>No transactions found</p>
          </div>
        ) : (
          Object.entries(grouped).map(([month, txs]) => (
            <div key={month} style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                {month}
              </p>
              <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: '0 16px', border: '1px solid var(--border)' }}>
                {txs.map((tx, i) => (
                  <div key={tx.id} style={{ borderBottom: i < txs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <TransactionItem tx={tx} onClick={() => setSelected(tx)} />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Receipt Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Transaction Receipt">
        {selected && (
          <div>
            {/* Amount */}
            <div style={{
              textAlign: 'center', marginBottom: 24,
              padding: '20px', borderRadius: 16,
              background: isCredit ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${isCredit ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>
              <p style={{ fontSize: 36, fontWeight: 900, color: isCredit ? '#10b981' : '#ef4444' }}>
                {isCredit ? '+' : '-'}{fmt(selected.amount)}
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                marginTop: 8, padding: '4px 12px', borderRadius: 20,
                background: cat.bg, border: `1px solid ${cat.border}`,
              }}>
                <cat.icon size={14} color={cat.color} />
                <span style={{ fontSize: 12, fontWeight: 600, color: cat.color }}>{cat.label}</span>
              </div>
            </div>

            {/* Details */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
              {[
                { label: 'Description', value: selected.description },
                { label: 'Type', value: isCredit ? '↓ Received' : '↑ Sent' },
                { label: 'Date', value: selected.date?.toDate?.()?.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) },
                { label: 'Time', value: selected.date?.toDate?.()?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
                { label: 'Status', value: '✓ Completed' },
                { label: 'Account', value: userData?.fullName },
              ].map(({ label, value }, i, arr) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '13px 16px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Reference ID */}
            <div style={{
              background: 'var(--bg-secondary)', borderRadius: 12,
              padding: '12px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Reference ID</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  {selected.id?.slice(0, 16).toUpperCase()}
                </p>
              </div>
              <button onClick={handleCopyRef} style={{
                background: copied ? 'rgba(16,185,129,0.12)' : 'var(--bg-elevated)',
                border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'var(--border-light)'}`,
                borderRadius: 8, padding: '6px 12px',
                color: copied ? '#10b981' : 'var(--text-secondary)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <button onClick={() => setSelected(null)} style={{
              width: '100%', background: 'var(--bg-elevated)',
              border: '1px solid var(--border-light)', borderRadius: 14,
              padding: 14, color: 'var(--text-primary)', fontSize: 15,
              fontWeight: 600, cursor: 'pointer',
            }}>Close</button>
          </div>
        )}
      </Modal>

      <BottomNav />
    </div>
  );
};

export default TransactionHistory;