import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, X, Check, Users } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import {
  getAllUsers, createSplitBill, getSplitBills,
  getIncomingSplitBills, paySplitBill,
} from '../firebase/firestore';
import BottomNav from '../components/ui/BottomNav';
import Modal from '../components/ui/Modal';

const SplitBill = () => {
  const navigate = useNavigate();
  const { currentUser, userData, refreshUserData } = useAuth();
  const [tab, setTab] = useState('new');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mySplits, setMySplits] = useState([]);
  const [incomingSplits, setIncomingSplits] = useState([]);
  const [payModal, setPayModal] = useState(null);
  const [error, setError] = useState('');

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(n || 0);

  useEffect(() => {
    if (!currentUser) return;
    const unsub1 = getSplitBills(currentUser.uid, setMySplits);
    const unsub2 = getIncomingSplitBills(currentUser.uid, setIncomingSplits);
    return () => { unsub1(); unsub2(); };
  }, [currentUser]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const all = await getAllUsers();
    setResults(all.filter(
      (u) => u.uid !== currentUser.uid &&
        !participants.find((p) => p.uid === u.uid) &&
        u.fullName.toLowerCase().includes(query.toLowerCase())
    ));
    setSearching(false);
  };

  const addParticipant = (u) => {
    setParticipants((prev) => [...prev, u]);
    setResults([]);
    setQuery('');
  };

  const removeParticipant = (uid) => {
    setParticipants((prev) => prev.filter((p) => p.uid !== uid));
  };

  const perPerson = totalAmount && participants.length > 0
    ? parseFloat(totalAmount) / (participants.length + 1)
    : 0;

  const handleCreate = async () => {
    if (!description || !totalAmount || participants.length === 0) return;
    setLoading(true);
    setError('');
    try {
      await createSplitBill(
        currentUser.uid,
        userData.fullName,
        participants.map((p) => ({ uid: p.uid, name: p.fullName, email: p.email })),
        parseFloat(totalAmount),
        description
      );
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handlePay = async () => {
    if (!payModal) return;
    setLoading(true);
    setError('');
    try {
      await paySplitBill(payModal.id, currentUser.uid, payModal.creatorUid, payModal.creatorName, payModal.perPerson);
      await refreshUserData();
      setPayModal(null);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const myStatusInBill = (bill) => {
    const me = bill.participants?.find((p) => p.uid === currentUser.uid);
    return me?.status || 'pending';
  };

  if (success) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: 72, height: 72, background: 'rgba(16,185,129,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Check size={32} color="#10b981" />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Bill Split Created!</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, textAlign: 'center' }}>
        {fmt(parseFloat(totalAmount))} split {participants.length + 1} ways · {fmt(perPerson)} each
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>All participants have been notified</p>
      <button onClick={() => { setSuccess(false); setDescription(''); setTotalAmount(''); setParticipants([]); setTab('my'); }}
        style={{ marginTop: 32, background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', border: 'none', borderRadius: 14, padding: '14px 32px', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
        View My Bills
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
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Split Bill</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Divide expenses with others</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px' }}>
        {[
          { key: 'new', label: 'New Split' },
          { key: 'my', label: `My Bills (${mySplits.length})` },
          { key: 'incoming', label: `Owe Me${incomingSplits.filter(b => myStatusInBill(b) === 'pending').length > 0 ? ` (${incomingSplits.filter(b => myStatusInBill(b) === 'pending').length})` : ''}` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: '10px 6px', borderRadius: 12,
            background: tab === key ? 'rgba(124,58,237,0.2)' : 'var(--bg-card)',
            border: `1px solid ${tab === key ? 'rgba(124,58,237,0.5)' : 'var(--border)'}`,
            color: tab === key ? '#a78bfa' : 'var(--text-secondary)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: '0 20px' }}>
        {tab === 'new' && (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Description</p>
            <input style={{ ...inputStyle, marginBottom: 20 }} placeholder="e.g. Dinner at Rossi's"
              value={description} onChange={(e) => setDescription(e.target.value)} />

            <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Total Amount</p>
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--purple-light)', fontWeight: 700 }}>€</span>
              <input style={{ ...inputStyle, paddingLeft: 36, fontSize: 22, fontWeight: 700 }}
                placeholder="0.00" type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Add Participants</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <input style={{ ...inputStyle, flex: 1 }} placeholder="Search by name…" value={query}
                onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
              <button onClick={handleSearch} style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', border: 'none', borderRadius: 14, padding: '14px 16px', cursor: 'pointer' }}>
                <Search size={18} color="#fff" />
              </button>
            </div>

            {results.map((u) => (
              <button key={u.uid} onClick={() => addParticipant(u)} style={{
                width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer', marginBottom: 8, textAlign: 'left',
              }}>
                <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #7c3aed, #2d1b69)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{u.fullName[0]}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{u.fullName}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email}</p>
                </div>
                <Plus size={16} color="#a78bfa" />
              </button>
            ))}

            {participants.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #7c3aed, #2d1b69)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{userData?.fullName?.[0]}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{userData?.fullName} (You)</p>
                    </div>
                    {perPerson > 0 && <p style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>{fmt(perPerson)}</p>}
                  </div>
                  {participants.map((p, i) => (
                    <div key={p.uid} style={{
                      padding: '12px 16px',
                      borderBottom: i < participants.length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{ width: 36, height: 36, background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>{p.fullName[0]}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{p.fullName}</p>
                      </div>
                      {perPerson > 0 && <p style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa', marginRight: 8 }}>{fmt(perPerson)}</p>}
                      <button onClick={() => removeParticipant(p.uid)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <X size={16} color="var(--text-muted)" />
                      </button>
                    </div>
                  ))}
                </div>
                {perPerson > 0 && (
                  <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: '12px 16px', marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600 }}>{participants.length + 1} people · each pays</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#a78bfa' }}>{fmt(perPerson)}</p>
                  </div>
                )}
              </div>
            )}

            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', color: '#ef4444', fontSize: 14, marginBottom: 16 }}>{error}</div>}

            <button onClick={handleCreate} disabled={!description || !totalAmount || participants.length === 0 || loading} style={{
              width: '100%', background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', border: 'none',
              borderRadius: 14, padding: 16, color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: !description || !totalAmount || participants.length === 0 || loading ? 'not-allowed' : 'pointer',
              opacity: !description || !totalAmount || participants.length === 0 || loading ? 0.5 : 1,
            }}>{loading ? 'Creating…' : 'Split Bill'}</button>
          </>
        )}

        {tab === 'my' && (
          mySplits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Users size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>No split bills created yet</p>
            </div>
          ) : (
            mySplits.map((bill) => {
              const paidCount = bill.participants?.filter((p) => p.status === 'paid').length || 0;
              const total = bill.participants?.length || 0;
              return (
                <div key={bill.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 20px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{bill.description}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {bill.createdAt?.toDate?.()?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(bill.totalAmount)}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmt(bill.perPerson)} each</p>
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{paidCount}/{total} paid</span>
                      <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>{fmt(paidCount * bill.perPerson)} received</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${total > 0 ? (paidCount / total) * 100 : 0}%`, background: '#10b981', borderRadius: 2, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {bill.participants?.map((p) => (
                      <span key={p.uid} style={{
                        fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600,
                        background: p.status === 'paid' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                        color: p.status === 'paid' ? '#10b981' : '#f59e0b',
                        border: `1px solid ${p.status === 'paid' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                      }}>{p.name?.split(' ')[0]} {p.status === 'paid' ? '✓' : '·'}</span>
                    ))}
                  </div>
                </div>
              );
            })
          )
        )}

        {tab === 'incoming' && (
          incomingSplits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Users size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>No bills to pay</p>
            </div>
          ) : (
            incomingSplits.map((bill) => {
              const myStatus = myStatusInBill(bill);
              return (
                <div key={bill.id} style={{ background: 'var(--bg-card)', border: `1px solid ${myStatus === 'paid' ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`, borderRadius: 16, padding: '16px 20px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{bill.description}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>from {bill.creatorName}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(bill.perPerson)}</p>
                      <span style={{ fontSize: 11, fontWeight: 600, color: myStatus === 'paid' ? '#10b981' : '#f59e0b' }}>
                        {myStatus === 'paid' ? '✓ Paid' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  {myStatus === 'pending' && (
                    <button onClick={() => setPayModal(bill)} style={{
                      width: '100%', background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', border: 'none',
                      borderRadius: 10, padding: '10px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>Pay {fmt(bill.perPerson)}</button>
                  )}
                </div>
              );
            })
          )
        )}
      </div>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Pay Your Share">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(payModal?.perPerson)}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginTop: 8 }}>to {payModal?.creatorName}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>for "{payModal?.description}"</p>
        </div>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', color: '#ef4444', fontSize: 14, marginBottom: 16 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => { setPayModal(null); setError(''); }} style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 14, color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handlePay} disabled={loading} style={{ flex: 1, background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', border: 'none', borderRadius: 14, padding: 14, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
            {loading ? 'Paying…' : 'Confirm Pay'}
          </button>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
};

export default SplitBill;