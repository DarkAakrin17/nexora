import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Globe, Eye, EyeOff, Loader2 } from 'lucide-react';
import './AuthPage.css';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [resending, setResending] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.user, data.token);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate('/discover');
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.needsVerification) {
        setNeedsVerification(true);
        setVerifyEmail(resp.email);
        toast.error('Please verify your email first.');
      } else {
        toast.error(resp?.message || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email: verifyEmail });
      toast.success('Verification email sent! Check your inbox.');
    } catch {
      toast.error('Failed to resend. Try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>

      <div className="auth-container">
        <div className="auth-brand">
          <div className="brand-icon"><Globe size={28} /></div>
          <div>
            <h1 className="brand-title">Nex<span>ora</span></h1>
            <p className="brand-tagline">Connect with students worldwide</p>
          </div>
        </div>

        <div className="auth-card glass-card">
          {needsVerification ? (
            <div className="auth-success">
              <div className="auth-success-icon" style={{ background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.25)' }}>
                <span style={{ fontSize: '2rem' }}>📧</span>
              </div>
              <h2>Verify Your Email</h2>
              <p>Your account isn't verified yet. Check <strong style={{ color: 'var(--indigo-light)' }}>{verifyEmail}</strong> for the verification link.</p>
              <div className="auth-success-actions">
                <button className="btn btn-secondary" onClick={handleResend} disabled={resending}>
                  {resending ? <Loader2 size={14} className="spin" /> : null}
                  {resending ? 'Sending…' : 'Resend Verification'}
                </button>
                <button className="btn btn-ghost" onClick={() => setNeedsVerification(false)}>
                  ← Back to Login
                </button>
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <h2>Welcome Back</h2>
            <p className="auth-subtitle">Sign in to continue connecting</p>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input id="login-email" className="form-input" type="email" placeholder="you@university.edu"
                value={form.email} onChange={set('email')} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-icon-wrap">
                <input id="login-password" className="form-input" type={showPass ? 'text' : 'password'}
                  placeholder="Your password" value={form.password} onChange={set('password')} required />
                <button type="button" className="input-icon-btn" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-forgot">
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
            <button id="login-submit" type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? <Loader2 size={16} className="spin" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <p className="auth-switch">
              New to Nexora? <Link to="/signup">Create account</Link>
            </p>
          </form>
          )}
        </div>

        <div className="auth-features">
          {['🌍 Students from 100+ countries', '🔒 Privacy-first connections', '💬 Secure in-app messaging'].map((f) => (
            <div key={f} className="auth-feature-chip">{f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
