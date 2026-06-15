import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const BalanceChart = ({ transactions }) => {
  // Build running balance history from transactions (reversed = oldest first)
  const sorted = [...transactions].reverse();
  let running = 0;
  const data = sorted.map((tx) => {
    running += tx.type === 'credit' ? tx.amount : -tx.amount;
    const date = tx.date?.toDate?.() || new Date();
    return {
      name: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      balance: Math.max(0, running),
    };
  });

  if (data.length === 0) return null;

  return (
    <div style={{ width: '100%', height: 120 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ background: '#13131f', border: '1px solid #1e1e30', borderRadius: 10, fontSize: 12 }}
            labelStyle={{ color: '#9ca3af' }}
            itemStyle={{ color: '#a78bfa' }}
            formatter={(v) => [`€${v.toFixed(2)}`, 'Balance']}
          />
          <Area type="monotone" dataKey="balance" stroke="#7c3aed" strokeWidth={2} fill="url(#purpleGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BalanceChart;
