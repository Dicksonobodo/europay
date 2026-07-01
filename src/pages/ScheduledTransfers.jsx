import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Calendar, Repeat, Check, Trash2 } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import {
  getAllUsers, createScheduledTransfer,
  getScheduledTransfers, cancelScheduledTransfer,
} from '../firebase/firestore';
import BottomNav from '../components/ui/BottomNav';
import Modal from '../components/ui/Modal';

const FREQUENCIES = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

const ScheduledTransfers = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tab, setTab] = useState('new');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [note, setNote] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [error, setError] = useState('');
  const [cancelModal, setCancelModal] = useState(null);

  const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);
  const quickAmounts = [50, 100, 250, 500];

  useEffect(() => {
    if (!currentUser) return;
    const unsub = getScheduledTransfers(currentUser.uid, setSchedules);
    return unsub;
  }, [currentUser]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const all = await getAllUsers();
    setResults(all.filter(
      (u) => u.uid !== currentUser.uid &&
        u.fullName.toLowerCase().includes(query.toLowerCase())
    ));
    setSearching(false);
  };

  const handleCreate = async () => {
    if (!selected || !amount || !startDate) return;
    setLoading(true);
    setError('');
    try {
      await createScheduledTransfer(currentUser.uid, {
        recipientUid: selected.uid,
        recipientName: selected.fullName,
        recipientEmail: selected.email,
        amount: parseFloat(amount),
        frequency,
        note,
        nextRunDate: new Date(startDate),
        startDate: new Date(startDate),
      });
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!cancelModal) return;
    await cancelScheduledTransfer(currentUser.uid, cancelModal.id);
    setCancelModal(null);
  };

  const activeSchedules = schedules.filter((s) => s.status === 'active');
  const pastSchedules = schedules.filter((s) => s.status !== 'active');

  if (success) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: 72, height: 72, background: 'rgba(16,185,129,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Check size={32} color="#10b981" />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Schedule Created!</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, textAlign: 'center' }}>
        {fmt(parseFloat(amount))} will be sent {frequency} to {selected?.fullName}
      </p>
      <button onClick={() => { setSuccess(false); setSelected(null); setAmount(''); setNote(''); setQuery(''); setResults([]); setTab('active'); }}
        style={{ marginTop: 32, background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', border: 'none', borderRadius: 14, padding: '14px 32px', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
        View Schedules
      </button>
    </div>
  );

  const inputStyle = {
    width: '100%', background: 'var(--bg-secondary)',
    border: '1px solid var(--border-light)', borderRadius: 14,
    padding: '14px 16px', color: 'var(--text-primary)', fontSize: 15,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 96 }}>
      <div style={{ padding: '56px 20px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 10, cursor: 'pointer' }}>
          <ArrowLeft size={18} color="var(--text-secondary)" />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Scheduled Transfers</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Set up recurring payments</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px' }}>
        {[
          { key: 'new', label: 'New Schedule' },
          { key: 'active', label: `Active (${activeSchedules.length})` },
          { key: 'past', label: 'Past' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: '10px 8px', borderRadius: 12,
            background: tab === key ? 'rgba(124,58,237,0.2)' : 'var(--bg-card)',
            border: `1px solid ${tab === key ? 'rgba(124,58,237,0.5)' : 'var(--border)'}`,
            color: tab === key ? '#a78bfa' : 'var(--text-secondary)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: '0 20px' }}>
        {tab === 'new' && (
          <>
            {!selected ? (
              <>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Recipient</p>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <input style={{ ...inputStyle, flex: 1 }} placeholder="Search by name…" value={query}
                    onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                  <button onClick={handleSearch} style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', border: 'none', borderRadius: 14, padding: '14px 16px', cursor: 'pointer' }}>
                    <Search size={18} color="#fff" />
                  </button>
                </div>
                {searching && <p style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center' }}>Searching…</p>}
                {results.map((u) => (
                  <button key={u.uid} onClick={() => setSelected(u)} style={{
                    width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14,
                    cursor: 'pointer', marginBottom: 10, textAlign: 'left',
                  }}>
                    <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #7c3aed, #2d1b69)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{u.fullName[0]}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{u.fullName}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email}</p>
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <>
                <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 16, border: '1px solid var(--border)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #7c3aed, #2d1b69)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{selected.fullName[0]}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{selected.fullName}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selected.email}</p>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>Change</button>
                </div>

                <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Amount</p>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--purple-light)', fontWeight: 700 }}>€</span>
                  <input style={{ ...inputStyle, paddingLeft: 36, fontSize: 22, fontWeight: 700 }}
                    placeholder="0.00" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
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

                <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Frequency</p>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  {FREQUENCIES.map(({ key, label }) => (
                    <button key={key} onClick={() => setFrequency(key)} style={{
                      flex: 1, background: frequency === key ? 'rgba(124,58,237,0.2)' : 'var(--bg-card)',
                      border: `1px solid ${frequency === key ? 'rgba(124,58,237,0.5)' : 'var(--border)'}`,
                      borderRadius: 12, padding: '12px 0',
                      color: frequency === key ? '#a78bfa' : 'var(--text-secondary)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>{label}</button>
                  ))}
                </div>

                <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Start Date</p>
                <input type="date" style={{ ...inputStyle, marginBottom: 16 }}
                  value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} />

                <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Note (optional)</p>
                <input style={{ ...inputStyle, marginBottom: 20 }} placeholder="e.g. Monthly rent"
                  value={note} onChange={(e) => setNote(e.target.value)} />

                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', color: '#ef4444', fontSize: 14, marginBottom: 16 }}>{error}</div>}

                <button onClick={handleCreate} disabled={!amount || !startDate || loading} style={{
                  width: '100%', background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', border: 'none',
                  borderRadius: 14, padding: 16, color: '#fff', fontSize: 15, fontWeight: 600,
                  cursor: !amount || !startDate || loading ? 'not-allowed' : 'pointer',
                  opacity: !amount || !startDate || loading ? 0.5 : 1,
                }}>{loading ? 'Creating…' : 'Create Schedule'}</button>
              </>
            )}
          </>
        )}

        {tab === 'active' && (
          activeSchedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Repeat size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>No active schedules</p>
            </div>
          ) : (
            activeSchedules.map((s) => (
              <div key={s.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 20px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>To {s.recipientName}</p>
                    {s.note && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>"{s.note}"</p>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <Repeat size={12} color="#a78bfa" />
                      <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, textTransform: 'capitalize' }}>{s.frequency}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(s.amount)}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={12} color="var(--text-muted)" />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Next: {s.nextRunDate?.toDate?.()?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) || s.startDate?.toDate?.()?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <button onClick={() => setCancelModal(s)} style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 8, padding: '6px 12px', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}><Trash2 size={12} /> Cancel</button>
                </div>
              </div>
            ))
          )
        )}

        {tab === 'past' && (
          pastSchedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>No past schedules</p>
            </div>
          ) : (
            pastSchedules.map((s) => (
              <div key={s.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 20px', marginBottom: 12, opacity: 0.7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>To {s.recipientName}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize', marginTop: 4 }}>{s.frequency} · Cancelled</p>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>{fmt(s.amount)}</p>
                </div>
              </div>
            ))
          )
        )}
      </div>

      <Modal open={!!cancelModal} onClose={() => setCancelModal(null)} title="Cancel Schedule?">
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 24 }}>
          Stop sending {fmt(cancelModal?.amount)} {cancelModal?.frequency} to {cancelModal?.recipientName}?
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setCancelModal(null)} style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 14, color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Keep It</button>
          <button onClick={handleCancel} style={{ flex: 1, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14, padding: 14, color: '#ef4444', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel Schedule</button>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
};

export default ScheduledTransfers;