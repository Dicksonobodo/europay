import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, ArrowDownCircle, TrendingUp, Bell, HandCoins, Repeat, Users, BarChart2, ChevronRight } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import useUser from '../hooks/useUser';
import BankCard from '../components/dashboard/BankCard';
import TransactionItem from '../components/dashboard/TransactionItem';
import BalanceChart from '../components/dashboard/BalanceChart';
import BottomNav from '../components/ui/BottomNav';
import VerifyEmailBanner from '../components/admin/security/VerifyEmailBanner';
import NotificationCentre from '../components/admin/security/NotificationCentre';
import { getNotifications } from '../firebase/firestore';

const Dashboard = () => {
  const { userData, currentUser, refreshUserData } = useAuth();
  const { transactions, loading } = useUser();
  const navigate = useNavigate();
  const [showVerifyBanner, setShowVerifyBanner] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(null);

  const firstName = userData?.fullName?.split(' ')[0] || 'User';
  const emailVerified = currentUser?.emailVerified;

  useEffect(() => {
    if (!currentUser) return;
    const unsub = getNotifications(currentUser.uid, (notifs) => {
      setUnreadCount(notifs.filter((n) => !n.read).length);
    });
    return unsub;
  }, [currentUser]);

  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = async (e) => {
    if (!touchStartY.current) return;
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    if (diff > 80 && window.scrollY === 0) {
      setRefreshing(true);
      await refreshUserData();
      setTimeout(() => setRefreshing(false), 800);
    }
    touchStartY.current = null;
  };

  if (showNotifications) return <NotificationCentre onBack={() => setShowNotifications(false)} />;

  const actions = [
    { icon: ArrowLeftRight, label: 'Transfer', path: '/transfer', color: '#7c3aed' },
    { icon: ArrowDownCircle, label: 'Withdraw', path: '/withdraw', color: '#5b21b6' },
    { icon: HandCoins, label: 'Request', path: '/request', color: '#6d28d9' },
    { icon: Repeat, label: 'Schedule', path: '/scheduled', color: '#4c1d95' },
    { icon: Users, label: 'Split Bill', path: '/split', color: '#3b0764' },
    { icon: BarChart2, label: 'Analytics', path: '/analytics', color: '#7c3aed' },
    { icon: TrendingUp, label: 'Upgrade', action: () => navigate('/profile'), color: '#5b21b6' },
  ];

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 96 }}
    >
      {refreshing && (
        <div style={{
          position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, background: 'rgba(124,58,237,0.9)',
          borderRadius: '0 0 12px 12px', padding: '8px 20px',
        }}>
          <p style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>Refreshing…</p>
        </div>
      )}

      <div style={{ padding: '56px 20px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>Good day,</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{firstName} 👋</h2>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => setShowNotifications(true)} style={{
              position: 'relative', background: 'var(--bg-elevated)',
              border: '1px solid var(--border)', borderRadius: 12,
              width: 42, height: 42, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer',
            }}>
              <Bell size={18} color="var(--text-secondary)" />
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute', top: -4, right: -4, background: '#ef4444',
                  borderRadius: '50%', width: 16, height: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: '#fff',
                  border: '2px solid var(--bg-primary)',
                }}>{unreadCount > 9 ? '9+' : unreadCount}</div>
              )}
            </button>
            <div style={{
              width: 42, height: 42,
              background: 'linear-gradient(135deg, #7c3aed, #2d1b69)',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(124,58,237,0.3)',
            }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{firstName[0]?.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {userData?.isFrozen && (
          <div style={{ marginBottom: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '10px 16px' }}>
            <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>🔒 Your card is frozen — transactions are blocked</p>
          </div>
        )}
        {userData?.isSuspended && (
          <div style={{ marginBottom: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '10px 16px' }}>
            <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>⛔ Your account is suspended. Contact support.</p>
          </div>
        )}

        <BankCard balance={userData?.balance} cardNumber={userData?.cardNumber} fullName={userData?.fullName} isFrozen={userData?.isFrozen} />

        {userData?.tier === 1 && (
          <div style={{ marginTop: 12, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#f59e0b' }}>Tier 1 — Upgrade for withdrawals</span>
            <button onClick={() => navigate('/profile')} style={{ background: 'rgba(245,158,11,0.2)', border: 'none', borderRadius: 8, padding: '4px 10px', color: '#f59e0b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Upgrade</button>
          </div>
        )}
      </div>

      {!emailVerified && showVerifyBanner && (
        <VerifyEmailBanner onDismiss={() => setShowVerifyBanner(false)} />
      )}

      {/* Quick Actions */}
      <div style={{ padding: '0 20px 24px' }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>Quick Actions</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {actions.map(({ icon: Icon, label, path, action, color }) => (
            <button key={label} onClick={action || (() => navigate(path))} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '14px 6px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
            }}>
              <div style={{ width: 38, height: 38, background: `${color}22`, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={17} color={color} />
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Balance Trend */}
      {transactions.length > 1 && (
        <div style={{ padding: '0 20px 24px' }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>Balance Trend</p>
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 16, border: '1px solid var(--border)' }}>
            <BalanceChart transactions={transactions} />
          </div>
        </div>
      )}

      {/* Recent Transactions — only 2 */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
            Recent Transactions
          </p>
          <button onClick={() => navigate('/transactions')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
            color: '#a78bfa', fontSize: 13, fontWeight: 600,
          }}>
            View All <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {loading ? (
            <p style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>Loading…</p>
          ) : transactions.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No transactions yet</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Your activity will appear here</p>
            </div>
          ) : (
            <>
              <div style={{ padding: '0 16px' }}>
                {transactions.map((tx) => (
                  <TransactionItem key={tx.id} tx={tx} onClick={() => navigate('/transactions', { state: { openTx: tx } })} />
                ))}
              </div>
              {/* View all button at bottom */}
              <button onClick={() => navigate('/transactions')} style={{
                width: '100%', background: 'var(--bg-elevated)',
                border: 'none', borderTop: '1px solid var(--border)',
                padding: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                color: '#a78bfa', fontSize: 13, fontWeight: 600,
              }}>
                View All Transactions <ChevronRight size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;