import React, { useState } from 'react';
import api from '../api';
import { useNavigate, Link } from 'react-router-dom';

export const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await api.post('/auth/register', { email, password });
      navigate('/login');
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Error during registration. Please try again.');
      }
    }
  };

  return (
    <div className="container auth-container animate-fade-in">
      <div className="auth-header">
        <h1 style={{ fontSize: '2.5rem' }}>Start Your Journey</h1>
        <p className="text-muted">Create an account to track your fitness with AI</p>
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
              placeholder="Choose a strong password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          {error && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ 
                padding: '0.75rem', 
                borderRadius: '0.75rem', 
                background: 'rgba(255,0,127,0.1)', 
                color: 'var(--accent)',
                fontSize: '0.9rem',
                textAlign: 'center'
              }}>
                {error}
              </div>
              {error.toLowerCase().includes('already registered') && (
                <button 
                  type="button"
                  className="btn" 
                  style={{ width: '100%', marginTop: '0.5rem', background: 'transparent', color: 'var(--primary)', textDecoration: 'underline' }}
                  onClick={() => navigate('/login')}
                >
                  Go to Login
                </button>
              )}
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Create Account
          </button>
        </form>
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <span className="text-muted">Already have an account?</span>
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, marginLeft: '0.5rem', textDecoration: 'none' }}>
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
};
