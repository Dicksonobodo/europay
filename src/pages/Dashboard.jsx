import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, ArrowDownCircle, MessageCircle, TrendingUp } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import useUser from '../hooks/useUser';
import BankCard from '../components/dashboard/BankCard';
import TransactionItem from '../components/dashboard/TransactionItem';
import BalanceChart from '../components/dashboard/BalanceChart';
import BottomNav from '../components/ui/BottomNav';

const Dashboard = () => {
  const { userData } = useAuth();
  const { transactions, loading } = useUser();
  const navigate = useNavigate();

  const firstName = userData?.fullName?.split(' ')[0] || 'User';

  const actions = [
    { icon: ArrowLeftRight, label: 'Transfer', path: '/transfer', color: '#7c3aed' },
    { icon: ArrowDownCircle, label: 'Withdraw', path: '/withdraw', color: '#5b21b6' },
    { icon: MessageCircle, label: 'Support', path: '/support', color: '#4c1d95' },
    { icon: TrendingUp, label: 'Upgrade', action: () => navigate('/profile'), color: '#3b0764' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 96 }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>Good day,</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{firstName} 👋</h2>
          </div>
          <div style={{
            width: 42, height: 42,
            background: 'linear-gradient(135deg, #7c3aed, #2d1b69)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(124,58,237,0.3)',
          }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
              {firstName[0]?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Bank Card */}
        <BankCard balance={userData?.balance} cardNumber={userData?.cardNumber} fullName={userData?.fullName} />

        {/* Tier badge */}
        {userData?.tier === 1 && (
          <div style={{
            marginTop: 12,
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 12,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, color: '#f59e0b' }}>Tier 1 — Upgrade for withdrawals</span>
            <button onClick={() => navigate('/profile')} style={{
              background: 'rgba(245,158,11,0.2)', border: 'none', borderRadius: 8,
              padding: '4px 10px', color: '#f59e0b', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>Upgrade</button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '0 20px 24px' }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
          Quick Actions
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {actions.map(({ icon: Icon, label, path, action, color }) => (
            <button
              key={label}
              onClick={action || (() => navigate(path))}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '16px 8px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: 40, height: 40,
                background: `${color}22`,
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={18} color={color} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {transactions.length > 1 && (
        <div style={{ padding: '0 20px 24px' }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
            Balance Trend
          </p>
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: '16px', border: '1px solid var(--border)' }}>
            <BalanceChart transactions={transactions} />
          </div>
        </div>
      )}

      {/* Transactions */}
      <div style={{ padding: '0 20px' }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
          Recent Transactions
        </p>
        <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: '0 16px', border: '1px solid var(--border)' }}>
          {loading ? (
            <p style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>Loading…</p>
          ) : transactions.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No transactions yet</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Your activity will appear here</p>
            </div>
          ) : (
            transactions.map((tx) => <TransactionItem key={tx.id} tx={tx} />)
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
