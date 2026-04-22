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
    <div className="container animate-fade-in">
      <div className="card">
        <h2>Your Gym Setup</h2>
        <p className="text-muted">Select the machines available at your gym to get a personalized routine.</p>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
          gap: '1rem', 
          marginTop: '2rem', 
          marginBottom: '2rem',
          maxHeight: '400px',
          overflowY: 'auto',
          paddingRight: '0.5rem'
        }}>
          {machinery.map(m => (
            <div 
              key={m.id} 
              onClick={() => toggleMachine(m.id)}
              style={{ 
                cursor: 'pointer', 
                padding: '1.25rem', 
                borderRadius: '1rem',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                border: selectedIds.includes(m.id) ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                background: selectedIds.includes(m.id) ? 'rgba(0, 242, 254, 0.05)' : 'rgba(255,255,255,0.02)',
                color: selectedIds.includes(m.id) ? 'var(--primary)' : 'white',
                fontWeight: 600,
                textAlign: 'center'
              }}
            >
              {m.name}
            </div>
          ))}
        </div>

        <button 
          className="btn btn-primary" 
          onClick={handleSuggest} 
          disabled={selectedIds.length === 0 || loading}
          style={{ width: '100%', padding: '1.25rem' }}
        >
          {loading ? 'Analyzing Profile & Equipment...' : 'Generate Personalized Plan'}
        </button>
      </div>

      {suggestionData && (
        <div className="card animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Plan: {formatObjective(suggestionData.objective)}</h3>
              <div style={{ 
                display: 'inline-block',
                padding: '0.25rem 0.75rem',
                borderRadius: '2rem',
                background: 'rgba(0,255,175,0.1)',
                color: 'var(--success)',
                fontSize: '0.75rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {suggestionData.parameters.focus}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="stat-value" style={{ fontSize: '2.5rem' }}>{suggestionData.parameters.reps}</div>
              <p className="text-muted" style={{ fontWeight: 600 }}>TARGET REPS</p>
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '1px', 
            marginBottom: '3rem', 
            background: 'rgba(255,255,255,0.1)', 
            borderRadius: '1.25rem',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '1.5rem' }}>
              <div className="stat-value" style={{ fontSize: '1.75rem', margin: 0 }}>{suggestionData.parameters.sets}</div>
              <div className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em' }}>SETS</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '1.5rem' }}>
              <div className="stat-value" style={{ fontSize: '1.75rem', margin: 0 }}>{suggestionData.parameters.reps}</div>
              <div className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em' }}>REPS</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '1.5rem' }}>
              <div className="stat-value" style={{ fontSize: '1.75rem', margin: 0 }}>{suggestionData.parameters.rest}</div>
              <div className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em' }}>REST</div>
            </div>
          </div>

          <h3 style={{ marginBottom: '1.5rem' }}>Recommended Exercises</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {suggestionData.suggestions.map((s: any, idx: number) => (
              <div key={idx} className="meal-item" style={{ padding: '1.5rem' }}>
                <div className="meal-info">
                  <span className="meal-label" style={{ fontSize: '1.1rem' }}>{s.exercise_name}</span>
                  <span className="meal-meta">Using {s.machine_name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    color: 'var(--primary)', 
                    fontSize: '0.85rem', 
                    fontWeight: 700,
                    background: 'rgba(0, 242, 254, 0.1)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '0.5rem'
                  }}>
                    {s.muscles.join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
