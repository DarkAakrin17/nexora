import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Globe, Eye, EyeOff, Loader2 } from 'lucide-react';
import './AuthPage.css';

const INTEREST_OPTIONS = [
  'Tech', 'Art', 'Music', 'Sports', 'Travel', 'Food', 'Gaming', 'Books',
  'Science', 'Business', 'Languages', 'Photography', 'Cooking', 'Fitness', 'Film'
];

const currentYear = new Date().getFullYear();
const INTAKE_YEARS = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i);

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    university: '', campus: '', course: '',
    city: '', country: '', intake_year: '', interests: []
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const toggleInterest = (interest) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter((i) => i !== interest)
        : [...f.interests, interest],
    }));
  };

  const handleStep1 = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill all required fields.'); return;
    }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        intake_year: form.intake_year ? parseInt(form.intake_year) : undefined,
      };
      const { data } = await api.post('/auth/signup', payload);
      login(data.user, data.token);
      toast.success(`Welcome to Nexora, ${data.user.name}! 🌍`);
      navigate('/discover');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed.');
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
        <div className="auth-brand">
          <div className="brand-icon"><Globe size={28} /></div>
          <div>
            <h1 className="brand-title">Nex<span>ora</span></h1>
            <p className="brand-tagline">Connect with students worldwide</p>
          </div>
        </div>

        <div className="auth-card glass-card">
          <div className="auth-steps">
            <div className={`auth-step ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className={`auth-step-line ${step >= 2 ? 'active' : ''}`} />
            <div className={`auth-step ${step >= 2 ? 'active' : ''}`}>2</div>
          </div>

          {step === 1 ? (
            <form onSubmit={handleStep1} className="auth-form">
              <h2>Create Your Account</h2>
              <p className="auth-subtitle">Join thousands of students globally</p>

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input id="signup-name" className="form-input" placeholder="Your full name" value={form.name} onChange={set('name')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input id="signup-email" className="form-input" type="email" placeholder="you@university.edu" value={form.email} onChange={set('email')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <div className="input-icon-wrap">
                  <input id="signup-password" className="form-input" type={showPass ? 'text' : 'password'} placeholder="Min. 6 characters" value={form.password} onChange={set('password')} required />
                  <button type="button" className="input-icon-btn" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button id="signup-next" type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }}>
                Continue →
              </button>
              <p className="auth-switch">
                Already have an account? <Link to="/login">Sign in</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <h2>Complete Your Profile</h2>
              <p className="auth-subtitle">Helps with smarter matching — all optional</p>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">University</label>
                  <input id="signup-university" className="form-input" placeholder="e.g. MIT, Sorbonne..." value={form.university} onChange={set('university')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Campus</label>
                  <input id="signup-campus" className="form-input" placeholder="e.g. Main, North..." value={form.campus} onChange={set('campus')} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Course / Major</label>
                  <input id="signup-course" className="form-input" placeholder="e.g. Computer Science" value={form.course} onChange={set('course')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Intake Year</label>
                  <select id="signup-intake" className="form-select" value={form.intake_year} onChange={set('intake_year')}>
                    <option value="">Select year</option>
                    {INTAKE_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input id="signup-city" className="form-input" placeholder="e.g. Paris, London..." value={form.city} onChange={set('city')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input id="signup-country" className="form-input" placeholder="e.g. France, UK, USA..." value={form.country} onChange={set('country')} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Interests (select all that apply)</label>
                <div className="interests-grid">
                  {INTEREST_OPTIONS.map((i) => (
                    <span key={i} className={`tag tag-selectable ${form.interests.includes(i) ? 'selected' : ''}`} onClick={() => toggleInterest(i)}>{i}</span>
                  ))}
                </div>
              </div>

              <div className="auth-step-btns">
                <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                <button id="signup-submit" type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <Loader2 size={16} className="spin" /> : null}
                  {loading ? 'Creating...' : 'Join Nexora 🌍'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
