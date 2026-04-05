import { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export const Setup = () => {
  const [objective, setObjective] = useState('maintain');
  const [interestedInGym, setInterestedInGym] = useState(false);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const handleCompleteSetup = async () => {
    try {
      await api.put('/user/profile', { 
        objective, 
        setup_complete: true 
      });
      
      await refreshUser();
      
      if (interestedInGym) {
        navigate('/workout');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <div className="card">
        <h2>Personalize Your Goals</h2>
        <p className="text-muted">What is your primary objective?</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '2rem' }}>
          <div 
            className={`card ${objective === 'lose_weight' ? 'active-machine' : ''}`}
            onClick={() => setObjective('lose_weight')}
            style={{ 
              cursor: 'pointer', 
              padding: '1.5rem', 
              marginBottom: 0,
              border: objective === 'lose_weight' ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <strong>📉 Lose Weight</strong>
            <p className="text-muted">Focus on calorie deficit and fat loss.</p>
          </div>

          <div 
            className={`card ${objective === 'maintain' ? 'active-machine' : ''}`}
            onClick={() => setObjective('maintain')}
            style={{ 
              cursor: 'pointer', 
              padding: '1.5rem', 
              marginBottom: 0,
              border: objective === 'maintain' ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <strong>⚖️ Maintain</strong>
            <p className="text-muted">Keep your current weight and improve body composition.</p>
          </div>

          <div 
            className={`card ${objective === 'gain_muscle' ? 'active-machine' : ''}`}
            onClick={() => setObjective('gain_muscle')}
            style={{ 
              cursor: 'pointer', 
              padding: '1.5rem', 
              marginBottom: 0,
              border: objective === 'gain_muscle' ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <strong>💪 Gain Muscle</strong>
            <p className="text-muted">Focus on strength and muscle mass growth.</p>
          </div>
        </div>

        <div className="card" style={{ marginTop: '2rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={interestedInGym} 
              onChange={(e) => setInterestedInGym(e.target.checked)}
              style={{ width: '20px', height: '20px' }}
            />
            <span>I'm interested in selecting my gym equipment for workout suggestions</span>
          </label>
        </div>

        <button 
          className="btn btn-primary" 
          style={{ width: '100%', marginTop: '1rem' }}
          onClick={handleCompleteSetup}
        >
          Complete Setup
        </button>
      </div>
    </div>
  );
};
