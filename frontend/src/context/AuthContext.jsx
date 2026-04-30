import { createContext, useContext, useState, useEffect } from 'react';
import { initSocket, disconnectSocket } from '../lib/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sc_user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('sc_token'));

  useEffect(() => {
    if (token && user) {
      initSocket(token);
    }
    return () => {};
  }, [token, user]);

  const login = (userData, jwtToken) => {
    localStorage.setItem('sc_token', jwtToken);
    localStorage.setItem('sc_user', JSON.stringify(userData));
    setToken(jwtToken);
    setUser(userData);
    initSocket(jwtToken);
  };

  const logout = () => {
    localStorage.removeItem('sc_token');
    localStorage.removeItem('sc_user');
    disconnectSocket();
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated) => {
    const merged = { ...user, ...updated };
    localStorage.setItem('sc_user', JSON.stringify(merged));
    setUser(merged);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
