import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import api from './api';
import { Dashboard } from './components/Dashboard';
import { Profile } from './components/Profile';
import { Setup } from './components/Setup';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { MealAnalysis } from './components/MealAnalysis';
import { MealHistory } from './components/MealHistory';
import { WorkoutSuggestions } from './components/WorkoutSuggestions';
import { Chat } from './components/Chat';
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

  const isSetupIncomplete = !user?.profile?.setup_complete;
  
  if (isSetupIncomplete && location.pathname !== '/profile' && location.pathname !== '/setup') {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
    navigate('/login');
  };

  return (
    <nav className="container">
      <Link to="/" style={{ fontSize: '1.5rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginLeft: 0 }}>
        FitTrack AI
      </Link>
      <div>
        {user ? (
          <>
            <Link to="/">Dashboard</Link>
            <Link to="/meal">Log Meal</Link>
            <Link to="/history">Meal History</Link>
            <Link to="/workout">Workouts</Link>
            <Link to="/chat">AI Chat</Link>
            <Link to="/profile">Profile</Link>
            <a href="#" onClick={handleLogoutClick}>Logout</a>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
