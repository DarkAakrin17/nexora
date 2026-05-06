import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import RequestsPage from './pages/RequestsPage';
import ConnectionsPage from './pages/ConnectionsPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { Loader2 } from 'lucide-react';

// Heavy pages — lazy-loaded so Three.js / react-globe.gl only download on demand
const GlobeDiscoverPage = lazy(() => import('./pages/GlobeDiscoverPage'));
const DiscoverPage      = lazy(() => import('./pages/DiscoverPage'));

function PrivateRoute({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isLoggedIn } = useAuth();
  return !isLoggedIn ? children : <Navigate to="/discover" replace />;
}

function AppLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

function GlobeFallback() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'calc(100vh - 60px)', background:'#000510', gap:12, color:'rgba(255,255,255,0.4)', fontSize:'0.875rem' }}>
      <Loader2 size={28} style={{ animation:'spin 1s linear infinite' }} /> Loading globe…
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1a1a2e',
              color: '#f1f5f9',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup"          element={<PublicRoute><SignupPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          {/* Private */}
          <Route path="/discover"     element={<PrivateRoute><AppLayout><Suspense fallback={<GlobeFallback />}><GlobeDiscoverPage /></Suspense></AppLayout></PrivateRoute>} />
          <Route path="/explore"      element={<PrivateRoute><AppLayout><Suspense fallback={<GlobeFallback />}><DiscoverPage /></Suspense></AppLayout></PrivateRoute>} />
          <Route path="/requests"     element={<PrivateRoute><AppLayout><RequestsPage /></AppLayout></PrivateRoute>} />
          <Route path="/connections"  element={<PrivateRoute><AppLayout><ConnectionsPage /></AppLayout></PrivateRoute>} />
          <Route path="/chat"         element={<PrivateRoute><AppLayout><ChatPage /></AppLayout></PrivateRoute>} />
          <Route path="/chat/:userId" element={<PrivateRoute><AppLayout><ChatPage /></AppLayout></PrivateRoute>} />
          <Route path="/profile"      element={<PrivateRoute><AppLayout><ProfilePage /></AppLayout></PrivateRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/discover" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
