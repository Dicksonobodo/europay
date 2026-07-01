import { useEffect, useState } from 'react';
import { Bell, ArrowLeft, Check } from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../../firebase/firestore';
import useAuth from '../../../hooks/useAuth';

const NotificationCentre = ({ onBack }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // Set a timeout so it never loads forever
    const timeout = setTimeout(() => setLoading(false), 5000);

    const unsub = getNotifications(currentUser.uid, (data) => {
      clearTimeout(timeout);
      setNotifications(data);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, [currentUser]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (id) => {
    await markNotificationRead(currentUser.uid, id);
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead(currentUser.uid);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 40 }}>
      <div style={{ padding: '56px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0 }}>
          <button onClick={onBack} style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 10, cursor: 'pointer',
          }}>
            <ArrowLeft size={18} color="var(--text-secondary)" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Notifications</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {loading ? 'Loading…' : unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAll} style={{
              background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: 10, padding: '8px 12px',
              color: '#a78bfa', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Check size={12} /> Mark all read
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                background: 'var(--bg-card)', borderRadius: 16,
                padding: '16px 20px', border: '1px solid var(--border)',
                height: 80, opacity: 0.4,
              }} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--bg-elevated)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <Bell size={24} color="var(--text-muted)" />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600 }}>No notifications yet</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
              You'll be notified about transfers, upgrades, and account activity here.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && handleMarkRead(n.id)}
              style={{
                background: n.read ? 'var(--bg-card)' : 'rgba(124,58,237,0.08)',
                border: `1px solid ${n.read ? 'var(--border)' : 'rgba(124,58,237,0.25)'}`,
                borderRadius: 16, padding: '16px 20px', marginBottom: 10,
                cursor: n.read ? 'default' : 'pointer',
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}
            >
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                background: n.read ? 'transparent' : '#7c3aed',
                border: n.read ? '1px solid var(--border)' : 'none',
              }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {n.title}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {n.message}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  {n.createdAt?.toDate?.()?.toLocaleString('en-GB', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
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

export default NotificationCentre;