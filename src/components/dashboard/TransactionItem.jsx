import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { getCategoryInfo } from '../../utils/categories';

const TransactionItem = ({ tx, onClick }) => {
  const isCredit = tx.type === 'credit';
  const fmt = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(n || 0);

  const date = tx.date?.toDate?.() || new Date();
  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const cat = getCategoryInfo(tx.description);
  const CatIcon = cat.icon;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 0',
        borderBottom: '1px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: isCredit ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{dateStr} · {timeStr}</p>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
            background: cat.bg, color: cat.color, border: `1px solid ${cat.border}`,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <CatIcon size={10} />
            {cat.label}
          </span>
        </div>
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