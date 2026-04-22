import { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export const Setup = () => {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('maintain');
  const [machinery, setMachinery] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();

  useEffect(() => {
      if (step === 2) {
          fetchMachinery();
      }
      if (user?.profile) {
          setName(user.profile.name || '');
          setObjective(user.profile.objective || 'maintain');
      }
  }, [step, user]);

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
        name,
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
        {step === 0 && (
            <div className="animate-fade-in">
                <h2>Step 1: Introduction</h2>
                <p className="text-muted">Let's start with the basics. How should we call you?</p>
                <div className="input-group" style={{ marginTop: '2rem' }}>
                    <label>Your Name</label>
                    <input 
                        type="text" 
                        placeholder="Enter your name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        style={{ fontSize: '1.2rem', padding: '1.25rem' }}
                    />
                </div>
                <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '1rem', padding: '1.25rem' }}
                    onClick={() => setStep(1)}
                    disabled={!name.trim()}
                >
                    Next: Choose Your Goal
                </button>
            </div>
        )}

        {step === 1 && (
            <div className="animate-fade-in">
                <h2>Step 2: Your Goal</h2>
                <p className="text-muted">Hi {name}, what's your primary fitness objective?</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '2rem' }}>
                    {[
                        { id: 'lose_weight', label: 'Weight Loss', desc: 'Burn fat and improve health.', icon: '📉' },
                        { id: 'body_recomposition', label: 'Body Recomposition', desc: 'Lose fat and build muscle simultaneously.', icon: '🔄' },
                        { id: 'gain_muscle', label: 'Muscle Gain', desc: 'Build strength and mass.', icon: '💪' },
                        { id: 'maintain', label: 'Maintenance', desc: 'Keep current weight and tone.', icon: '⚖️' }
                    ].map(opt => (
                        <div 
                            key={opt.id}
                            className="card"
                            onClick={() => setObjective(opt.id)}
                            style={{ 
                                cursor: 'pointer', padding: '1.25rem', marginBottom: 0,
                                border: objective === opt.id ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                                background: objective === opt.id ? 'rgba(0, 242, 254, 0.05)' : undefined,
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                <span style={{ fontSize: '1.5rem' }}>{opt.icon}</span>
                                <div>
                                    <strong style={{ color: objective === opt.id ? 'var(--primary)' : 'white' }}>{opt.label}</strong>
                                    <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>{opt.desc}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(0)}>Back</button>
                    <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => setStep(2)}>Next: Equipment</button>
                </div>
            </div>
        )}

        {step === 2 && (
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2>Step 3: Equipment (Optional)</h2>
                        <p className="text-muted">Select the machines you have. Skip to use only bodyweight.</p>
                    </div>
                    <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                        onClick={handleCompleteSetup}
                    >
                        Skip & Finish
                    </button>
                </div>
                
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
                    gap: '1rem', 
                    marginTop: '2rem', 
                    marginBottom: '2rem',
                    maxHeight: '450px',
                    overflowY: 'auto',
                    paddingRight: '0.5rem'
                }}>
                    {machinery.map(m => (
                        <div 
                            key={m.id} 
                            onClick={() => toggleMachine(m.id)}
                            style={{ 
                                cursor: 'pointer', borderRadius: '1rem', overflow: 'hidden',
                                border: selectedIds.includes(m.id) ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                                background: selectedIds.includes(m.id) ? 'rgba(0, 242, 254, 0.05)' : 'rgba(255,255,255,0.02)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <img src={m.image_url} alt={m.name} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                            <div style={{ padding: '1rem' }}>
                                <strong style={{ fontSize: '0.9rem', color: selectedIds.includes(m.id) ? 'var(--primary)' : 'white' }}>{m.name}</strong>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>Back</button>
                    <button 
                        className="btn btn-primary" 
                        style={{ flex: 2 }} 
                        onClick={handleCompleteSetup}
                        disabled={loading}
                    >
                        {loading ? 'Finalizing...' : (selectedIds.length > 0 ? 'Save & Start Training' : 'Use Bodyweight Only')}
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
