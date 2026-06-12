import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Globe, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import './AuthPage.css';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    api.get(`/auth/verify-email/${token}`)
      .then(({ data }) => {
        setStatus('success');
        setMessage(data.message);
        // Auto-login after verification
        if (data.token && data.user) {
          login(data.user, data.token);
          // Redirect after a short delay so user sees the success message
          setTimeout(() => navigate('/discover'), 2000);
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The link may have expired.');
      });
  }, [token]);

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

        <div className="auth-card">
          <div className="auth-success">
            {status === 'verifying' && (
              <>
                <div className="auth-success-icon" style={{ background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.25)' }}>
                  <Loader2 size={32} className="spin" style={{ color: '#818cf8' }} />
                </div>
                <h2>Verifying your email…</h2>
                <p>Please wait while we activate your account.</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="auth-success-icon">
                  <CheckCircle size={32} style={{ color: '#10b981' }} />
                </div>
                <h2>Email Verified! 🎉</h2>
                <p>{message}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--t4)' }}>Redirecting you to the app…</p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="auth-success-icon" style={{ background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.25)' }}>
                  <XCircle size={32} style={{ color: '#ef4444' }} />
                </div>
                <h2>Verification Failed</h2>
                <p>{message}</p>
                <div className="auth-success-actions">
                  <Link to="/login" className="btn btn-primary">
                    Go to Login <ArrowRight size={14} />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
