import { useEffect, useState } from 'react';
import { Monitor, Smartphone, ArrowLeft } from 'lucide-react';
import { getLoginActivity } from '../../../firebase/firestore';
import useAuth from '../../../hooks/useAuth';

const LoginActivity = ({ onBack }) => {
  const { currentUser } = useAuth();
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const timeout = setTimeout(() => setLoading(false), 5000);

    const unsub = getLoginActivity(currentUser.uid, (data) => {
      clearTimeout(timeout);
      setActivity(data);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, [currentUser]);

  const isMobile = (ua = '') => /android|iphone|ipad|mobile/i.test(ua);

  const getBrowser = (ua = '') => {
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Browser';
  };

  const getOS = (ua = '') => {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Unknown OS';
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 40 }}>
      <div style={{ padding: '56px 20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 10, cursor: 'pointer',
        }}>
          <ArrowLeft size={18} color="var(--text-secondary)" />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Login Activity</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Recent sign-in sessions</p>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                background: 'var(--bg-card)', borderRadius: 16,
                padding: '16px 20px', border: '1px solid var(--border)',
                height: 72, opacity: 0.4,
              }} />
            ))}
          </div>
        ) : activity.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--bg-elevated)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <Monitor size={24} color="var(--text-muted)" />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600 }}>No activity recorded yet</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
              Login sessions will appear here after your next sign in.
            </p>
          </div>
        ) : (
          activity.map((item, i) => {
            const ua = item.userAgent || '';
            const mobile = isMobile(ua);
            const time = item.timestamp?.toDate?.()?.toLocaleString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            }) || 'Unknown time';

            return (
              <div key={item.id} style={{
                background: 'var(--bg-card)',
                border: `1px solid ${i === 0 ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`,
                borderRadius: 16, padding: '16px 20px', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: i === 0 ? 'rgba(124,58,237,0.15)' : 'var(--bg-elevated)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${i === 0 ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`,
                }}>
                  {mobile
                    ? <Smartphone size={18} color={i === 0 ? '#a78bfa' : 'var(--text-secondary)'} />
                    : <Monitor size={18} color={i === 0 ? '#a78bfa' : 'var(--text-secondary)'} />
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {getBrowser(ua)} on {getOS(ua)}
                    </p>
                    {i === 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                        background: 'rgba(16,185,129,0.12)', color: '#10b981',
                        border: '1px solid rgba(16,185,129,0.3)',
                      }}>Current</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{time}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LoginActivity;