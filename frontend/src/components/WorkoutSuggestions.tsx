import { useState, useEffect } from 'react';
import api from '../api';

export const WorkoutSuggestions = () => {
  const [machinery, setMachinery] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [suggestionData, setSuggestionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMachinery = async () => {
      try {
        const res = await api.get('/workout/machinery');
        setMachinery(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMachinery();
  }, []);

  const toggleMachine = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const handleSuggest = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      const res = await api.get('/workout/suggest', {
        params: { machine_ids: selectedIds },
        paramsSerializer: { 
           serialize: (params) => {
             const parts = [];
             for (const [key, value] of Object.entries(params)) {
               if (Array.isArray(value)) {
                 value.forEach(v => parts.push(`${key}=${v}`));
               } else {
                 parts.push(`${key}=${value}`);
               }
             }
             return parts.join('&');
           }
        }
      });
      setSuggestionData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatObjective = (obj: string) => {
    return obj.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Your Gym Equipment</h2>
        <p className="text-muted">Select the machines available at your gym to get a personalized routine</p>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
          gap: '1rem', 
          marginTop: '1.5rem', 
          marginBottom: '1.5rem',
          maxHeight: '400px',
          overflowY: 'auto',
          padding: '0.5rem'
        }}>
          {machinery.map(m => (
            <div 
              key={m.id} 
              className={`card ${selectedIds.includes(m.id) ? 'active-machine' : ''}`}
              onClick={() => toggleMachine(m.id)}
              style={{ 
                cursor: 'pointer', 
                padding: '1rem', 
                marginBottom: 0,
                transition: 'all 0.2s ease',
                border: selectedIds.includes(m.id) ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                background: selectedIds.includes(m.id) ? 'rgba(0, 255, 127, 0.05)' : 'transparent'
              }}
            >
              <strong>{m.name}</strong>
            </div>
          ))}
        </div>

        <button 
          className="btn btn-primary" 
          onClick={handleSuggest} 
          disabled={selectedIds.length === 0 || loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Analyzing Your Profile...' : 'Generate Personalized Plan'}
        </button>
      </div>

      {suggestionData && (
        <div className="card" style={{ borderTop: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3>Targeted Plan: {formatObjective(suggestionData.objective)}</h3>
              <p className="text-muted">{suggestionData.parameters.focus}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="stat-value">{suggestionData.parameters.reps}</div>
              <p className="text-muted">Target Reps</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{suggestionData.parameters.sets}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>SETS</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{suggestionData.parameters.reps}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>REPS</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{suggestionData.parameters.rest}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>REST</div>
            </div>
          </div>

          <h4>Recommended Routine</h4>
          <div style={{ marginTop: '1rem' }}>
            {suggestionData.suggestions.map((s: any, idx: number) => (
              <div key={idx} className="meal-item" style={{ padding: '1.25rem 0' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{s.exercise_name}</div>
                  <div className="text-muted" style={{ fontSize: '0.9rem' }}>Machine: {s.machine_name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                    {s.muscles.join(', ')}
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Primary Target</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
