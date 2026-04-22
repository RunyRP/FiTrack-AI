import React, { useState } from 'react';
import api from '../api';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      
      const res = await api.post('/auth/login', formData);
      login(res.data.access_token);
      navigate('/');
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        setError('Invalid email or password');
      } else {
        setError('Connection error. Please make sure the backend is running.');
      }
    }
  };

  return (
    <div className="container auth-container animate-fade-in">
      <div className="auth-header">
        <h1 style={{ fontSize: '2.5rem' }}>Welcome Back</h1>
        <p className="text-muted">Enter your credentials to access your dashboard</p>
      </div>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email Address</label>
            <input 
                type="email" 
                placeholder="athlete@example.com"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
                type="password" 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
            />
          </div>
          {error && (
            <div style={{ 
                marginBottom: '1.5rem', 
                padding: '0.75rem', 
                borderRadius: '0.75rem', 
                background: 'rgba(255,0,127,0.1)', 
                color: 'var(--accent)',
                fontSize: '0.9rem',
                textAlign: 'center'
            }}>
                {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Sign In
          </button>
        </form>
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <span className="text-muted">New to FitTrack AI?</span>
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700, marginLeft: '0.5rem', textDecoration: 'none' }}>
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
};
