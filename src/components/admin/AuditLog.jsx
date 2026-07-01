import { useEffect, useState } from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { getAuditLog } from '../../firebase/firestore';

const AuditLog = ({ onBack }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 5000);
    const unsub = getAuditLog((data) => {
      setLogs(data);
      setLoading(false);
      clearTimeout(timeout);
    });
    return () => { unsub(); clearTimeout(timeout); };
  }, []);

  const actionColor = (action) => {
    if (action.includes('fund')) return '#10b981';
    if (action.includes('suspend')) return '#ef4444';
    if (action.includes('upgrade')) return '#a78bfa';
    if (action.includes('downgrade')) return '#f59e0b';
    if (action.includes('limit')) return '#3b82f6';
    return 'var(--text-secondary)';
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 40 }}>
      <div style={{ padding: '24px 20px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{
          background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: 12, padding: 10, cursor: 'pointer',
        }}>
          <ArrowLeft size={18} color="#a78bfa" />
        </button>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Audit Log</h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>All admin actions</p>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>Loading…</p>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Shield size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>No admin actions yet</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '14px 16px', marginBottom: 10,
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 6,
                background: actionColor(log.action),
              }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {log.action}
                </p>
                {log.targetName && (
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Target: {log.targetName}</p>
                )}
                {log.details && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{log.details}</p>
                )}
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {log.createdAt?.toDate?.()?.toLocaleString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AuditLog;