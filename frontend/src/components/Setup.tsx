import { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export const Setup = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [objective, setObjective] = useState('maintain');
  const [machinery, setMachinery] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
      if (step === 2) {
          fetchMachinery();
      }
  }, [step]);

  const fetchMachinery = async () => {
    try {
      const res = await api.get('/workout/machinery');
      setMachinery(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleMachine = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const handleCompleteSetup = async () => {
    setLoading(true);
    try {
      await api.put('/user/profile', { 
        objective, 
        selected_machinery: selectedIds,
        setup_complete: true 
      });
      
      await refreshUser();
      navigate('/');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '800px' }}>
      <div className="card">
        {step === 1 ? (
            <>
                <h2>Step 1: Your Goals</h2>
                <p className="text-muted">What is your primary objective?</p>
                
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
                                <p className="text-muted" style={{ fontSize: '0.9rem' }}>Keep your current weight and tone muscles.</p>
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

                <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '2rem', padding: '1.25rem' }}
                    onClick={() => setStep(2)}
                >
                    Next: Configure Gym Equipment
                </button>
            </>
        ) : (
            <>
                <h2>Step 2: Your Equipment</h2>
                <p className="text-muted">Select the machines available at your gym. We'll use this to build your custom workouts.</p>
                
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                    gap: '1.5rem', 
                    marginTop: '2rem', 
                    marginBottom: '2rem',
                    maxHeight: '500px',
                    overflowY: 'auto',
                    paddingRight: '1rem'
                }}>
                    {machinery.map(m => (
                        <div 
                            key={m.id} 
                            onClick={() => toggleMachine(m.id)}
                            style={{ 
                                cursor: 'pointer', 
                                borderRadius: '1.25rem',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                border: selectedIds.includes(m.id) ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                                background: selectedIds.includes(m.id) ? 'rgba(0, 242, 254, 0.05)' : 'rgba(255,255,255,0.02)',
                                overflow: 'hidden'
                            }}
                        >
                            <img 
                                src={m.image_url} 
                                alt={m.name} 
                                style={{ width: '100%', height: '140px', objectFit: 'cover', opacity: selectedIds.includes(m.id) ? 1 : 0.6 }} 
                            />
                            <div style={{ padding: '1.25rem' }}>
                                <strong style={{ display: 'block', fontSize: '1rem', color: selectedIds.includes(m.id) ? 'var(--primary)' : 'white', marginBottom: '0.25rem' }}>{m.name}</strong>
                                <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>{m.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        className="btn btn-secondary" 
                        style={{ flex: 1, padding: '1.25rem' }}
                        onClick={() => setStep(1)}
                    >
                        Back
                    </button>
                    <button 
                        className="btn btn-primary" 
                        style={{ flex: 2, padding: '1.25rem' }}
                        onClick={handleCompleteSetup}
                        disabled={loading}
                    >
                        {loading ? 'Saving Profile...' : 'Complete Setup'}
                    </button>
                </div>
            </>
        )}
      </div>
    </div>
  );
};
