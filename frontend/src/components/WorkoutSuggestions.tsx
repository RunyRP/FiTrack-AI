import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';
import { WorkoutSplits } from './WorkoutSplits';

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
  const [nextWorkout, setNextWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'routine' | 'history' | 'splits'>('routine');
  
  // Logging state
  const [workoutName, setWorkoutName] = useState('My Workout');
  const [loggedExercises, setLoggedExercises] = useState<Record<string, Set[]>>({});
  const [saving, setLogging] = useState(false);
  const [workoutHistory, setHistory] = useState<any[]>([]);
  const [selectedSplitId, setSelectedSplitId] = useState<number | null>(null);

  useEffect(() => {
    fetchHistory();
    fetchNextWorkout();
  }, [user]);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/workout/history');
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNextWorkout = async () => {
    setLoading(true);
    try {
        const res = await api.get('/workout/next');
        setNextWorkout(res.data);
        if (res.data.split_id) {
            applyNextWorkout(res.data);
            setLoading(false);
        } else {
            await handleSuggest();
        }
    } catch (err) {
        console.error(err);
        await handleSuggest();
    }
  };

  const applyNextWorkout = (data: any) => {
    setWorkoutName(data.split_name);
    setSelectedSplitId(data.split_id);
    
    const initialLogs: Record<string, Set[]> = {};
    data.exercises.forEach((ex: any) => {
        initialLogs[ex.exercise_name] = ex.last_sets.map((s: any) => ({
            reps: s.reps,
            weight: s.weight
        }));
    });
    setLoggedExercises(initialLogs);
    
    // Format suggestion data structure for the UI
    setSuggestionData({
        objective: user?.profile?.objective || 'maintain',
        suggestions: data.exercises.map((ex: any) => ({
            exercise_name: ex.exercise_name,
            machine_id: ex.machine_id,
            muscles: [], 
            reps: ex.target_reps,
            sets: ex.target_sets
        }))
    });
  };

  const handleSuggest = async () => {
    try {
      const res = await api.get('/workout/suggest');
      setSuggestionData(res.data);
      
      const initialLogs: Record<string, Set[]> = {};
      res.data.suggestions.forEach((s: any) => {
          initialLogs[s.exercise_name] = [{ reps: 10, weight: 0 }];
      });
      setLoggedExercises(initialLogs);
      setWorkoutName('My Workout');
      setSelectedSplitId(null);
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

  const removeSet = (exName: string, setIdx: number) => {
    setLoggedExercises(prev => {
        if (prev[exName].length <= 1) return prev; // Keep at least one set
        const newSets = prev[exName].filter((_, i) => i !== setIdx);
        return { ...prev, [exName]: newSets };
    });
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
              split_id: selectedSplitId,
              exercises: exercises
          });
          
          alert('Workout saved successfully!');
          fetchHistory();
          fetchNextWorkout();
          setActiveTab('history');
      } catch (err) {
          console.error(err);
          alert('Error saving workout.');
      } finally {
          setLogging(false);
      }
  };

  const handleCancelWorkout = () => {
    if (confirm('Are you sure you want to cancel this live workout? All progress will be lost.')) {
        setLoggedExercises({});
        setWorkoutName('My Workout');
        setSelectedSplitId(null);
        setNextWorkout(null);
        handleSuggest();
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (confirm('Are you sure you want to delete this workout session?')) {
        try {
            await api.delete(`/workout/session/${sessionId}`);
            fetchHistory();
        } catch (err) {
            console.error(err);
            alert('Error deleting workout.');
        }
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
                onClick={() => setActiveTab('splits')}
                className={`btn ${activeTab === 'splits' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, borderRadius: '0.75rem' }}
            >
                Workout Splits
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
          {nextWorkout && !nextWorkout.split_id && (
            <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', marginBottom: '2rem', textAlign: 'center' }}>
                <p className="text-muted" style={{ margin: 0 }}>
                    {nextWorkout.is_gym_day 
                        ? "It's a gym day! Set up your splits to get started." 
                        : "Today is a rest day. Enjoy your recovery!"}
                </p>
                <button onClick={() => setActiveTab('splits')} className="btn btn-secondary" style={{ marginTop: '1rem', fontSize: '0.8rem' }}>Configure Splits</button>
            </div>
          )}

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
                            {selectedSplitId && <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem' }}>SCHEDULED SPLIT</span>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn btn-secondary" onClick={handleCancelWorkout}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSaveWorkout} disabled={saving}>
                            {saving ? 'Saving...' : 'Finish & Save'}
                        </button>
                    </div>
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
                                {s.muscles && <span className="text-muted" style={{ fontSize: '0.8rem' }}>Target: {s.muscles.join(', ')}</span>}
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
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        {sIdx > 0 && (
                                            <button 
                                                className="btn btn-secondary" 
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', minWidth: '35px' }} 
                                                onClick={() => removeSet(s.exercise_name, sIdx)}
                                                title="Remove Set"
                                            >
                                                -
                                            </button>
                                        )}
                                        {sIdx === loggedExercises[s.exercise_name].length - 1 && (
                                            <button 
                                                className="btn btn-secondary" 
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', minWidth: '35px', color: 'var(--primary)', borderColor: 'var(--primary)' }} 
                                                onClick={() => addSet(s.exercise_name)}
                                                title="Add Set"
                                            >
                                                +
                                            </button>
                                        )}
                                    </div>
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

      {activeTab === 'splits' && (
          <WorkoutSplits />
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
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            {session.split_id && (
                                <div style={{ border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700 }}>
                                    Split session
                                </div>
                            )}
                            <div style={{ background: 'rgba(0,242,254,0.1)', color: 'var(--primary)', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700 }}>
                                {session.exercises.length} Exercises
                            </div>
                            <button 
                                onClick={() => handleDeleteSession(session.id)}
                                style={{ background: 'transparent', border: 'none', color: 'rgba(255,0,0,0.5)', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem' }}
                                title="Delete Session"
                            >
                                ×
                            </button>
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
