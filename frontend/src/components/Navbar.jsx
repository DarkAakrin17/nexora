import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Globe, Users, MessageCircle, Bell, User, LogOut, Menu, X, Search } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get('/requests/incoming')
      .then(({ data }) => setPendingCount(data.requests.length))
      .catch(() => {});
  }, [user, location.pathname]);

  const navLinks = [
    { to: '/discover', icon: <Search size={18} />, label: 'Discover' },
    { to: '/requests', icon: <Bell size={18} />, label: 'Requests', badge: pendingCount },
    { to: '/chat', icon: <MessageCircle size={18} />, label: 'Messages' },
    { to: '/profile', icon: <User size={18} />, label: 'Profile' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
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
            <div className="avatar avatar-sm">{user?.name?.[0]?.toUpperCase()}</div>
            <span className="nav-user-name">{user?.name?.split(' ')[0]}</span>
            <LogOut size={15} />
          </button>
        </div>

        <button className="navbar-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </nav>
  );
}
