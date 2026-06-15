import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { registerUser } from '../firebase/auth';
import Button from '../components/ui/Button';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputStyle = {
    width: '100%', background: 'var(--bg-secondary)',
    border: '1px solid var(--border-light)', borderRadius: 14,
    padding: '15px 16px', color: 'var(--text-primary)', fontSize: 15,
  };

  const handleRegister = async () => {
    setError('');
    if (!form.fullName || !form.email || !form.password) {
      setError('Please fill all fields'); return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters'); return;
    }
    setLoading(true);
    try {
      await registerUser(form.email, form.password, form.fullName);
      navigate('/dashboard');
    } catch (e) {
      setError(e.message.replace('Firebase: ', ''));
    }
    setLoading(false);
  };

  const strength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const strengthColors = ['transparent', '#ef4444', '#f59e0b', '#10b981'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Strong'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '0 24px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '56px 0 32px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 10, cursor: 'pointer' }}>
          <ArrowLeft size={18} color="var(--text-secondary)" />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Create Account</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Join Europay today</p>
        </div>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>FULL NAME</label>
          <input style={inputStyle} placeholder="John Doe" value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>EMAIL</label>
          <input style={inputStyle} placeholder="you@example.com" type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>PASSWORD</label>
          <div style={{ position: 'relative' }}>
            <input style={{ ...inputStyle, paddingRight: 50 }} placeholder="Min. 6 characters"
              type={showPass ? 'text' : 'password'} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button onClick={() => setShowPass(!showPass)} style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
            }}>
              {showPass ? <EyeOff size={18} color="var(--text-secondary)" /> : <Eye size={18} color="var(--text-secondary)" />}
            </button>
          </div>
          {form.password.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= strength ? strengthColors[strength] : 'var(--border-light)', transition: 'all 0.3s' }} />
                ))}
              </div>
              <span style={{ fontSize: 11, color: strengthColors[strength] }}>{strengthLabels[strength]}</span>
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', color: '#ef4444', fontSize: 14 }}>
            {error}
          </div>
        )}

        <Button onClick={handleRegister} disabled={loading} fullWidth style={{ marginTop: 8 }}>
          {loading ? 'Creating Account…' : 'Create Account'}
        </Button>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--purple-light)', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
