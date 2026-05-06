import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Globe, Users, MessageCircle, Bell, User, LogOut, Menu, X, Globe2 } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    api.get('/requests/incoming')
      .then(({ data }) => setPendingCount(data.requests.length))
      .catch(() => {});
  }, [user, location.pathname]);

  // Close mobile menu on click-outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const navLinks = [
    { to: '/discover',     icon: <Globe2 size={17} />,        label: 'Discover'     },
    { to: '/requests',     icon: <Bell size={17} />,           label: 'Requests', badge: pendingCount },
    { to: '/connections',  icon: <Users size={17} />,          label: 'Connections'  },
    { to: '/chat',         icon: <MessageCircle size={17} />,  label: 'Messages'     },
    { to: '/profile',      icon: <User size={17} />,           label: 'Profile'      },
  ];

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar" ref={menuRef}>
      <div className="navbar-inner container">
        <Link to="/discover" className="navbar-brand">
          <div className="navbar-logo"><Globe size={20} /></div>
          <span className="navbar-brand-text">Nex<span>ora</span></span>
        </Link>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link ${location.pathname.startsWith(link.to) ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.icon}
              <span>{link.label}</span>
              {link.badge > 0 && <span className="nav-badge">{link.badge}</span>}
            </Link>
          ))}

          <div className="nav-divider-mobile" />

          <button className="nav-user" onClick={handleLogout}>
            <div className="avatar avatar-sm nav-avatar">{initials}</div>
            <span className="nav-user-name">{user?.name?.split(' ')[0]}</span>
            <LogOut size={14} />
          </button>
        </div>

        <button
          className="navbar-hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </nav>
  );
}
