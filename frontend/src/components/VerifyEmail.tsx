import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { CoachIcon, SuccessIcon, ErrorIcon } from './Icons';

export const VerifyEmail = () => {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email...');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    const verify = async () => {
      try {
        const res = await api.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully!');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Verification failed. The link may be invalid or expired.');
      }
    };

    verify();
  }, [location]);

  return (
    <div className="container auth-container animate-fade-in">
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        {status === 'verifying' && (
          <div>
            <div className="stat-value animate-pulse" style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>
                <CoachIcon size={64} />
            </div>
            <h2>Verifying...</h2>
            <p className="text-muted">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{ marginBottom: '1.5rem', color: 'var(--success)' }}>
                <SuccessIcon size={80} />
            </div>
            <h2 style={{ color: 'var(--success)' }}>Success!</h2>
            <p style={{ marginBottom: '2rem' }}>{message}</p>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={() => navigate('/login')}
            >
              Go to Login
            </button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{ marginBottom: '1.5rem', color: '#f44336' }}>
                <ErrorIcon size={80} />
            </div>
            <h2 style={{ color: '#f44336' }}>Verification Failed</h2>
            <p style={{ marginBottom: '2rem' }}>{message}</p>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <Link to="/register" className="btn btn-primary">Back to Registration</Link>
              <Link to="/login" className="btn btn-secondary">Go to Login</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
