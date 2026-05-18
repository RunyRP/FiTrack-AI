import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import api from './api';
import { Dashboard } from './components/Dashboard';
import { Profile } from './components/Profile';
import { EquipmentManager } from './components/EquipmentManager';
import { Setup } from './components/Setup';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { VerifyEmail } from './components/VerifyEmail';
import { MealAnalysis } from './components/MealAnalysis';
import { MealHistory } from './components/MealHistory';
import { WorkoutSuggestions } from './components/WorkoutSuggestions';
import { Calculators } from './components/Calculators';
import { Chat } from './components/Chat';
import { LayoutIcon, AppleIcon, DumbbellIcon, CoachIcon, UserIcon, CalculatorIcon } from './components/Icons';
import './App.css';

interface AuthContextType {
  user: any;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  const fetchUser = useCallback(async (tokenToUse: string) => {
    console.log("DEBUG: Fetching user with token:", tokenToUse.substring(0, 10) + "...");
    try {
      const res = await api.get('/user/me');
      console.log("DEBUG: User fetch success:", res.data.email);
      setUser(res.data);
    } catch (err: any) {
      console.error("DEBUG: Auth error fetching user:", err.response?.status, err.message);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, [token, fetchUser]);

  const login = (newToken: string) => {
    console.log("DEBUG: Login function called with new token");
    localStorage.setItem('token', newToken);
    setToken(newToken);
    // Explicitly set loading to true while we fetch the new user
    setLoading(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) await fetchUser(token);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const token = localStorage.getItem('token');

  if (loading) return <div className="container">Verifying...</div>;
  if (!token || !user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Only redirect to setup/profile if we explicitly know setup isn't done.
  // If user.profile is missing, they need to go to setup.
  const needsSetup = !user.profile || user.profile.setup_complete === false;
  
  if (needsSetup && location.pathname !== '/setup' && location.pathname !== '/profile') {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  return (
    <nav>
      <div className="nav-content">
        <Link to="/" className="logo">
          FIT<span>TRACK</span> AI
        </Link>
        <div className="nav-links">
          {user ? (
            <>
              <Link to="/" className={isActive('/')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <LayoutIcon size={16} /> DASHBOARD
              </Link>
              <Link to="/meal" className={isActive('/meal')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AppleIcon size={16} /> MEALS
              </Link>
              <Link to="/workout" className={isActive('/workout')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <DumbbellIcon size={16} /> TRAINING
              </Link>
              <Link to="/chat" className={isActive('/chat')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CoachIcon size={16} /> COACH
              </Link>
              <Link to="/calculators" className={isActive('/calculators')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CalculatorIcon size={16} /> TOOLS
              </Link>
              <Link to="/profile" className={isActive('/profile')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <UserIcon size={16} /> PROFILE
              </Link>
              <a href="#" onClick={handleLogoutClick} style={{ color: 'var(--accent)', opacity: 0.5 }}>LOGOUT</a>
            </>
          ) : (
            <>
              <Link to="/login" className={isActive('/login')}>LOGIN</Link>
              <Link to="/register" className={isActive('/register')}>REGISTER</Link>
            </>
          )}
        </div>

      </div>
    </nav>
  );
};

function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '393563449346-h9l7hrac2c7j6sto53smh682mqn8rib5.apps.googleusercontent.com';
  
  // Prevent crash if clientId is somehow still missing
  if (!clientId) return <div className="container">Configuration error: Missing Client ID</div>;

  return (
    <GoogleOAuthProvider clientId={clientId}>
        <Router>
          <AuthProvider>
            <div className="bg-shape bg-shape-1"></div>
            <div className="bg-shape bg-shape-2"></div>
            <Navbar />
            <main className="animate-fade-in">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/equipment" 
                  element={
                    <ProtectedRoute>
                      <EquipmentManager />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/setup" 
                  element={
                    <ProtectedRoute>
                      <Setup />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/meal" 
                  element={
                    <ProtectedRoute>
                      <MealAnalysis />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/history" 
                  element={
                    <ProtectedRoute>
                      <MealHistory />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/workout" 
                  element={
                    <ProtectedRoute>
                      <WorkoutSuggestions />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/chat" 
                  element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/calculators" 
                  element={
                    <ProtectedRoute>
                      <Calculators />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </main>
          </AuthProvider>
        </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
