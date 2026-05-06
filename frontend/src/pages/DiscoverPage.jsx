import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ConnectModal from '../components/ConnectModal';
import {
  SlidersHorizontal, MapPin, GraduationCap, Building2,
  UserPlus, Users, X, ChevronDown, Loader2, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import './DiscoverPage.css';

const GRADIENTS = [
  'linear-gradient(135deg,#7c3aed,#06b6d4)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#10b981,#06b6d4)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#3b82f6,#8b5cf6)',
];
const getGrad = (name) => GRADIENTS[name?.charCodeAt(0) % GRADIENTS.length];
const getInitials = (name) => name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

export default function DiscoverPage() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [suggestLoading, setSuggestLoading] = useState(true);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [connectTarget, setConnectTarget] = useState(null);
  const [sentRequests, setSentRequests]   = useState(new Set());
  const [filterOptions, setFilterOptions] = useState({ universities: [], campuses: [], cities: [], countries: [] });
  const [showFilters, setShowFilters]     = useState(false);
  const [filters, setFilters]   = useState({ university: '', campus: '', city: '', country: '' });
  const [applied, setApplied]   = useState({});

  // Load filter options + outgoing requests + suggestions on mount
  useEffect(() => {
    api.get('/users/filter-options').then(({ data }) => setFilterOptions(data)).catch(() => {});
    api.get('/requests/outgoing').then(({ data }) => {
      const ids = new Set(
        data.requests.filter((r) => r.status === 'pending').map((r) => r.to_user._id)
      );
      setSentRequests(ids);
    }).catch(() => {});
    api.get('/users/suggestions')
      .then(({ data }) => setSuggestions(data.suggestions))
      .catch(() => {})
      .finally(() => setSuggestLoading(false));
  }, []);

  const fetchUsers = useCallback(async (currentPage = 1, currentFilters = applied) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: currentPage, limit: 12 });
      Object.entries(currentFilters).forEach(([k, v]) => v && params.set(k, v));
      const { data } = await api.get(`/users?${params}`);
      // Bug fix: use functional updater correctly for load-more pagination
      setUsers((prev) => currentPage === 1 ? data.users : [...prev, ...data.users]);
      setTotalPages(data.pages);
      setPage(currentPage);
    } catch {
      toast.error('Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, [applied]);

  // Bug fix: include fetchUsers in dep array
  useEffect(() => { fetchUsers(1); }, [applied, fetchUsers]);

  const applyFilters = () => { setApplied({ ...filters }); setShowFilters(false); };
  const clearFilters = () => { setFilters({ university: '', campus: '', city: '', country: '' }); setApplied({}); };
  const activeFilterCount = Object.values(applied).filter(Boolean).length;
  const activeFilterEntries = Object.entries(applied).filter(([, value]) => Boolean(value));

  const removeAppliedFilter = (key) => {
    setFilters((prev) => ({ ...prev, [key]: '' }));
    setApplied((prev) => ({ ...prev, [key]: '' }));
  };

  const handleConnectSuccess = (targetId) => {
    setSentRequests((prev) => new Set([...prev, targetId]));
    // Refresh suggestions to remove this person
    api.get('/users/suggestions').then(({ data }) => setSuggestions(data.suggestions)).catch(() => {});
  };

  const profileComplete = user?.university || user?.city || user?.interests?.length > 0;

  return (
    <div className="discover-page">
      <div className="container">

        {/* ── Suggested Connections ── */}
        {!suggestLoading && (
          <>
            {!profileComplete ? (
              <div className="suggest-nudge">
                <Sparkles size={18} />
                <span>Complete your profile to get <strong>smart suggestions</strong> — same university, city, interests & more.</span>
                <a href="/profile" className="btn btn-primary btn-sm">Complete Profile</a>
              </div>
            ) : suggestions.length > 0 && (
              <section className="suggest-section">
                <div className="suggest-header">
                  <div className="suggest-title">
                    <Sparkles size={18} className="suggest-icon" />
                    <h2>Suggested for You</h2>
                  </div>
                  <p className="suggest-sub">Matched by university, campus, intake year, city & interests</p>
                </div>
                <div className="suggest-scroll">
                  {suggestions.map((u) => (
                    <SuggestionCard
                      key={u._id}
                      user={u}
                      hasPendingRequest={sentRequests.has(u._id)}
                      onConnect={() => setConnectTarget(u)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── All Students ── */}
        <div className="discover-header">
          <div>
            <h1 className="discover-title">All Students <span>Worldwide</span></h1>
            <p className="discover-sub">
              Browse and connect with international students
              {users.length > 0 ? ` · ${users.length} shown${page < totalPages ? ' (more available)' : ''}` : ''}
            </p>
          </div>
          <button
            id="toggle-filters"
            className={`btn btn-secondary ${activeFilterCount > 0 ? 'filter-active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={16} />
            Filters {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
            <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: showFilters ? 'rotate(180deg)' : 'none' }} />
          </button>
        </div>

        {activeFilterEntries.length > 0 && (
          <div className="applied-filters" aria-label="Active filters">
            {activeFilterEntries.map(([key, value]) => (
              <button
                key={key}
                type="button"
                className="applied-filter-chip"
                onClick={() => removeAppliedFilter(key)}
                title={`Remove ${key} filter`}
              >
                <span className="chip-label">{key.replace('_', ' ')}</span>
                <span className="chip-value">{value}</span>
                <X size={12} />
              </button>
            ))}
          </div>
        )}

        {showFilters && (
          <div className="filter-panel glass-card">
            <div className="filter-grid">
              <div className="form-group">
                <label className="form-label">🎓 University</label>
                <input className="form-input" placeholder="Filter by university..."
                  value={filters.university} onChange={(e) => setFilters((f) => ({ ...f, university: e.target.value }))}
                  list="univ-list" />
                <datalist id="univ-list">{filterOptions.universities.map((u) => <option key={u} value={u} />)}</datalist>
              </div>
              <div className="form-group">
                <label className="form-label">🏛️ Campus</label>
                <input className="form-input" placeholder="Filter by campus..."
                  value={filters.campus} onChange={(e) => setFilters((f) => ({ ...f, campus: e.target.value }))}
                  list="campus-list" />
                <datalist id="campus-list">{filterOptions.campuses?.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="form-group">
                <label className="form-label">📍 City</label>
                <input className="form-input" placeholder="Filter by city..."
                  value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
                  list="city-list" />
                <datalist id="city-list">{filterOptions.cities.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="form-group">
                <label className="form-label">🌍 Country</label>
                <input className="form-input" placeholder="Filter by country..."
                  value={filters.country} onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
                  list="country-list" />
                <datalist id="country-list">{filterOptions.countries.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
            </div>
            <div className="filter-actions">
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}><X size={14} /> Clear</button>
              <button id="apply-filters" className="btn btn-primary btn-sm" onClick={applyFilters}>Apply Filters</button>
            </div>
          </div>
        )}

        {loading && page === 1 ? (
          <div className="user-grid">{Array(8).fill(0).map((_, i) => <UserCardSkeleton key={i} />)}</div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🌍</div>
            <h3>No students found</h3>
            <p>Try adjusting your filters or check back later</p>
            {activeFilterCount > 0 && (
              <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={clearFilters}>Clear Filters</button>
            )}
          </div>
        ) : (
          <>
            <div className="user-grid">
              {users.map((u) => (
                <UserCard
                  key={u._id}
                  user={u}
                  isSelf={u._id === user._id}
                  hasPendingRequest={sentRequests.has(u._id)}
                  onConnect={() => setConnectTarget(u)}
                />
              ))}
            </div>
            {page < totalPages && (
              <div className="load-more">
                <button className="btn btn-secondary" onClick={() => fetchUsers(page + 1)} disabled={loading}>
                  {loading ? <Loader2 size={16} className="spin" /> : null} Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {connectTarget && (
        <ConnectModal
          user={connectTarget}
          onClose={() => setConnectTarget(null)}
          onSuccess={() => handleConnectSuccess(connectTarget._id)}
        />
      )}
    </div>
  );
}

// ── Suggestion Card (horizontal scroll) ─────────────────────────────────────
function SuggestionCard({ user, hasPendingRequest, onConnect }) {
  return (
    <div className="suggest-card card">
      <div className="suggest-card-top">
        <div className="avatar avatar-md" style={{ background: getGrad(user.name) }}>
          {getInitials(user.name)}
        </div>
        <div className="suggest-card-info">
          <span className="suggest-card-name">{user.name}</span>
          {user.course && <span className="suggest-card-course">{user.course}</span>}
        </div>
      </div>

      {/* Match reason badges */}
      <div className="suggest-reasons">
        {user.reasons?.slice(0, 3).map((r) => (
          <span key={r} className="suggest-reason-badge">{r}</span>
        ))}
      </div>

      <div className="suggest-card-meta">
        {user.university && <span><GraduationCap size={12} />{user.university}{user.campus ? ` · ${user.campus}` : ''}</span>}
        {(user.city || user.country) && <span><MapPin size={12} />{[user.city, user.country].filter(Boolean).join(', ')}</span>}
      </div>

      {hasPendingRequest ? (
        <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 'auto' }} disabled>
          <Users size={13} /> Sent
        </button>
      ) : (
        <button id={`suggest-connect-${user._id}`} className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 'auto' }} onClick={onConnect}>
          <UserPlus size={13} /> Connect
        </button>
      )}
    </div>
  );
}

// ── Full User Card (grid) ────────────────────────────────────────────────────
function UserCard({ user, isSelf, hasPendingRequest, onConnect }) {
  return (
    <div className="user-card card">
      <div className="user-card-top">
        <div className="avatar avatar-lg" style={{ background: getGrad(user.name) }}>
          {getInitials(user.name)}
        </div>
        <div className="user-card-info">
          <h3 className="user-card-name">{user.name}</h3>
          {user.course && <p className="user-card-course">{user.course}</p>}
        </div>
      </div>

      <div className="user-card-meta">
        {user.university && (
          <span className="meta-item">
            <GraduationCap size={13} />
            {user.university}{user.campus ? ` · ${user.campus}` : ''}
          </span>
        )}
        {(user.city || user.country) && (
          <span className="meta-item"><MapPin size={13} />{[user.city, user.country].filter(Boolean).join(', ')}</span>
        )}
        {user.intake_year && (
          <span className="meta-item"><Building2 size={13} />Intake {user.intake_year}</span>
        )}
      </div>

      {user.bio && <p className="user-card-bio">{user.bio}</p>}

      {user.interests?.length > 0 && (
        <div className="user-card-interests">
          {user.interests.slice(0, 3).map((i) => <span key={i} className="tag">{i}</span>)}
          {user.interests.length > 3 && <span className="tag">+{user.interests.length - 3}</span>}
        </div>
      )}

      <div className="user-card-footer">
        {isSelf ? (
          <span className="badge badge-primary" style={{ width: '100%', justifyContent: 'center', padding: '8px' }}>That's you!</span>
        ) : hasPendingRequest ? (
          <button className="btn btn-secondary" style={{ width: '100%' }} disabled>
            <Users size={15} /> Request Sent
          </button>
        ) : (
          <button id={`connect-${user._id}`} className="btn btn-primary" style={{ width: '100%' }} onClick={onConnect}>
            <UserPlus size={15} /> Connect
          </button>
        )}
      </div>
    </div>
  );
}

function UserCardSkeleton() {
  return (
    <div className="user-card card">
      <div className="user-card-top">
        <div className="skeleton" style={{ width: 64, height: 64, borderRadius: '50%' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="skeleton" style={{ height: 18, width: '70%', borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 13, width: '50%', borderRadius: 6 }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: 13, width: '80%', borderRadius: 6, marginTop: 12 }} />
      <div className="skeleton" style={{ height: 13, width: '60%', borderRadius: 6, marginTop: 6 }} />
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <div className="skeleton" style={{ height: 26, width: 60, borderRadius: 20 }} />
        <div className="skeleton" style={{ height: 26, width: 70, borderRadius: 20 }} />
      </div>
      <div className="skeleton" style={{ height: 38, borderRadius: 10, marginTop: 16 }} />
    </div>
  );
}
