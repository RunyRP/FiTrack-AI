import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export const Profile = () => {
  const { user: currentUser, refreshUser, logout } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    gender: 'male',
    weight: '',
    height: '',
    activity_level: 'sedentary',
    objective: 'maintain',
    cut_intensity: 'medium',
    manual_target_kcal: ''
  });
  const [message, setMessage] = useState('');
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && currentUser.profile) {
      const p = currentUser.profile;
      setProfile({
        name: p.name || '',
        age: p.age || '',
        gender: p.gender || 'male',
        weight: p.weight || '',
        height: p.height || '',
        activity_level: p.activity_level || 'sedentary',
        objective: p.objective || 'maintain',
        cut_intensity: p.cut_intensity || 'medium',
        manual_target_kcal: p.manual_target_kcal ? String(p.manual_target_kcal) : ''
      });
    }
  }, [currentUser]);

  const handleSubmit = async (e?: React.FormEvent, partialUpdate?: any) => {
    if (e) e.preventDefault();
    
    // Medical Disclaimer Warning
    const hasAcknowledged = localStorage.getItem('medical_disclaimer_accepted');
    if (!hasAcknowledged) {
        const accept = window.confirm(
            "IMPORTANT MEDICAL DISCLAIMER:\n\n" +
            "FitTrack AI is an informational tool and NOT a substitute for professional medical advice, diagnosis, or treatment. " +
            "Always seek the advice of your physician or other qualified health provider with any questions regarding a medical condition or diet.\n\n" +
            "By clicking OK, you acknowledge that you use this tool at your own risk and the app is not responsible for any health issues."
        );
        if (!accept) return;
        localStorage.setItem('medical_disclaimer_accepted', 'true');
    }

    setUpdating(true);
    try {
      const dataToSave = { 
          ...profile, 
          ...partialUpdate,
          age: parseInt(String(partialUpdate?.age || profile.age)),
          weight: parseFloat(String(partialUpdate?.weight || profile.weight)),
          height: parseFloat(String(partialUpdate?.height || profile.height)),
          manual_target_kcal: partialUpdate?.manual_target_kcal !== undefined 
            ? (partialUpdate.manual_target_kcal ? parseInt(partialUpdate.manual_target_kcal) : null)
            : (profile.manual_target_kcal ? parseInt(profile.manual_target_kcal) : null)
      };
      await api.put('/user/profile', dataToSave);
      localStorage.removeItem('dashboard_cache');
      await refreshUser();
      setMessage('Profile updated and goals recalculated!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error updating profile.');
    } finally {
      setUpdating(false);
    }
  };

  const changeObjective = (newObj: string) => {
      setProfile({ ...profile, objective: newObj });
      handleSubmit(undefined, { objective: newObj });
  };

  const changeIntensity = (newInt: string) => {
      setProfile({ ...profile, cut_intensity: newInt });
      handleSubmit(undefined, { cut_intensity: newInt });
  };
// ... (rest of the component structure)

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you absolutely sure? This will permanently delete all your data and logs.')) {
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
    <div className="container animate-fade-in" style={{ maxWidth: '800px' }}>
      <div className="card">
        <h2 style={{ marginBottom: '2rem' }}>Your Profile & Plan</h2>
        
        <div style={{ marginBottom: '3rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Plan</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                {[
                    { id: 'lose_weight', label: 'Weight Loss', icon: '📉' },
                    { id: 'body_recomposition', label: 'Recomposition', icon: '🔄' },
                    { id: 'gain_muscle', label: 'Muscle Gain', icon: '💪' },
                    { id: 'maintain', label: 'Maintenance', icon: '⚖️' }
                ].map(opt => (
                    <button 
                        key={opt.id}
                        onClick={() => changeObjective(opt.id)}
                        className={`btn ${profile.objective === opt.id ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '1rem', fontSize: '0.9rem', flexDirection: 'column', gap: '0.25rem' }}
                        disabled={updating}
                    >
                        <span style={{ fontSize: '1.2rem' }}>{opt.icon}</span>
                        {opt.label}
                    </button>
                ))}
            </div>

            {profile.objective === 'lose_weight' && (
                <div className="animate-fade-in" style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Cut Intensity</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[
                            { id: 'light', label: 'Light (-250)', color: 'var(--success)' },
                            { id: 'medium', label: 'Medium (-500)', color: 'var(--primary)' },
                            { id: 'aggressive', label: 'Aggressive (-750)', color: 'var(--accent)' }
                        ].map(int => (
                            <button 
                                key={int.id}
                                onClick={() => changeIntensity(int.id)}
                                className="btn btn-secondary"
                                style={{ 
                                    flex: 1, 
                                    fontSize: '0.75rem', 
                                    padding: '0.5rem',
                                    borderColor: profile.cut_intensity === int.id ? int.color : 'rgba(255,255,255,0.1)',
                                    color: profile.cut_intensity === int.id ? int.color : '#fff',
                                    background: profile.cut_intensity === int.id ? `${int.color}10` : 'rgba(255,255,255,0.05)'
                                }}
                            >
                                {int.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <form onSubmit={handleSubmit} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
                <label>Display Name</label>
                <input 
                    type="text" 
                    value={profile.name} 
                    onChange={(e) => setProfile({...profile, name: e.target.value})} 
                    required 
                />
            </div>
            <div className="input-group">
                <label>Manual Calorie Goal (Optional)</label>
                <input 
                    type="number" 
                    placeholder="e.g. 1800"
                    value={profile.manual_target_kcal} 
                    onChange={(e) => setProfile({...profile, manual_target_kcal: e.target.value})} 
                />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
                <label>Age</label>
                <input 
                    type="number" 
                    value={profile.age} 
                    onChange={(e) => setProfile({...profile, age: e.target.value})} 
                    required 
                />
            </div>
            
            <div className="input-group">
                <label>Gender</label>
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={updating}>
            {updating ? 'Saving...' : 'Update Detailed Vitals'}
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

      <div className="card" style={{ borderColor: 'rgba(255, 0, 127, 0.2)', background: 'rgba(255, 0, 127, 0.02)', marginTop: '2rem' }}>
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
