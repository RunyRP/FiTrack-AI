import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export const Profile = () => {
  const { user: currentUser, refreshUser, logout } = useAuth();
  const [profile, setProfile] = useState({
    age: '',
    gender: 'male',
    weight: '',
    height: '',
    activity_level: 'sedentary'
  });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && currentUser.profile) {
      const p = currentUser.profile;
      setProfile({
        age: p.age || '',
        gender: p.gender || 'male',
        weight: p.weight || '',
        height: p.height || '',
        activity_level: p.activity_level || 'sedentary'
      });
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/user/profile', profile);
      await refreshUser();
      setMessage('Profile updated successfully! Redirecting to goal selection...');
      setTimeout(() => navigate('/setup'), 1500);
    } catch (err) {
      setMessage('Error updating profile.');
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.')) {
      try {
        await api.delete('/user/me');
        logout();
        navigate('/login');
      } catch (err) {
        setMessage('Error deleting account.');
      }
    }
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '700px' }}>
      <div className="card">
        <h2>Your Physical Profile</h2>
        <p className="text-muted">These details help us calculate your BMR and personalized calorie targets.</p>
        
        <form onSubmit={handleSubmit} style={{ marginTop: '2.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
                <label>Age (Years)</label>
                <input 
                type="number" 
                value={profile.age} 
                onChange={(e) => setProfile({...profile, age: e.target.value})} 
                required 
                />
            </div>
            
            <div className="input-group">
                <label>Biological Gender</label>
                <select 
                value={profile.gender} 
                onChange={(e) => setProfile({...profile, gender: e.target.value})}
                >
                <option value="male">Male</option>
                <option value="female">Female</option>
                </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
                <label>Weight (kg)</label>
                <input 
                type="number" 
                step="0.1" 
                value={profile.weight} 
                onChange={(e) => setProfile({...profile, weight: e.target.value})} 
                required 
                />
            </div>

            <div className="input-group">
                <label>Height (cm)</label>
                <input 
                type="number" 
                value={profile.height} 
                onChange={(e) => setProfile({...profile, height: e.target.value})} 
                required 
                />
            </div>
          </div>

          <div className="input-group">
            <label>Daily Activity Level</label>
            <select 
              value={profile.activity_level} 
              onChange={(e) => setProfile({...profile, activity_level: e.target.value})}
            >
              <option value="sedentary">Sedentary (Little to no exercise)</option>
              <option value="lightly_active">Lightly Active (1-3 days/week)</option>
              <option value="moderately_active">Moderately Active (3-5 days/week)</option>
              <option value="very_active">Very Active (6-7 days/week)</option>
              <option value="extra_active">Extra Active (Athlete/Physical job)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Update Profile & Recalculate
          </button>
        </form>
        {message && (
            <div style={{ 
                marginTop: '1.5rem', 
                padding: '1rem', 
                borderRadius: '0.75rem', 
                background: 'rgba(0,242,254,0.1)', 
                color: 'var(--primary)',
                textAlign: 'center',
                fontWeight: 600
            }}>
                {message}
            </div>
        )}
      </div>

      <div className="card" style={{ borderColor: 'rgba(255, 0, 127, 0.2)', background: 'rgba(255, 0, 127, 0.02)' }}>
        <h3 style={{ color: 'var(--accent)' }}>Danger Zone</h3>
        <p className="text-muted">Permanently remove your account and all associated metrics. This cannot be undone.</p>
        <button 
          onClick={handleDeleteAccount}
          className="btn btn-secondary" 
          style={{ borderColor: 'var(--accent)', color: 'var(--accent)', marginTop: '1.5rem' }}
        >
          Delete Account Permanently
        </button>
      </div>
    </div>
  );
};
