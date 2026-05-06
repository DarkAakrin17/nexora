import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import './AuthPage.css';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email.');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong.';
      // Show a friendly message for server-side email failures
      if (err.response?.status === 500) {
        toast.error('Email delivery failed. Please try again later or contact support.');
      } else if (err.response?.status === 429) {
        toast.error('Too many requests. Please wait 15 minutes and try again.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
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
        {/* Brand */}
        <div className="auth-brand">
          <div className="brand-icon"><Globe size={24} /></div>
          <div>
            <h1 className="brand-title">Nex<span>ora</span></h1>
            <p className="brand-tagline">Global student networking</p>
          </div>
        </div>

        <div className="auth-card">
          {sent ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <CheckCircle size={52} color="#10b981" style={{ marginBottom: 16 }} />
              <h2 style={{ fontSize: '1.4rem', marginBottom: 10 }}>Check your inbox</h2>
              <p style={{ color: 'var(--t3)', fontSize: '0.88rem', lineHeight: 1.65 }}>
                If an account with <strong style={{ color: 'var(--t2)' }}>{email}</strong> exists,
                we've sent a password reset link. It expires in <strong style={{ color: 'var(--t2)' }}>1 hour</strong>.
              </p>
              <p style={{ color: 'var(--t4)', fontSize: '0.78rem', marginTop: 12 }}>
                Check your spam/junk folder if you don't see it within a few minutes.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
                <Link to="/login" className="btn btn-primary btn-lg" style={{ display: 'inline-flex' }}>
                  <ArrowLeft size={16} /> Back to Login
                </Link>
                <button
                  type="button"
                  className="btn btn-secondary btn-lg"
                  style={{ display: 'inline-flex' }}
                  onClick={() => { setSent(false); setEmail(''); }}
                >
                  Try a different email
                </button>
              </div>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div>
                <h2>Forgot password?</h2>
                <p className="auth-subtitle">Enter your email and we'll send a reset link.</p>
              </div>

              <div className="form-group">
                <label className="form-label">Email address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? <span className="spin">⏳</span> : <Send size={16} />}
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <div className="auth-switch">
                <Link to="/login"><ArrowLeft size={13} style={{ verticalAlign: 'middle' }} /> Back to Login</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
