import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

const TransactionItem = ({ tx }) => {
  const isCredit = tx.type === 'credit';
  const fmt = (n) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);

  const date = tx.date?.toDate?.() || new Date();
  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 42, height: 42,
        borderRadius: 12,
        background: isCredit ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isCredit
          ? <ArrowDownLeft size={18} color="#10b981" />
          : <ArrowUpRight size={18} color="#ef4444" />
        }
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
          {tx.description}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{dateStr} · {timeStr}</p>
      </div>
      <p style={{
        fontSize: 15, fontWeight: 700,
        color: isCredit ? '#10b981' : '#ef4444',
      }}>
        {isCredit ? '+' : '-'}{fmt(tx.amount)}
      </p>
    </div>
  );
};

export default TransactionItem;
