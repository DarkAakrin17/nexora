import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Globe, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import './AuthPage.css';

export default function ResetPasswordPage() {
  const { token }             = useParams();
  const navigate              = useNavigate();
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Password must be at least 6 characters.');
    if (password !== confirm) return toast.error('Passwords do not match.');
    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset link is invalid or has expired.');
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
          {done ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <CheckCircle size={52} color="#10b981" style={{ marginBottom: 16 }} />
              <h2 style={{ fontSize: '1.4rem', marginBottom: 10 }}>Password reset!</h2>
              <p style={{ color: 'var(--t3)', fontSize: '0.88rem' }}>
                Redirecting you to login in a moment...
              </p>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div>
                <h2>Set new password</h2>
                <p className="auth-subtitle">Choose a strong password for your account.</p>
              </div>

              {/* New password */}
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="input-icon-wrap">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="form-input"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                  />
                  <button type="button" className="input-icon-btn" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="input-icon-wrap">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                  <button type="button" className="input-icon-btn" onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password strength hint */}
              {password.length > 0 && (
                <div style={{ fontSize: '0.75rem', color: password.length >= 8 ? '#10b981' : password.length >= 6 ? '#f59e0b' : '#ef4444' }}>
                  {password.length >= 8 ? '✅ Strong' : password.length >= 6 ? '⚠️ Acceptable — longer is better' : '❌ Too short'}
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? <><Lock size={15} className="spin" /> Resetting...</> : <><Lock size={15} /> Reset Password</>}
              </button>

              <div className="auth-switch">
                <Link to="/login">Back to Login</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
