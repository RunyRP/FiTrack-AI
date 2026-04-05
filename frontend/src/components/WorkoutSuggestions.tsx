import { useState, useEffect } from 'react';
import api from '../api';

export const WorkoutSuggestions = () => {
  const [machinery, setMachinery] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
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
        paramsSerializer: { indexes: null } // Handle multiple IDs in query
      });
      setSuggestions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Your Gym Equipment</h2>
        <p className="text-muted">Select the machines available at your gym</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
          {machinery.map(m => (
            <div 
              key={m.id} 
              className={`card ${selectedIds.includes(m.id) ? 'active-machine' : ''}`}
              onClick={() => toggleMachine(m.id)}
              style={{ 
                cursor: 'pointer', 
                padding: '1rem', 
                marginBottom: 0,
                border: selectedIds.includes(m.id) ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)'
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
        >
          {loading ? 'Generating...' : 'Suggest Workouts'}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="card">
          <h3>Suggested Exercises</h3>
          {suggestions.map((s, idx) => (
            <div key={idx} className="meal-item">
              <div>
                <strong>{s.exercise_name}</strong>
                <p className="text-muted">Machine: {s.machine_name}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p>{s.muscles.join(', ')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
