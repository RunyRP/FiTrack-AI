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
      // Send registration request
      await api.post('/auth/register', { email, password });
      
      // Redirect to login page immediately upon success
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
    <div className="container" style={{ maxWidth: '400px', marginTop: '100px' }}>
      <div className="card">
        <h2>Join FitTrack AI</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          {error && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ color: 'var(--accent)' }}>{error}</p>
              {error.toLowerCase().includes('already registered') && (
                <button 
                  type="button"
                  className="btn" 
                  style={{ background: 'transparent', color: 'var(--primary)', padding: 0, border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
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
        <p style={{ marginTop: '1rem', textAlign: 'center' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', marginLeft: '0.5rem' }}>Login</Link>
        </p>
      </div>
    </div>
  );
};
