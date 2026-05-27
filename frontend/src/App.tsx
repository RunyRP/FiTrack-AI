import React, { useState, useEffect, useCallback } from 'react';
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
import { LayoutIcon, AppleIcon, DumbbellIcon, CoachIcon, UserIcon, CalculatorIcon, LogoutIcon } from './components/Icons';
import { OTAUpdateHandler } from './components/OTAUpdateHandler';
import { AuthContext, PopupContext, useAuth } from './hooks';
import type { PopupOptions } from './hooks';
import './App.css';


const Popup = ({ options, onClose }: { options: PopupOptions, onClose: () => void }) => {
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      background: 'rgba(0,0,0,0.85)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 20000, 
      padding: '1.5rem', 
      backdropFilter: 'blur(8px)' 
    }}>
      <div className="card animate-fade-in" style={{ 
        width: '100%', 
        maxWidth: '400px', 
        padding: '2rem', 
        background: '#0a0a0a', 
        border: '1px solid var(--card-border)', 
        borderRadius: '1.25rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        textAlign: 'center'
      }}>
        {options.title && (
          <h2 style={{ 
            fontSize: '1.2rem', 
            marginBottom: '1rem', 
            color: 'var(--primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {options.title}
          </h2>
        )}
        <p style={{ 
          fontSize: '1.1rem', 
          lineHeight: 1.5, 
          color: '#fff', 
          marginBottom: '2rem',
          fontWeight: 500
        }}>
          {options.message}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {options.type === 'confirm' && (
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                if (options.onCancel) options.onCancel();
                onClose();
              }}
              style={{ flex: 1, padding: '0.8rem' }}
            >
              {options.cancelLabel || 'CANCEL'}
            </button>
          )}
          <button 
            className="btn btn-primary" 
            onClick={() => {
              if (options.onConfirm) options.onConfirm();
              onClose();
            }}
            style={{ flex: 1, padding: '0.8rem', fontWeight: 800 }}
          >
            {options.confirmLabel || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PopupProvider = ({ children }: { children: React.ReactNode }) => {
  const [popup, setPopup] = useState<PopupOptions | null>(null);

  const showPopup = (options: PopupOptions) => setPopup(options);
  const hidePopup = () => setPopup(null);

  return (
    <PopupContext.Provider value={{ showPopup, hidePopup }}>
      {children}
      {popup && <Popup options={popup} onClose={hidePopup} />}
    </PopupContext.Provider>
  );
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  const fetchUser = useCallback(async (_tokenToUse: string) => {
    try {
      const res = await api.get('/user/me');
      setUser(res.data);
    } catch (err: any) {
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
    localStorage.setItem('token', newToken);
    setToken(newToken);
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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const updateScroll = () => {
      const scrollY = window.scrollY;
      // Use hysteresis to prevent flickering at the threshold
      if (scrollY > 100) {
        setIsScrolled(true);
      } else if (scrollY < 20) {
        setIsScrolled(false);
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScroll);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Reset scroll position and navbar state on route change
  useEffect(() => {
    window.scrollTo(0, 0);
    setIsScrolled(false);
  }, [location.pathname]);

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  return (
    <nav className={isScrolled ? 'nav-scrolled' : ''}>
      <div className="nav-content">
        <Link to="/" className="logo">
          FIT<span>TRACK</span> AI
        </Link>
        <div className="nav-links">
          {user ? (
            <>
              <Link to="/" className={isActive('/')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <LayoutIcon size={16} /> <span>DASHBOARD</span>
              </Link>
              <Link to="/meal" className={isActive('/meal')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AppleIcon size={16} /> <span>MEALS</span>
              </Link>
              <Link to="/workout" className={isActive('/workout')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <DumbbellIcon size={16} /> <span>TRAINING</span>
              </Link>
              <Link to="/chat" className={isActive('/chat')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CoachIcon size={16} /> <span>COACH</span>
              </Link>
              <Link to="/calculators" className={isActive('/calculators')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CalculatorIcon size={16} /> <span>TOOLS</span>
              </Link>
              <Link to="/profile" className={isActive('/profile')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <UserIcon size={16} /> <span>PROFILE</span>
              </Link>
              <a href="#" onClick={handleLogoutClick} style={{ color: 'var(--accent)', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <LogoutIcon size={16} /> <span>LOGOUT</span>
              </a>
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

const SwipeWrapper = ({ children }: { children: React.ReactNode }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    const minSwipeDistance = 70;

    const sequence = ['/', '/meal', '/workout', '/chat', '/calculators', '/profile'];

    const onTouchStart = (e: React.TouchEvent) => {
        let target = e.target as HTMLElement;
        while (target && target !== e.currentTarget) {
            const style = window.getComputedStyle(target);
            if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
                setTouchStart(null);
                return;
            }
            target = target.parentElement as HTMLElement;
        }

        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (touchStart !== null) {
            setTouchEnd(e.targetTouches[0].clientX);
        }
    };

    const onTouchEnd = () => {
        if (touchStart === null || touchEnd === null) return;
        
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe || isRightSwipe) {
            const currentIndex = sequence.indexOf(location.pathname);
            if (currentIndex === -1) return;

            if (isLeftSwipe && currentIndex < sequence.length - 1) {
                navigate(sequence[currentIndex + 1]);
            } else if (isRightSwipe && currentIndex > 0) {
                navigate(sequence[currentIndex - 1]);
            }
        }
        setTouchStart(null);
        setTouchEnd(null);
    };

    return (
        <div 
            onTouchStart={onTouchStart} 
            onTouchMove={onTouchMove} 
            onTouchEnd={onTouchEnd}
            style={{ minHeight: 'calc(100vh - 80px)', touchAction: 'pan-y' }}
        >
            {children}
        </div>
    );
};

function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '393563449346-h9l7hrac2c7j6sto53smh682mqn8rib5.apps.googleusercontent.com';
  
  if (!clientId) return <div className="container">Configuration error: Missing Client ID</div>;

  return (
    <GoogleOAuthProvider clientId={clientId}>
        <Router>
          <AuthProvider>
            <PopupProvider>
                <div className="bg-shape bg-shape-1"></div>
                <div className="bg-shape bg-shape-2"></div>
                <OTAUpdateHandler />
                <Navbar />
                <SwipeWrapper>
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
                </SwipeWrapper>
            </PopupProvider>
          </AuthProvider>
        </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
