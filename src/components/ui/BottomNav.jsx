import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeftRight, ArrowDownCircle, User } from 'lucide-react';

const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tabs = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: ArrowLeftRight, label: 'Transfer', path: '/transfer' },
    { icon: ArrowDownCircle, label: 'Withdraw', path: '/withdraw' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 430,
      background: 'rgba(13,13,26,0.95)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      justifyContent: 'flex-start',
      alignItems: 'center',
      padding: '10px 0 20px 12px',
      zIndex: 100,
    }}>
      {tabs.map(({ icon: Icon, label, path }) => {
        const active = pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 18px',
              borderRadius: 12,
              transition: 'all 0.2s',
            }}
          >
            <div style={{
              width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 12,
              background: active ? 'rgba(124,58,237,0.2)' : 'transparent',
              transition: 'all 0.2s',
            }}>
              <Icon size={20} color={active ? '#a78bfa' : '#4b5563'} />
            </div>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: active ? '#a78bfa' : '#4b5563',
              letterSpacing: 0.5,
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;