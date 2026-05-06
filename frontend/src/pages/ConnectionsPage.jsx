import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Users, MessageCircle, UserMinus, GraduationCap,
  MapPin, Calendar, Loader2, Search, X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import './ConnectionsPage.css';

const GRADIENTS = [
  'linear-gradient(135deg,#6366f1,#0ea5e9)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#10b981,#06b6d4)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
];
const getGrad     = (name) => GRADIENTS[(name?.charCodeAt(0) ?? 0) % GRADIENTS.length];
const getInitials = (name) => name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';

export default function ConnectionsPage() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [removing,    setRemoving]    = useState(null);   // userId being removed
  const [confirmId,   setConfirmId]   = useState(null);   // userId awaiting confirmation
  const [search,      setSearch]      = useState('');

  const loadConnections = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users/connections');
      setConnections(data.connections);
    } catch {
      toast.error('Failed to load connections.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  const handleRemove = async (userId) => {
    setRemoving(userId);
    try {
      await api.delete(`/users/connections/${userId}`);
      setConnections((prev) => prev.filter((c) => c._id !== userId));
      toast.success('Connection removed.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove connection.');
    } finally {
      setRemoving(null);
      setConfirmId(null);
    }
  };

  const filtered = connections.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.university?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="connections-page">
      <div className="container">

        {/* Header */}
        <div className="connections-header">
          <div className="connections-title-group">
            <h1>
              <Users size={22} className="connections-title-icon" />
              My Connections
            </h1>
            {!loading && (
              <span className="connections-count">
                {connections.length} {connections.length === 1 ? 'connection' : 'connections'}
              </span>
            )}
          </div>
          <p className="connections-sub">
            Students you're connected with — message them or manage your network.
          </p>
        </div>

        {/* Search */}
        {connections.length > 0 && (
          <div className="connections-search-wrap">
            <Search size={15} className="connections-search-icon" />
            <input
              className="connections-search"
              placeholder="Search by name, university, or city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="connections-search-clear" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="connections-loading">
            <Loader2 size={28} className="spin" />
            <p>Loading your connections…</p>
          </div>
        ) : connections.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🤝</div>
            <h3>No connections yet</h3>
            <p>Discover students and send connection requests to grow your network.</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 20 }}
              onClick={() => navigate('/discover')}
            >
              Discover Students
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>No results for "{search}"</h3>
            <p>Try a different name, university, or city.</p>
          </div>
        ) : (
          <div className="connections-grid">
            {filtered.map((conn) => (
              <ConnectionCard
                key={conn._id}
                connection={conn}
                confirmId={confirmId}
                removing={removing}
                onMessage={() => navigate(`/chat/${conn._id}`)}
                onRemoveRequest={() => setConfirmId(conn._id === confirmId ? null : conn._id)}
                onRemoveConfirm={() => handleRemove(conn._id)}
                onRemoveCancel={() => setConfirmId(null)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Connection Card ───────────────────────────────────────────── */
function ConnectionCard({
  connection: c,
  confirmId, removing,
  onMessage, onRemoveRequest, onRemoveConfirm, onRemoveCancel,
}) {
  const isConfirming = confirmId === c._id;
  const isRemoving   = removing  === c._id;

  return (
    <div className={`connection-card card ${isConfirming ? 'confirming' : ''}`}>
      {/* Top row */}
      <div className="connection-card-top">
        <div className="connection-avatar-wrap">
          <div
            className="avatar avatar-lg"
            style={{ background: getGrad(c.name) }}
          >
            {getInitials(c.name)}
          </div>
        </div>

        <div className="connection-info">
          <h3 className="connection-name">{c.name}</h3>
          {c.course && <p className="connection-course">{c.course}</p>}

          <div className="connection-meta">
            {c.university && (
              <span className="meta-item">
                <GraduationCap size={12} />
                {c.university}{c.campus ? ` · ${c.campus}` : ''}
              </span>
            )}
            {(c.city || c.country) && (
              <span className="meta-item">
                <MapPin size={12} />
                {[c.city, c.country].filter(Boolean).join(', ')}
              </span>
            )}
            {c.connectedAt && (
              <span className="meta-item meta-since">
                <Calendar size={12} />
                Connected {formatDistanceToNow(new Date(c.connectedAt), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {c.bio && <p className="connection-bio">{c.bio}</p>}

      {/* Interests */}
      {c.interests?.length > 0 && (
        <div className="connection-interests">
          {c.interests.slice(0, 4).map((i) => (
            <span key={i} className="tag">{i}</span>
          ))}
          {c.interests.length > 4 && (
            <span className="tag">+{c.interests.length - 4}</span>
          )}
        </div>
      )}

      {/* Actions */}
      {isConfirming ? (
        <div className="connection-confirm">
          <p className="connection-confirm-msg">
            Remove <strong>{c.name.split(' ')[0]}</strong> from your connections?
          </p>
          <div className="connection-confirm-btns">
            <button className="btn btn-ghost btn-sm" onClick={onRemoveCancel}>
              Cancel
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={onRemoveConfirm}
              disabled={isRemoving}
            >
              {isRemoving
                ? <><Loader2 size={13} className="spin" /> Removing…</>
                : <><UserMinus size={13} /> Remove</>
              }
            </button>
          </div>
        </div>
      ) : (
        <div className="connection-actions">
          <button className="btn btn-primary connection-msg-btn" onClick={onMessage}>
            <MessageCircle size={14} /> Message
          </button>
          <button
            className="btn btn-ghost connection-remove-btn"
            onClick={onRemoveRequest}
            title="Remove connection"
          >
            <UserMinus size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
