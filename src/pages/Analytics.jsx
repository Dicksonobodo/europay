import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Target, TrendingDown, PieChart } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import useAuth from '../hooks/useAuth';
import { getDocs, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { CATEGORIES, getCategoryInfo } from '../utils/categories';
import { getBudgets, saveBudget } from '../firebase/firestore';
import BottomNav from '../components/ui/BottomNav';
import Modal from '../components/ui/Modal';

const Analytics = () => {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [tab, setTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [loading, setLoading] = useState(true);
  const [budgetModal, setBudgetModal] = useState(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(n || 0);

  useEffect(() => {
    if (!currentUser) return;
    const fetchAll = async () => {
      const snap = await getDocs(
        query(collection(db, 'users', currentUser.uid, 'transactions'), orderBy('date', 'desc'))
      );
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetchAll();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = getBudgets(currentUser.uid, setBudgets);
    return unsub;
  }, [currentUser]);

  // ── Compute this month's data ─────────────────────────────
  const now = new Date();
  const thisMonth = transactions.filter((tx) => {
    const d = tx.date?.toDate?.();
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const debits = thisMonth.filter((tx) => tx.type === 'debit');
  const credits = thisMonth.filter((tx) => tx.type === 'credit');
  const totalSpent = debits.reduce((s, tx) => s + tx.amount, 0);
  const totalReceived = credits.reduce((s, tx) => s + tx.amount, 0);

  // Category breakdown
  const categoryTotals = {};
  debits.forEach((tx) => {
    const { key } = getCategoryInfo(tx.description);
    categoryTotals[key] = (categoryTotals[key] || 0) + tx.amount;
  });
  const categoryData = Object.entries(categoryTotals)
    .map(([key, amount]) => ({ key, amount, ...CATEGORIES[key] }))
    .sort((a, b) => b.amount - a.amount);

  // Monthly history (last 6 months)
  const monthlyHistory = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const month = d.getMonth();
    const year = d.getFullYear();
    const txs = transactions.filter((tx) => {
      const td = tx.date?.toDate?.();
      return td && td.getMonth() === month && td.getFullYear() === year && tx.type === 'debit';
    });
    return {
      label: d.toLocaleDateString('en-GB', { month: 'short' }),
      amount: txs.reduce((s, tx) => s + tx.amount, 0),
    };
  }).reverse();

  const maxMonthly = Math.max(...monthlyHistory.map((m) => m.amount), 1);

  // Export CSV
  const handleExport = () => {
    const rows = [
      ['Date', 'Description', 'Type', 'Amount (EUR)', 'Category'],
      ...transactions.map((tx) => {
        const date = tx.date?.toDate?.()?.toLocaleDateString('en-GB') || '';
        const { label } = getCategoryInfo(tx.description);
        return [date, tx.description, tx.type, tx.amount.toFixed(2), label];
      }),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `europay-transactions-${now.getFullYear()}-${now.getMonth() + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveBudget = async () => {
    if (!budgetModal || !budgetAmount) return;
    setSavingBudget(true);
    await saveBudget(currentUser.uid, budgetModal, parseFloat(budgetAmount));
    setSavingBudget(false);
    setBudgetModal(null);
    setBudgetAmount('');
  };

  const inputStyle = {
    width: '100%', background: 'var(--bg-secondary)',
    border: '1px solid var(--border-light)', borderRadius: 14,
    padding: '14px 16px', color: 'var(--text-primary)', fontSize: 15,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 96 }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 10, cursor: 'pointer' }}>
            <ArrowLeft size={18} color="var(--text-secondary)" />
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Analytics</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Your spending insights</p>
          </div>
        </div>
        <button onClick={handleExport} style={{
          background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: 12, padding: '10px 14px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, color: '#a78bfa', fontSize: 13, fontWeight: 600,
        }}>
          <Download size={14} /> CSV
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px' }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'categories', label: 'Categories' },
          { key: 'budget', label: 'Budget' },
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
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>Loading…</p>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {tab === 'overview' && (
              <>
                {/* This month summary */}
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                  {now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <TrendingDown size={14} color="#ef4444" />
                      <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Spent</p>
                    </div>
                    <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(totalSpent)}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{debits.length} transactions</p>
                  </div>
                  <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <PieChart size={14} color="#10b981" />
                      <p style={{ fontSize: 11, color: '#10b981', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Received</p>
                    </div>
                    <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(totalReceived)}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{credits.length} transactions</p>
                  </div>
                </div>

                {/* Monthly spending bar chart */}
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>6-Month Spending</p>
                <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: '20px 16px', border: '1px solid var(--border)', marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
                    {monthlyHistory.map((m, i) => {
                      const isCurrentMonth = i === monthlyHistory.length - 1;
                      const heightPct = maxMonthly > 0 ? (m.amount / maxMonthly) * 100 : 0;
                      return (
                        <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                          <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>
                            {m.amount > 0 ? `€${Math.round(m.amount)}` : ''}
                          </p>
                          <div style={{
                            width: '100%', borderRadius: 6,
                            height: `${Math.max(heightPct, m.amount > 0 ? 4 : 0)}%`,
                            background: isCurrentMonth
                              ? 'linear-gradient(to top, #7c3aed, #a78bfa)'
                              : 'var(--bg-elevated)',
                            border: `1px solid ${isCurrentMonth ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`,
                            transition: 'height 0.3s',
                            minHeight: m.amount > 0 ? 4 : 0,
                          }} />
                          <p style={{ fontSize: 10, color: isCurrentMonth ? '#a78bfa' : 'var(--text-muted)', fontWeight: isCurrentMonth ? 700 : 400 }}>
                            {m.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top categories */}
                {categoryData.length > 0 && (
                  <>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>Top Categories</p>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
                      {categoryData.slice(0, 5).map((cat, i) => {
                        const pct = totalSpent > 0 ? (cat.amount / totalSpent) * 100 : 0;
                        return (
                          <div key={cat.key} style={{
                            padding: '14px 20px',
                            borderBottom: i < Math.min(categoryData.length, 5) - 1 ? '1px solid var(--border)' : 'none',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{cat.label}</span>
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(cat.amount)}</span>
                            </div>
                            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: 2, transition: 'width 0.3s' }} />
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{pct.toFixed(1)}% of spending</p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            {/* CATEGORIES TAB */}
            {tab === 'categories' && (
              <>
                {categoryData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 48 }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>No spending data this month</p>
                  </div>
                ) : (
                  <>
                    {/* Pie chart */}
                    <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: '20px', border: '1px solid var(--border)', marginBottom: 24 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Spending Breakdown</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
                        {now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                      </p>
                      <ResponsiveContainer width="100%" height={200}>
                        <RechartsPie>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            dataKey="amount"
                            paddingAngle={3}
                          >
                            {categoryData.map((entry) => (
                              <Cell key={entry.key} fill={entry.color} opacity={0.85} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v) => [fmt(v), 'Spent']}
                            contentStyle={{ background: '#13131f', border: '1px solid #1e1e30', borderRadius: 10, fontSize: 12 }}
                            labelStyle={{ color: '#9ca3af' }}
                          />
                        </RechartsPie>
                      </ResponsiveContainer>

                      {/* Legend */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        {categoryData.map((cat) => (
                          <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{cat.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Full category list */}
                    <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
                      {categoryData.map((cat, i) => (
                        <div key={cat.key} style={{
                          padding: '16px 20px',
                          borderBottom: i < categoryData.length - 1 ? '1px solid var(--border)' : 'none',
                          display: 'flex', alignItems: 'center', gap: 14,
                        }}>
                          <div style={{ width: 40, height: 40, background: cat.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${cat.border}`, flexShrink: 0 }}>
                            <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{cat.label}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              {debits.filter((tx) => getCategoryInfo(tx.description).key === cat.key).length} transactions
                            </p>
                          </div>
                          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(cat.amount)}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* BUDGET TAB */}
            {tab === 'budget' && (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
                  Set monthly spending limits per category. Tap any category to set a budget.
                </p>
                <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  {Object.entries(CATEGORIES)
                    .filter(([key]) => !['deposit', 'other'].includes(key))
                    .map(([key, cat], i, arr) => {
                      const spent = categoryTotals[key] || 0;
                      const budget = budgets[key];
                      const pct = budget ? Math.min((spent / budget) * 100, 100) : 0;
                      const overBudget = budget && spent > budget;
                      return (
                        <button
                          key={key}
                          onClick={() => { setBudgetModal(key); setBudgetAmount(budget ? String(budget) : ''); }}
                          style={{
                            width: '100%', background: 'none', border: 'none', textAlign: 'left',
                            borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                            padding: '16px 20px', cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: budget ? 10 : 0 }}>
                            <div style={{ width: 38, height: 38, background: cat.bg, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${cat.border}`, flexShrink: 0 }}>
                              <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{cat.label}</p>
                              {budget ? (
                                <p style={{ fontSize: 11, color: overBudget ? '#ef4444' : 'var(--text-muted)', marginTop: 1 }}>
                                  {fmt(spent)} of {fmt(budget)} {overBudget ? '⚠️ Over budget!' : ''}
                                </p>
                              ) : (
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                                  {spent > 0 ? `${fmt(spent)} spent · ` : ''}Tap to set budget
                                </p>
                              )}
                            </div>
                            {!budget && <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>+ Set</span>}
                            {budget && <span style={{ fontSize: 13, fontWeight: 700, color: overBudget ? '#ef4444' : 'var(--text-primary)' }}>{fmt(budget)}</span>}
                          </div>
                          {budget && (
                            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginLeft: 50 }}>
                              <div style={{
                                height: '100%', width: `${pct}%`,
                                background: overBudget ? '#ef4444' : pct > 80 ? '#f59e0b' : cat.color,
                                borderRadius: 2, transition: 'width 0.3s',
                              }} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Budget Modal */}
      <Modal open={!!budgetModal} onClose={() => setBudgetModal(null)} title={`Budget for ${budgetModal ? CATEGORIES[budgetModal]?.label : ''}`}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
          Set your monthly limit for this category.
        </p>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--purple-light)', fontWeight: 700 }}>€</span>
          <input
            style={{ ...inputStyle, paddingLeft: 36, fontSize: 20, fontWeight: 700 }}
            placeholder="0.00"
            type="number"
            value={budgetAmount}
            onChange={(e) => setBudgetAmount(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[100, 200, 500, 1000].map((v) => (
            <button key={v} onClick={() => setBudgetAmount(v.toString())} style={{
              flex: 1, background: budgetAmount === v.toString() ? 'rgba(124,58,237,0.2)' : 'var(--bg-elevated)',
              border: `1px solid ${budgetAmount === v.toString() ? 'rgba(124,58,237,0.5)' : 'var(--border)'}`,
              borderRadius: 10, padding: '8px 0',
              color: budgetAmount === v.toString() ? '#a78bfa' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>€{v}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setBudgetModal(null)} style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 14, color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSaveBudget} disabled={!budgetAmount || savingBudget} style={{
            flex: 1, background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', border: 'none',
            borderRadius: 14, padding: 14, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            opacity: !budgetAmount || savingBudget ? 0.5 : 1,
          }}>{savingBudget ? 'Saving…' : 'Save Budget'}</button>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
};

export default Analytics;
