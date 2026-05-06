import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import { Send, ArrowLeft, Circle, ChevronsDown } from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import './ChatPage.css';

/* ── Helpers ──────────────────────────────────────────────────────── */
const GRADIENTS = [
  'linear-gradient(135deg,#6366f1,#0ea5e9)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#10b981,#06b6d4)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
];
const getGrad    = (name) => GRADIENTS[(name?.charCodeAt(0) ?? 0) % GRADIENTS.length];
const getInitials = (name) => name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';

const formatMsgTime = (ts) => {
  const d = new Date(ts);
  if (isToday(d))     return format(d, 'h:mm a');
  if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
};

const formatConvTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
};

const formatDateLabel = (ts) => {
  const d = new Date(ts);
  if (isToday(d))     return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
};

/* ── Avatar component ─────────────────────────────────────────────── */
function Avatar({ name, size = 'md', style = {} }) {
  const sizeMap = { sm: 32, md: 42, lg: 56 };
  const px = sizeMap[size] ?? 42;
  return (
    <div
      className={`avatar avatar-${size}`}
      style={{ background: getGrad(name), width: px, height: px, fontSize: px * 0.38, ...style }}
    >
      {getInitials(name)}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export default function ChatPage() {
  const { userId }   = useParams();
  const navigate     = useNavigate();
  const { user: me } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [activeUser,    setActiveUser]    = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [newMsg,        setNewMsg]        = useState('');
  const [onlineUsers,   setOnlineUsers]   = useState(new Set());
  const [typing,        setTyping]        = useState(false);
  const [convLoading,   setConvLoading]   = useState(true);
  const [msgLoading,    setMsgLoading]    = useState(false);

  const messagesEndRef    = useRef(null);
  const typingTimeoutRef  = useRef(null);
  const textareaRef       = useRef(null);
  const chatScrollRef     = useRef(null);
  const [showJump,        setShowJump]        = useState(false);

  /* ── Load conversations ─────────────────────────────────────────── */
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/messages');
      setConversations(data.conversations);
    } catch { /* silent */ }
    finally { setConvLoading(false); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  /* ── Load messages on active user change ──────────────────────── */
  useEffect(() => {
    if (!activeUser) return;
    setMsgLoading(true);
    setMessages([]);
    api.get(`/messages/${activeUser._id}`)
      .then(({ data }) => {
        setMessages(data.messages);
        getSocket()?.emit('mark_seen', { senderId: activeUser._id });
      })
      .catch(() => {})
      .finally(() => setMsgLoading(false));
  }, [activeUser]);

  /* ── Navigate from URL param ──────────────────────────────────── */
  useEffect(() => {
    if (!userId) return;

    // Check if already in conversations list (has prior messages)
    if (conversations.length > 0) {
      const conv = conversations.find((c) => c.user._id === userId);
      if (conv) { setActiveUser(conv.user); return; }
    }

    // Fallback: connection with no messages yet — fetch profile directly
    // Only fires after convLoading is done so we don't double-fetch
    if (!convLoading) {
      api.get(`/users/${userId}`)
        .then(({ data }) => { if (data.user) setActiveUser(data.user); })
        .catch(() => {});
    }
  }, [userId, conversations, convLoading]);

  /* ── Socket listeners ─────────────────────────────────────────── */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (msg) => {
      const inActiveChat =
        (msg.sender === activeUser?._id && msg.receiver === me?._id) ||
        (msg.sender === me?._id          && msg.receiver === activeUser?._id);

      if (inActiveChat) {
        setMessages((prev) => [...prev, msg]);
        if (msg.sender === activeUser?._id) {
          socket.emit('mark_seen', { senderId: activeUser._id });
        }
      }
      loadConversations();
    };

    const handleTyping = ({ userId: tid, isTyping }) => {
      if (tid === activeUser?._id) setTyping(isTyping);
    };

    const handleOnlineStatus = ({ userId: uid, isOnline }) => {
      setOnlineUsers((prev) => {
        const s = new Set(prev);
        isOnline ? s.add(uid) : s.delete(uid);
        return s;
      });
    };

    const handleSeen = ({ by }) => {
      if (by === activeUser?._id) {
        setMessages((prev) => prev.map((m) => ({ ...m, seen: true })));
      }
    };

    socket.on('new_message',        handleNewMessage);
    socket.on('user_typing',        handleTyping);
    socket.on('user_online_status', handleOnlineStatus);
    socket.on('messages_seen',      handleSeen);

    return () => {
      socket.off('new_message',        handleNewMessage);
      socket.off('user_typing',        handleTyping);
      socket.off('user_online_status', handleOnlineStatus);
      socket.off('messages_seen',      handleSeen);
    };
  }, [activeUser, me?._id, loadConversations]);

  /* ── Auto-scroll ──────────────────────────────────────────────── */
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 200) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setShowJump(true);
    }
  }, [messages, typing]);

  const jumpToLatest = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowJump(false);
  };

  const handleScroll = (e) => {
    const el = e.currentTarget;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJump(distFromBottom > 300);
  };

  /* ── Auto-resize textarea ─────────────────────────────────────── */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [newMsg]);

  /* ── Send message ─────────────────────────────────────────────── */
  const sendMessage = () => {
    if (!newMsg.trim() || !activeUser) return;
    const socket = getSocket();
    if (!socket) return;

    const trimmed = newMsg.trim();
    setNewMsg('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    socket.emit('send_message', { receiverId: activeUser._id, message: trimmed }, (res) => {
      if (res?.error) return;
      setMessages((prev) => [...prev, res.message]);
      loadConversations();
    });

    socket.emit('typing', { receiverId: activeUser._id, isTyping: false });
    clearTimeout(typingTimeoutRef.current);
  };

  /* ── Typing indicator ─────────────────────────────────────────── */
  const handleTypingInput = (e) => {
    setNewMsg(e.target.value);
    const socket = getSocket();
    if (!socket || !activeUser) return;
    socket.emit('typing', { receiverId: activeUser._id, isTyping: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { receiverId: activeUser._id, isTyping: false });
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ── Open chat with a user ────────────────────────────────────── */
  const openChat = (user) => {
    setActiveUser(user);
    setTyping(false);
    navigate(`/chat/${user._id}`, { replace: true });
    textareaRef.current?.focus();
  };

  /* ── Build message list with date separators ──────────────────── */
  const renderMessages = () => {
    const items = [];
    let prevDate = null;

    messages.forEach((msg, i) => {
      const msgDate = new Date(msg.timestamp);

      // Date separator
      if (!prevDate || !isSameDay(prevDate, msgDate)) {
        items.push(
          <div key={`sep-${i}`} className="chat-date-sep">
            <span>{formatDateLabel(msg.timestamp)}</span>
          </div>
        );
        prevDate = msgDate;
      }

      const isMine = msg.sender === me?._id || msg.sender?._id === me?._id;
      const nextMsg = messages[i + 1];
      const isLast  = !nextMsg || (nextMsg.sender !== msg.sender && nextMsg.sender?._id !== msg.sender?._id);

      items.push(
        <div
          key={msg._id || i}
          className={`msg-bubble-wrap ${isMine ? 'mine' : 'theirs'}${isLast ? ' show-avatar' : ''}`}
          style={{ marginBottom: isLast ? 8 : 2 }}
        >
          {/* Avatar for "theirs" — only on last in group */}
          {!isMine && (
            <div className="msg-avatar" style={{ opacity: isLast ? 1 : 0, pointerEvents: 'none' }}>
              <Avatar name={activeUser?.name} size="sm" />
            </div>
          )}

          <div className={`msg-bubble ${isMine ? 'mine' : 'theirs'}`}>
            <p>{msg.message}</p>
            <div className="msg-meta">
              <span className="msg-time">{formatMsgTime(msg.timestamp)}</span>
              {isMine && (
                <span className={`seen-status ${msg.seen ? 'seen' : 'unsent'}`}>
                  {msg.seen ? '✓✓' : '✓'}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    });

    return items;
  };

  /* ── Total unread count for sidebar badge ─────────────────────── */
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const charLeft    = 2000 - newMsg.length;

  /* ══════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="chat-page">

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <div className={`chat-sidebar ${activeUser ? 'hidden-mobile' : ''}`}>
        <div className="chat-sidebar-header">
          <h2>Messages</h2>
          {totalUnread > 0 && (
            <span className="sidebar-badge">{totalUnread}</span>
          )}
        </div>

        {convLoading ? (
          <div className="conv-loading">Loading…</div>
        ) : conversations.length === 0 ? (
          <div className="conv-empty">
            <div className="conv-empty-icon">💬</div>
            <p>No connections yet.</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/discover')}>
              Discover Students
            </button>
          </div>
        ) : (
          <div className="conv-list">
            {conversations.map(({ user, lastMessage, unreadCount }) => (
              <button
                key={user._id}
                className={`conv-item ${activeUser?._id === user._id ? 'active' : ''}`}
                onClick={() => openChat(user)}
              >
                <div className="conv-avatar-wrap">
                  <Avatar name={user.name} size="md" />
                  {onlineUsers.has(user._id) && <div className="online-dot conv-online" />}
                </div>

                <div className="conv-info">
                  <div className="conv-name-row">
                    <span className="conv-name">{user.name}</span>
                    <span className="conv-time">{formatConvTime(lastMessage?.timestamp)}</span>
                  </div>
                  <div className="conv-preview-row">
                    <span className="conv-preview">
                      {lastMessage?.message
                        ? (lastMessage.message.length > 38
                            ? lastMessage.message.slice(0, 38) + '…'
                            : lastMessage.message)
                        : 'Start a conversation'}
                    </span>
                    {unreadCount > 0 && <span className="conv-unread">{unreadCount}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Chat Window ────────────────────────────────────────────── */}
      <div className={`chat-window ${!activeUser ? 'hidden-mobile' : ''}`}>

        {!activeUser ? (
          /* Empty state */
          <div className="chat-empty-state">
            <div className="chat-empty-icon">💬</div>
            <h3>Your messages</h3>
            <p>Select a conversation from the left to start chatting with a connection.</p>
          </div>

        ) : (
          <>
            {/* Header */}
            <div className="chat-header">
              <button
                className="back-btn"
                aria-label="Back to conversations"
                onClick={() => { setActiveUser(null); navigate('/chat'); }}
              >
                <ArrowLeft size={16} />
              </button>

              <Avatar name={activeUser.name} size="md" />

              <div className="chat-header-info">
                <div className="chat-header-name">
                  {activeUser.name}
                  {onlineUsers.has(activeUser._id) && (
                    <span className="online-label">
                      <Circle size={7} fill="#10b981" stroke="none" /> Online
                    </span>
                  )}
                </div>
                <div className="chat-header-sub">
                  {[
                    activeUser.university,
                    activeUser.campus,
                    [activeUser.city, activeUser.country].filter(Boolean).join(', '),
                  ].filter(Boolean).join(' · ') || 'Nexora Student'}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages" ref={chatScrollRef} onScroll={handleScroll}>
              {msgLoading ? (
                <div className="msg-loading">Loading messages…</div>
              ) : messages.length === 0 ? (
                <div className="msg-empty">
                  <div className="msg-empty-card">
                    <div className="emoji">👋</div>
                    <p>
                      You're now connected with{' '}
                      <strong>{activeUser.name}</strong>.<br />
                      Say hello and start the conversation!
                    </p>
                  </div>
                </div>
              ) : (
                renderMessages()
              )}

              {/* Typing indicator */}
              {typing && (
                <div className="typing-bubble-wrap">
                  <Avatar name={activeUser.name} size="sm" style={{ opacity: 0.7 }} />
                  <div>
                    <div className="typing-bubble">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                    <div className="typing-label">{activeUser.name.split(' ')[0]} is typing…</div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Jump to latest */}
            {showJump && (
              <button className="jump-to-latest" onClick={jumpToLatest}>
                <ChevronsDown size={14} /> Latest
              </button>
            )}

            {/* Input bar */}
            <div className="chat-input-bar">
              <div className="chat-input-wrap">
                <textarea
                  id="chat-input"
                  ref={textareaRef}
                  className="chat-input"
                  placeholder={`Message ${activeUser.name.split(' ')[0]}…`}
                  value={newMsg}
                  onChange={handleTypingInput}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  maxLength={2000}
                  aria-label="Type a message"
                />
                {newMsg.length > 1800 && (
                  <span className={`char-count ${charLeft < 50 ? 'danger' : 'warn'}`}>
                    {charLeft}
                  </span>
                )}
              </div>

              <span className="input-hint" title="Shift+Enter for newline">
                ↵ send
              </span>

              <button
                id="chat-send"
                className="chat-send-btn"
                onClick={sendMessage}
                disabled={!newMsg.trim()}
                aria-label="Send message"
              >
                <Send size={17} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
