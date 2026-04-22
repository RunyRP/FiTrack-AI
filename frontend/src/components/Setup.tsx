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
    <div className="container animate-fade-in" style={{ maxWidth: '700px' }}>
      <div className="card">
        <h2>Personalize Your Goals</h2>
        <p className="text-muted">What is your primary objective? This will customize your calorie and workout recommendations.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginTop: '2.5rem' }}>
          <div 
            className="card"
            onClick={() => setObjective('lose_weight')}
            style={{ 
              cursor: 'pointer', 
              padding: '1.5rem', 
              marginBottom: 0,
              border: objective === 'lose_weight' ? '2px solid var(--primary)' : '1px solid var(--card-border)',
              background: objective === 'lose_weight' ? 'rgba(0, 242, 254, 0.05)' : undefined,
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>📉</span>
                <div>
                    <strong style={{ fontSize: '1.1rem', color: objective === 'lose_weight' ? 'var(--primary)' : 'white' }}>Weight Loss</strong>
                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>Burn fat and improve cardiovascular health.</p>
                </div>
            </div>
          </div>

          <div 
            className="card"
            onClick={() => setObjective('maintain')}
            style={{ 
              cursor: 'pointer', 
              padding: '1.5rem', 
              marginBottom: 0,
              border: objective === 'maintain' ? '2px solid var(--primary)' : '1px solid var(--card-border)',
              background: objective === 'maintain' ? 'rgba(0, 242, 254, 0.05)' : undefined,
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>⚖️</span>
                <div>
                    <strong style={{ fontSize: '1.1rem', color: objective === 'maintain' ? 'var(--primary)' : 'white' }}>Maintenance</strong>
                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>Maintain current weight and tone your muscles.</p>
                </div>
            </div>
          </div>

          <div 
            className="card"
            onClick={() => setObjective('gain_muscle')}
            style={{ 
              cursor: 'pointer', 
              padding: '1.5rem', 
              marginBottom: 0,
              border: objective === 'gain_muscle' ? '2px solid var(--primary)' : '1px solid var(--card-border)',
              background: objective === 'gain_muscle' ? 'rgba(0, 242, 254, 0.05)' : undefined,
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>💪</span>
                <div>
                    <strong style={{ fontSize: '1.1rem', color: objective === 'gain_muscle' ? 'var(--primary)' : 'white' }}>Muscle Gain</strong>
                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>Build strength and increase muscle mass.</p>
                </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '2rem', padding: '1.5rem', borderStyle: 'dashed' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={interestedInGym} 
              onChange={(e) => setInterestedInGym(e.target.checked)}
              style={{ width: '22px', height: '22px', accentColor: 'var(--primary)' }}
            />
            <span style={{ fontWeight: 600 }}>I want to configure my gym equipment for personalized workouts</span>
          </label>
        </div>

        <button 
          className="btn btn-primary" 
          style={{ width: '100%', marginTop: '1rem', padding: '1.25rem' }}
          onClick={handleCompleteSetup}
        >
          Finish Setup & Start Training
        </button>
      </div>
    </div>
  );
};
