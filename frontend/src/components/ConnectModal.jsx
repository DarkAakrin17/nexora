import { useEffect, useRef, useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import './ConnectModal.css';

const TAGS = ['accommodation', 'travel', 'same university', 'networking'];
const STARTER_MESSAGES = [
  "Hi! I noticed we're both planning to study abroad and would love to connect.",
  "Hey! I'd love to exchange tips about accommodation and settling in.",
  'Hi! I am looking to build a student support network before intake.',
];

export default function ConnectModal({ user, onClose, onSuccess }) {
  const [intro, setIntro] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const introRef = useRef(null);

  useEffect(() => {
    introRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!intro.trim()) { toast.error('Please write an intro message.'); return; }
    if (intro.length > 500) { toast.error('Intro message too long.'); return; }

    setLoading(true);
    try {
      await api.post('/requests', {
        to_user: user._id,
        intro_message: intro.trim(),
        tags: selectedTags,
      });
      toast.success(`Request sent to ${user.name}! 🎉`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box connect-modal">
        <div className="connect-modal-header">
          <div>
            <h3>Connect with {user.name}</h3>
            <p className="connect-modal-sub">
              {user.university && `${user.university}`}{user.city && ` · ${user.city}`}{user.country && `, ${user.country}`}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="connect-form">
          <div className="form-group">
            <label className="form-label">Intro Message *</label>
            <textarea
              id="connect-intro"
              ref={introRef}
              className="form-input form-textarea"
              placeholder={`Hi ${user.name?.split(' ')[0]}! I'm studying abroad too and would love to connect...`}
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              rows={4}
              maxLength={500}
              required
            />
            <span className="char-count">{intro.length}/500</span>
          </div>

          <div className="form-group">
            <label className="form-label">Quick starters</label>
            <div className="starter-group">
              {STARTER_MESSAGES.map((msg) => (
                <button
                  key={msg}
                  type="button"
                  className="starter-chip"
                  onClick={() => setIntro(msg)}
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Looking for (optional)</label>
            <div className="tag-group">
              {TAGS.map((tag) => (
                <span
                  key={tag}
                  id={`tag-${tag.replaceAll(' ', '-')}`}
                  className={`tag tag-selectable ${selectedTags.includes(tag) ? 'selected' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="privacy-note">
            🔒 Your contact details remain private until both of you accept.
          </div>

          <div className="connect-modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button id="connect-send" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
              {loading ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
