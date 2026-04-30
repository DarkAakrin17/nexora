import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Check, X, Clock, Send, Trash2, GraduationCap, MapPin, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import './RequestsPage.css';

export default function RequestsPage() {
  const [tab, setTab] = useState('incoming');
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Handle email action links: ?action=accept&requestId=xxx
    const action = searchParams.get('action');
    const requestId = searchParams.get('requestId');
    if (action && requestId) {
      if (action === 'accept') handleAccept(requestId);
      else if (action === 'reject') handleReject(requestId);
    }
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [incRes, outRes] = await Promise.all([
        api.get('/requests/incoming'),
        api.get('/requests/outgoing'),
      ]);
      setIncoming(incRes.data.requests);
      setOutgoing(outRes.data.requests);
    } catch {
      toast.error('Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAccept = async (id) => {
    setActionLoading(id);
    try {
      await api.patch(`/requests/${id}/accept`);
      toast.success('Connection accepted! You can now chat. 🎉');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await api.patch(`/requests/${id}/reject`);
      toast.success('Request declined.');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleWithdraw = async (id) => {
    setActionLoading(id);
    try {
      await api.delete(`/requests/${id}`);
      toast.success('Request withdrawn.');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to withdraw.');
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status) => {
    if (status === 'pending') return <span className="badge badge-warning"><Clock size={11} /> Pending</span>;
    if (status === 'accepted') return <span className="badge badge-success"><Check size={11} /> Accepted</span>;
    return <span className="badge badge-danger"><X size={11} /> Declined</span>;
  };

  return (
    <div className="requests-page">
      <div className="container">
        <div className="requests-header">
          <h1>Connections</h1>
          <p className="requests-sub">Manage your connection requests</p>
        </div>

        <div className="requests-tabs">
          <button
            id="tab-incoming"
            className={`tab-btn ${tab === 'incoming' ? 'active' : ''}`}
            onClick={() => setTab('incoming')}
          >
            Incoming
            {incoming.length > 0 && <span className="tab-badge">{incoming.length}</span>}
          </button>
          <button
            id="tab-outgoing"
            className={`tab-btn ${tab === 'outgoing' ? 'active' : ''}`}
            onClick={() => setTab('outgoing')}
          >
            Sent
          </button>
        </div>

        {loading ? (
          <div className="requests-loading">
            <Loader2 size={28} className="spin" />
            <p>Loading requests...</p>
          </div>
        ) : tab === 'incoming' ? (
          incoming.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📬</div>
              <h3>No pending requests</h3>
              <p>When someone wants to connect with you, it'll appear here.</p>
            </div>
          ) : (
            <div className="requests-list">
              {incoming.map((req) => (
                <RequestCard
                  key={req._id}
                  request={req}
                  person={req.from_user}
                  type="incoming"
                  actionLoading={actionLoading === req._id}
                  onAccept={() => handleAccept(req._id)}
                  onReject={() => handleReject(req._id)}
                  statusBadge={statusBadge(req.status)}
                />
              ))}
            </div>
          )
        ) : (
          outgoing.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✉️</div>
              <h3>No sent requests</h3>
              <p>Discover students and send your first connection request!</p>
            </div>
          ) : (
            <div className="requests-list">
              {outgoing.map((req) => (
                <RequestCard
                  key={req._id}
                  request={req}
                  person={req.to_user}
                  type="outgoing"
                  actionLoading={actionLoading === req._id}
                  onWithdraw={() => handleWithdraw(req._id)}
                  statusBadge={statusBadge(req.status)}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function RequestCard({ request, person, type, actionLoading, onAccept, onReject, onWithdraw, statusBadge }) {
  const initials = person?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const gradients = [
    'linear-gradient(135deg,#7c3aed,#06b6d4)',
    'linear-gradient(135deg,#ec4899,#8b5cf6)',
    'linear-gradient(135deg,#10b981,#06b6d4)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
  ];
  const grad = gradients[person?.name?.charCodeAt(0) % gradients.length];

  return (
    <div className="request-card card">
      <div className="request-card-top">
        <div className="avatar avatar-md" style={{ background: grad }}>{initials}</div>
        <div className="request-person-info">
          <div className="request-person-name-row">
            <span className="request-person-name">{person?.name}</span>
            {statusBadge}
          </div>
          <div className="request-person-meta">
            {person?.university && <span><GraduationCap size={12} />{person.university}</span>}
            {(person?.city || person?.country) && (
              <span><MapPin size={12} />{[person.city, person.country].filter(Boolean).join(', ')}</span>
            )}
          </div>
        </div>
        <span className="request-time">
          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
        </span>
      </div>

      <div className="request-message">
        <p>"{request.intro_message}"</p>
      </div>

      {request.tags?.length > 0 && (
        <div className="request-tags">
          {request.tags.map((t) => <span key={t} className="tag">{t}</span>)}
        </div>
      )}

      {type === 'incoming' && request.status === 'pending' && (
        <div className="request-actions">
          <button
            id={`reject-${request._id}`}
            className="btn btn-danger btn-sm"
            onClick={onReject}
            disabled={actionLoading}
          >
            {actionLoading ? <Loader2 size={14} className="spin" /> : <X size={14} />} Decline
          </button>
          <button
            id={`accept-${request._id}`}
            className="btn btn-success btn-sm"
            onClick={onAccept}
            disabled={actionLoading}
          >
            {actionLoading ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Accept
          </button>
        </div>
      )}

      {type === 'outgoing' && request.status === 'pending' && (
        <div className="request-actions">
          <button
            id={`withdraw-${request._id}`}
            className="btn btn-ghost btn-sm"
            onClick={onWithdraw}
            disabled={actionLoading}
          >
            {actionLoading ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />} Withdraw
          </button>
        </div>
      )}
    </div>
  );
}
