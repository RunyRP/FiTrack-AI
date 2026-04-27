import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';

interface Set {
    reps: number;
    weight: number;
}

interface LoggedExercise {
    exercise_name: string;
    machine_id?: number;
    sets: Set[];
}

export const WorkoutSuggestions = () => {
  const { user } = useAuth();
  const [suggestionData, setSuggestionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'routine' | 'history'>('routine');
  
  // Logging state
  const [workoutName, setWorkoutName] = useState('My Workout');
  const [loggedExercises, setLoggedExercises] = useState<Record<string, Set[]>>({});
  const [saving, setLogging] = useState(false);
  const [workoutHistory, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
    // Automatically generate suggestion if profile has machinery
    if (user?.profile?.selected_machinery?.length > 0) {
        handleSuggest();
    }
  }, [user]);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/workout/history');
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSuggest = async () => {
    setLoading(true);
    try {
      // Backend now automatically uses profile machinery if none provided
      const res = await api.get('/workout/suggest');
      setSuggestionData(res.data);
      
      const initialLogs: Record<string, Set[]> = {};
      res.data.suggestions.forEach((s: any) => {
          initialLogs[s.exercise_name] = [{ reps: 10, weight: 0 }];
      });
      setLoggedExercises(initialLogs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addSet = (exName: string) => {
      setLoggedExercises(prev => ({
          ...prev,
          [exName]: [...prev[exName], { reps: 10, weight: prev[exName][prev[exName].length-1].weight }]
      }));
  };

  const updateSet = (exName: string, setIdx: number, field: keyof Set, value: number) => {
    setLoggedExercises(prev => {
        const newSets = [...prev[exName]];
        newSets[setIdx] = { ...newSets[setIdx], [field]: value };
        return { ...prev, [exName]: newSets };
    });
  };

  const handleSaveWorkout = async () => {
      setLogging(true);
      try {
          const exercises: LoggedExercise[] = Object.entries(loggedExercises).map(([name, sets]) => ({
              exercise_name: name,
              machine_id: suggestionData.suggestions.find((s: any) => s.exercise_name === name)?.machine_id,
              sets: sets
          }));

          await api.post('/workout/session', {
              name: workoutName,
              exercises: exercises
          });
          
          alert('Workout saved successfully!');
          fetchHistory();
          setActiveTab('history');
      } catch (err) {
          console.error(err);
          alert('Error saving workout.');
      } finally {
          setLogging(false);
      }
  };

  const formatObjective = (obj: string) => {
    return obj.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // If no machinery selected, show a prompt
  if (!user?.profile?.selected_machinery || user.profile.selected_machinery.length === 0) {
      return (
          <div className="container animate-fade-in">
              <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                  <h2 style={{ marginBottom: '1rem' }}>No Equipment Selected</h2>
                  <p className="text-muted" style={{ marginBottom: '2rem' }}>Please select the equipment available at your gym to get custom workouts.</p>
                  <Link to="/setup" state={{ equipmentOnly: true }} className="btn btn-primary">Configure My Gym</Link>
              </div>
          </div>
      );
  }

  return (
    <div className="container animate-fade-in">
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
        <div className="nav-links" style={{ display: 'flex', borderRadius: 0, border: 'none', background: 'rgba(255,255,255,0.03)', padding: '0.5rem' }}>
            <button 
                onClick={() => setActiveTab('routine')}
                className={`btn ${activeTab === 'routine' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, borderRadius: '0.75rem' }}
            >
                Live Workout
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, borderRadius: '0.75rem' }}
            >
                Session History
            </button>
        </div>
      </div>

      {activeTab === 'routine' && (
        <div className="animate-fade-in">
          {loading ? (
              <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                  <div className="stat-value" style={{ fontSize: '1.5rem' }}>Analyzing Profile & Generating Routine...</div>
              </div>
          ) : suggestionData ? (
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <input 
                            type="text" 
                            value={workoutName} 
                            onChange={(e) => setWorkoutName(e.target.value)}
                            style={{ background: 'transparent', border: 'none', fontSize: '2rem', fontWeight: 800, color: 'white', padding: 0, width: '100%' }}
                        />
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                            <p className="text-muted" style={{ margin: 0 }}>{formatObjective(suggestionData.objective)} Focus</p>
                            <Link to="/setup" state={{ equipmentOnly: true }} style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>Change Equipment</Link>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleSaveWorkout} disabled={saving}>
                        {saving ? 'Saving...' : 'Finish & Save'}
                    </button>
                </div>

            {suggestionData.suggestions.map((s: any, idx: number) => (
              <div key={idx} className="card" style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.05)', marginBottom: '1.5rem', overflow: 'hidden', padding: 0 }}>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    {s.machine_image && (
                        <div style={{ width: '180px', height: '180px' }}>
                            <img src={s.machine_image} alt={s.exercise_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    )}
                    <div style={{ flex: 1, padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>{s.exercise_name}</h3>
                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Target: {s.muscles.join(', ')}</span>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>
                                {s.sets} SETS × {s.reps} REPS
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {loggedExercises[s.exercise_name]?.map((set, sIdx) => (
                                <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                                    <span style={{ fontWeight: 800, color: 'var(--text-muted)', width: '20px' }}>{sIdx + 1}</span>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>KG</label>
                                        <input 
                                            type="number" 
                                            value={set.weight} 
                                            onChange={(e) => updateSet(s.exercise_name, sIdx, 'weight', parseFloat(e.target.value) || 0)}
                                            style={{ width: '70px', padding: '0.4rem', borderRadius: '0.4rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>REPS</label>
                                        <input 
                                            type="number" 
                                            value={set.reps} 
                                            onChange={(e) => updateSet(s.exercise_name, sIdx, 'reps', parseInt(e.target.value) || 0)}
                                            style={{ width: '70px', padding: '0.4rem', borderRadius: '0.4rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                        />
                                    </div>
                                    {sIdx === loggedExercises[s.exercise_name].length - 1 && (
                                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }} onClick={() => addSet(s.exercise_name)}>+</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
              </div>
            ))}
            </div>
          ) : null}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="animate-fade-in">
            <h2>Workout History</h2>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>Your past sessions and performance.</p>
            
            {workoutHistory.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <p className="text-muted">No workouts logged yet. Start a new session!</p>
                </div>
            )}

            {workoutHistory.map((session, idx) => (
                <div key={idx} className="card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>{session.name}</h3>
                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>{new Date(session.date).toLocaleDateString()} at {new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div style={{ background: 'rgba(0,242,254,0.1)', color: 'var(--primary)', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700 }}>
                            {session.exercises.length} Exercises
                        </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        {session.exercises.map((ex: any, exIdx: number) => {
                            const maxWeight = Math.max(...ex.sets.map((s: any) => s.weight));
                            const totalReps = ex.sets.reduce((acc: number, s: any) => acc + s.reps, 0);
                            return (
                                <div key={exIdx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{ex.exercise_name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Best: {maxWeight}kg • Total: {totalReps} reps
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};
