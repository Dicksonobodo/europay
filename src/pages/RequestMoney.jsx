import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Check, Clock, X } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import {
  getAllUsers, sendMoneyRequest, getMoneyRequests,
  getSentRequests, approveMoneyRequest, declineMoneyRequest,
} from '../firebase/firestore';
import BottomNav from '../components/ui/BottomNav';
import Modal from '../components/ui/Modal';

const RequestMoney = () => {
  const navigate = useNavigate();
  const { currentUser, userData, refreshUserData } = useAuth();
  const [tab, setTab] = useState('request');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [incoming, setIncoming] = useState([]);
  const [sent, setSent] = useState([]);
  const [confirmPay, setConfirmPay] = useState(null);
  const [error, setError] = useState('');

  const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);
  const quickAmounts = [10, 25, 50, 100];

  useEffect(() => {
    if (!currentUser) return;
    const unsub1 = getMoneyRequests(currentUser.uid, setIncoming);
    const unsub2 = getSentRequests(currentUser.uid, setSent);
    return () => { unsub1(); unsub2(); };
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

  const handleSendRequest = async () => {
    if (!selected || !amount) return;
    setLoading(true);
    setError('');
    try {
      await sendMoneyRequest(currentUser.uid, userData.fullName, selected.uid, parseFloat(amount), note);
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleApprove = async (req) => {
    setLoading(true);
    try {
      await approveMoneyRequest(req.id, currentUser.uid, req.fromUid, req.amount, req.fromName);
      await refreshUserData();
      setConfirmPay(null);
    } catch (e) {
      setError(e.message);
      setConfirmPay(null);
    }
    setLoading(false);
  };

  const handleDecline = async (req) => {
    await declineMoneyRequest(req.id, req.fromUid, req.amount);
  };

  const statusColor = (s) => s === 'approved' ? '#10b981' : s === 'declined' ? '#ef4444' : '#f59e0b';
  const statusLabel = (s) => s === 'approved' ? 'Paid' : s === 'declined' ? 'Declined' : 'Pending';

  if (success) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: 72, height: 72, background: 'rgba(16,185,129,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Check size={32} color="#10b981" />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Request Sent!</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 4 }}>
        {fmt(parseFloat(amount))} requested from {selected?.fullName}
      </p>
      <button onClick={() => { setSuccess(false); setSelected(null); setAmount(''); setNote(''); setQuery(''); setResults([]); setTab('sent'); }}
        style={{ marginTop: 32, background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', border: 'none', borderRadius: 14, padding: '14px 32px', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
        View Sent Requests
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
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Request Money</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Ask someone to pay you</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px' }}>
        {[
          { key: 'request', label: 'New Request' },
          { key: 'incoming', label: `Incoming${incoming.filter(r => r.status === 'pending').length > 0 ? ` (${incoming.filter(r => r.status === 'pending').length})` : ''}` },
          { key: 'sent', label: 'Sent' },
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
        {tab === 'request' && (
          <>
            {!selected ? (
              <>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Find Person</p>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <input style={{ ...inputStyle, flex: 1 }} placeholder="Search by name…" value={query}
                    onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                  <button onClick={handleSearch} style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', border: 'none', borderRadius: 14, padding: '14px 16px', cursor: 'pointer' }}>
                    <Search size={18} color="#fff" />
                  </button>
                </div>
                {searching && <p style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center', padding: 16 }}>Searching…</p>}
                {results.map((u) => (
                  <button key={u.uid} onClick={() => setSelected(u)} style={{
                    width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14,
                    cursor: 'pointer', marginBottom: 10, textAlign: 'left',
                  }}>
                    <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #7c3aed, #2d1b69)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

                <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Amount to Request</p>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--purple-light)', fontWeight: 700 }}>€</span>
                  <input style={{ ...inputStyle, paddingLeft: 36, fontSize: 22, fontWeight: 700 }}
                    placeholder="0.00" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
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

                <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Note (optional)</p>
                <input style={{ ...inputStyle, marginBottom: 20 }} placeholder="e.g. Dinner last night"
                  value={note} onChange={(e) => setNote(e.target.value)} />

                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', color: '#ef4444', fontSize: 14, marginBottom: 16 }}>{error}</div>}

                <button onClick={handleSendRequest} disabled={!amount || loading} style={{
                  width: '100%', background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', border: 'none',
                  borderRadius: 14, padding: 16, color: '#fff', fontSize: 15, fontWeight: 600,
                  cursor: !amount || loading ? 'not-allowed' : 'pointer', opacity: !amount || loading ? 0.5 : 1,
                }}>{loading ? 'Sending…' : 'Send Request'}</button>
              </>
            )}
          </>
        )}

        {tab === 'incoming' && (
          incoming.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Clock size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>No incoming requests</p>
            </div>
          ) : (
            incoming.map((req) => (
              <div key={req.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 20px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{req.fromName}</p>
                    {req.note && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>"{req.note}"</p>}
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {req.createdAt?.toDate?.()?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(req.amount)}</p>
                    <span style={{ fontSize: 11, fontWeight: 600, color: statusColor(req.status) }}>{statusLabel(req.status)}</span>
                  </div>
                </div>
                {req.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => handleDecline(req)} style={{
                      flex: 1, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 10, padding: '10px', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}><X size={14} /> Decline</button>
                    <button onClick={() => setConfirmPay(req)} style={{
                      flex: 2, background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', border: 'none',
                      borderRadius: 10, padding: '10px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}><Check size={14} /> Pay {fmt(req.amount)}</button>
                  </div>
                )}
              </div>
            ))
          )
        )}

        {tab === 'sent' && (
          sent.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Clock size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>No sent requests yet</p>
            </div>
          ) : (
            sent.map((req) => (
              <div key={req.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '16px 20px', marginBottom: 12,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Requested from user</p>
                  {req.note && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>"{req.note}"</p>}
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {req.createdAt?.toDate?.()?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(req.amount)}</p>
                  <span style={{ fontSize: 11, fontWeight: 600, color: statusColor(req.status) }}>{statusLabel(req.status)}</span>
                </div>
              </div>
            ))
          )
        )}
      </div>

      <Modal open={!!confirmPay} onClose={() => setConfirmPay(null)} title="Confirm Payment">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(confirmPay?.amount)}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginTop: 8 }}>to {confirmPay?.fromName}</p>
          {confirmPay?.note && <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>"{confirmPay.note}"</p>}
        </div>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', color: '#ef4444', fontSize: 14, marginBottom: 16 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setConfirmPay(null)} style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 14, color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => handleApprove(confirmPay)} disabled={loading} style={{ flex: 1, background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', border: 'none', borderRadius: 14, padding: 14, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
            {loading ? 'Paying…' : 'Pay Now'}
          </button>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
};

export default RequestMoney;