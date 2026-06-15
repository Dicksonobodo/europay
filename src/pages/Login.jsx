import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { loginUser } from '../firebase/auth';
import Button from '../components/ui/Button';

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputStyle = {
    width: '100%', background: 'var(--bg-secondary)',
    border: '1px solid var(--border-light)', borderRadius: 14,
    padding: '15px 16px', color: 'var(--text-primary)', fontSize: 15,
  };

  const handleLogin = async () => {
    setError('');
    if (!form.email || !form.password) { setError('Please fill all fields'); return; }
    setLoading(true);
    try {
      await loginUser(form.email, form.password);
      navigate('/dashboard');
    } catch (e) {
      setError('Invalid email or password');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '0 24px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '56px 0 32px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 10, cursor: 'pointer' }}>
          <ArrowLeft size={18} color="var(--text-secondary)" />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Welcome Back</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Sign in to Europay</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>EMAIL</label>
          <input style={inputStyle} placeholder="you@example.com" type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>PASSWORD</label>
          <div style={{ position: 'relative' }}>
            <input style={{ ...inputStyle, paddingRight: 50 }} placeholder="Your password"
              type={showPass ? 'text' : 'password'} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
            <button onClick={() => setShowPass(!showPass)} style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
            }}>
              {showPass ? <EyeOff size={18} color="var(--text-secondary)" /> : <Eye size={18} color="var(--text-secondary)" />}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', color: '#ef4444', fontSize: 14 }}>
            {error}
          </div>
        )}

        <Button onClick={handleLogin} disabled={loading} fullWidth style={{ marginTop: 8 }}>
          {loading ? 'Signing In…' : 'Sign In'}
        </Button>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--purple-light)', fontWeight: 600, textDecoration: 'none' }}>Create one</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
