import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  // Don't do anything until Firebase confirms auth state
  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-primary)',
      flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 48, height: 48,
        border: '3px solid var(--purple-dark)',
        borderTop: '3px solid var(--purple-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Loading…</p>
    </div>
  );

  return currentUser ? children : <Navigate to="/" replace />;
};

export default PrivateRoute;