import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Save, Loader2, GraduationCap, MapPin, Globe2, Building2, Calendar, Shield, Bell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';

const INTEREST_OPTIONS = [
  'Tech', 'Art', 'Music', 'Sports', 'Travel', 'Food', 'Gaming', 'Books',
  'Science', 'Business', 'Languages', 'Photography', 'Cooking', 'Fitness', 'Film'
];

const currentYear = new Date().getFullYear();
const INTAKE_YEARS = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i);

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const initialForm = useMemo(() => ({
    name:                  user?.name || '',
    university:            user?.university || '',
    campus:                user?.campus || '',
    intake_year:           user?.intake_year || '',
    course:                user?.course || '',
    city:                  user?.city || '',
    country:               user?.country || '',
    bio:                   user?.bio || '',
    interests:             user?.interests || [],
    contact_info: {
      phone:     user?.contact_info?.phone     || '',
      whatsapp:  user?.contact_info?.whatsapp  || '',
      instagram: user?.contact_info?.instagram || '',
      linkedin:  user?.contact_info?.linkedin  || '',
      telegram:  user?.contact_info?.telegram  || '',
      other:     user?.contact_info?.other     || '',
    },
    showEmailToConnections: user?.showEmailToConnections || false,
    emailNotifications:    user?.emailNotifications !== false,
  }), [user]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const toggleInterest = (interest) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter((i) => i !== interest)
        : [...f.interests, interest],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        intake_year: form.intake_year ? parseInt(form.intake_year) : null,
      };
      const { data } = await api.put('/auth/profile', payload);
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const gradients = ['linear-gradient(135deg,#7c3aed,#06b6d4)', 'linear-gradient(135deg,#ec4899,#8b5cf6)', 'linear-gradient(135deg,#10b981,#06b6d4)'];
  const grad = gradients[user?.name?.charCodeAt(0) % gradients.length];
  const completionChecks = [
    form.name,
    form.university,
    form.course,
    form.city,
    form.country,
    form.bio,
    form.interests?.length > 0,
  ];
  const completionPercent = Math.round(
    (completionChecks.filter(Boolean).length / completionChecks.length) * 100
  );

  return (
    <div className="profile-page">
      <div className="container profile-container">
        {/* Sidebar */}
        <aside className="profile-sidebar">
          <div className="profile-avatar-section">
            <div className="avatar avatar-xl" style={{ background: grad }}>{initials}</div>
            <h2 className="profile-name">{user?.name}</h2>
            <p className="profile-email">{user?.email}</p>
            {user?.university && (
              <div className="profile-meta-item"><GraduationCap size={14} />{user.university}{user.campus ? ` · ${user.campus}` : ''}</div>
            )}
            {(user?.city || user?.country) && (
              <div className="profile-meta-item"><MapPin size={14} />{[user.city, user.country].filter(Boolean).join(', ')}</div>
            )}
            {user?.intake_year && (
              <div className="profile-meta-item"><Calendar size={14} />Intake {user.intake_year}</div>
            )}
          </div>

          <nav className="profile-nav">
            <button className={`profile-nav-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
              <GraduationCap size={16} /> Edit Profile
            </button>
            <button className={`profile-nav-btn ${activeTab === 'privacy' ? 'active' : ''}`} onClick={() => setActiveTab('privacy')}>
              <Shield size={16} /> Privacy & Notifications
            </button>
          </nav>

          <button className="btn btn-ghost profile-logout" onClick={handleLogout}>
            <LogOut size={15} /> Sign Out
          </button>
        </aside>

        {/* Main */}
        <main className="profile-main">
          <div className="profile-completion card">
            <div className="profile-completion-top">
              <strong>Profile completeness</strong>
              <span>{completionPercent}%</span>
            </div>
            <div className="profile-completion-track">
              <span style={{ width: `${completionPercent}%` }} />
            </div>
            <p>Complete profile details to improve discovery matches and connection quality.</p>
          </div>

          <form onSubmit={handleSave}>
            {activeTab === 'profile' && (
              <div className="profile-section card">
                <h3 className="section-title">Your Profile</h3>
                <p className="section-sub">More complete = better suggestions for you</p>

                <div className="profile-fields">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input id="profile-name" className="form-input" value={form.name} onChange={set('name')} placeholder="Your full name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bio</label>
                    <textarea id="profile-bio" className="form-input form-textarea" value={form.bio} onChange={set('bio')} placeholder="Tell others a little about yourself..." maxLength={300} rows={3} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--t4)', textAlign: 'right', display: 'block', marginTop: 4 }}>{form.bio.length}/300</span>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label className="form-label"><GraduationCap size={13} /> University</label>
                      <input id="profile-university" className="form-input" value={form.university} onChange={set('university')} placeholder="Your university" />
                    </div>
                    <div className="form-group">
                      <label className="form-label"><Building2 size={13} /> Campus</label>
                      <input id="profile-campus" className="form-input" value={form.campus} onChange={set('campus')} placeholder="e.g. Main, North, City..." />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label className="form-label">Course / Major</label>
                      <input id="profile-course" className="form-input" value={form.course} onChange={set('course')} placeholder="e.g. Computer Science" />
                    </div>
                    <div className="form-group">
                      <label className="form-label"><Calendar size={13} /> Intake Year</label>
                      <select id="profile-intake" className="form-select" value={form.intake_year} onChange={set('intake_year')}>
                        <option value="">Select year</option>
                        {INTAKE_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label className="form-label"><MapPin size={13} /> City</label>
                      <input id="profile-city" className="form-input" value={form.city} onChange={set('city')} placeholder="Your current city" />
                    </div>
                    <div className="form-group">
                      <label className="form-label"><Globe2 size={13} /> Country</label>
                      <input id="profile-country" className="form-input" value={form.country} onChange={set('country')} placeholder="Your country" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Interests</label>
                    <div className="interests-grid">
                      {INTEREST_OPTIONS.map((i) => (
                        <span key={i} className={`tag tag-selectable ${form.interests.includes(i) ? 'selected' : ''}`} onClick={() => toggleInterest(i)}>{i}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="profile-section card">
                <h3 className="section-title">Contact Info</h3>
                <p className="section-sub">Shared with accepted connections only</p>
                <div className="profile-fields">
                  <div className="contact-info-grid">
                    <div className="form-group">
                      <label className="form-label">📱 WhatsApp</label>
                      <input className="form-input" value={form.contact_info.whatsapp} onChange={(e) => setForm((f) => ({ ...f, contact_info: { ...f.contact_info, whatsapp: e.target.value } }))} placeholder="+1234567890" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">📸 Instagram</label>
                      <input className="form-input" value={form.contact_info.instagram} onChange={(e) => setForm((f) => ({ ...f, contact_info: { ...f.contact_info, instagram: e.target.value } }))} placeholder="@handle" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">💼 LinkedIn</label>
                      <input className="form-input" value={form.contact_info.linkedin} onChange={(e) => setForm((f) => ({ ...f, contact_info: { ...f.contact_info, linkedin: e.target.value } }))} placeholder="linkedin.com/in/..." />
                    </div>
                    <div className="form-group">
                      <label className="form-label">✈️ Telegram</label>
                      <input className="form-input" value={form.contact_info.telegram} onChange={(e) => setForm((f) => ({ ...f, contact_info: { ...f.contact_info, telegram: e.target.value } }))} placeholder="@username" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="profile-section card">
                <h3 className="section-title">Privacy & Notifications</h3>
                <p className="section-sub">Control what others can see and how you're notified</p>

                <div className="privacy-items">
                  <div className="privacy-item">
                    <div className="privacy-item-info">
                      <h4>Show email to connections</h4>
                      <p>Your email will be visible to accepted connections only</p>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={form.showEmailToConnections} onChange={set('showEmailToConnections')} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  <div className="privacy-item">
                    <div className="privacy-item-info">
                      <h4>Email notifications</h4>
                      <p>Receive emails when someone sends you a connection request</p>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={form.emailNotifications} onChange={set('emailNotifications')} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>

                <div className="privacy-rules card" style={{ marginTop: 24, background: 'rgba(124,58,237,0.06)' }}>
                  <h4 style={{ marginBottom: 10, fontSize: '0.9rem' }}>🔒 Platform Privacy Rules</h4>
                  <ul className="privacy-list">
                    <li>Phone/email are hidden until connection is accepted</li>
                    <li>You can send up to 10 connection requests per day</li>
                    <li>Blocked users can't see your profile or send requests</li>
                    <li>Messages only open after mutual acceptance</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="profile-save-bar">
              <button id="profile-save" type="submit" className="btn btn-primary" disabled={loading || !hasChanges}>
                {loading ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                {loading ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
