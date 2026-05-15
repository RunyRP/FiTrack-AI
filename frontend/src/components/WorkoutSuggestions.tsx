import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../App';
import { Link, useNavigate } from 'react-router-dom';
import { WorkoutSplits } from './WorkoutSplits';
import { CoffeeIcon } from './Icons';

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
  const navigate = useNavigate();
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
  const [machinery, setMachinery] = useState<any[]>([]);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [showAllMachinery, setShowAllMachinery] = useState(false);
  
  // New workout flow
  const [isStartingNew, setIsStartingNew] = useState(false);
  const [availableSplits, setAvailableSplits] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
    fetchNextWorkout();
    fetchMachinery();
    fetchSplits();
  }, [user]);

  const fetchSplits = async () => {
    try {
        const res = await api.get('/workout/splits');
        setAvailableSplits(res.data);
    } catch (err) {
        console.error(err);
    }
  };

  const fetchMachinery = async () => {
    try {
      const res = await api.get('/workout/machinery');
      setMachinery(res.data);
    } catch (err) {
      console.error(err);
    }
  };

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
        } else if (res.data.is_gym_day) {
            await handleSuggest();
        } else {
            setLoading(false);
        }
    } catch (err) {
        console.error(err);
        setLoading(false);
    }
  };

  const handleStartSplitWorkout = (split: any) => {
    setWorkoutName(split.name);
    setSelectedSplitId(split.id);
    
    const initialLogs: Record<string, Set[]> = {};
    split.exercises.forEach((ex: any) => {
        initialLogs[ex.name] = [{ reps: ex.target_reps, weight: 0 }];
    });
    setLoggedExercises(initialLogs);
    
    setSuggestionData({
        objective: user?.profile?.objective || 'maintain',
        suggestions: split.exercises.map((ex: any) => ({
            exercise_name: ex.name,
            machine_id: ex.machine_id,
            muscles: [ex.muscle_group], 
            reps: ex.target_reps,
            sets: ex.target_sets
        }))
    });
    setIsStartingNew(false);
  };

  const handleStartCustomWorkout = (name: string) => {
    setWorkoutName(name || 'Custom Workout');
    setSelectedSplitId(null);
    setLoggedExercises({});
    setSuggestionData({
        objective: 'custom',
        suggestions: []
    });
    setIsStartingNew(false);
    setIsAddingExercise(true); // Automatically open the add exercise view for custom workouts
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

  const handleRemoveExercise = (exName: string) => {
    setSuggestionData((prev: any) => ({
        ...prev,
        suggestions: prev.suggestions.filter((s: any) => s.exercise_name !== exName)
    }));
    setLoggedExercises(prev => {
        const next = { ...prev };
        delete next[exName];
        return next;
    });
  };

  const handleAddCustomExercise = (machineData: string) => {
    let name = '';
    let machine_id: number | undefined = undefined;

    if (machineData.includes('|')) {
        const parts = machineData.split('|');
        name = parts[0];
        machine_id = parseInt(parts[1]);
    } else {
        name = machineData;
    }

    if (!name) return;

    setSuggestionData((prev: any) => ({
        ...prev,
        suggestions: [...prev.suggestions, {
            exercise_name: name,
            machine_id: machine_id,
            muscles: [],
            reps: 12,
            sets: 3
        }]
    }));

    setLoggedExercises(prev => ({
        ...prev,
        [name]: [{ reps: 10, weight: 0 }]
    }));
    
    setIsAddingExercise(false);
  };

  const handleCancelWorkout = () => {
    if (confirm('Are you sure you want to cancel this live workout? All progress will be lost.')) {
        setLoggedExercises({});
        setWorkoutName('My Workout');
        setSelectedSplitId(null);
        setSuggestionData(null); // Clear active workout data
        setIsStartingNew(false);
        setIsAddingExercise(false);
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

  const categorizeMachine = (m: any) => {
    const primaryMuscle = m.exercises?.[0]?.muscles?.[0] || 'Other';
    const muscle = primaryMuscle.toLowerCase();
    
    if (muscle.includes('quad') || muscle.includes('leg') || muscle.includes('glute') || muscle.includes('hamstring') || muscle.includes('calf')) return 'Legs';
    if (muscle.includes('chest') || muscle.includes('pectoral')) return 'Chest';
    if (muscle.includes('back') || muscle.includes('lat') || muscle.includes('row')) return 'Back';
    if (muscle.includes('shoulder') || muscle.includes('delt')) return 'Shoulders';
    if (muscle.includes('bicep') || muscle.includes('tricep') || muscle.includes('arm')) return 'Arms';
    if (muscle.includes('core') || muscle.includes('ab') || muscle.includes('stomach')) return 'Core';
    return 'Other';
  };

  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('Chest');
  const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core', 'Other'];

  return (
    <div className="container animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0 }}>Training</h1>
          <button 
              className="btn btn-primary" 
              style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
              onClick={() => navigate('/setup', { state: { equipmentOnly: true } })}
          >
              YOUR GYM EQUIPMENT
          </button>
      </div>

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
          {isStartingNew ? (
              <div className="card animate-fade-in" style={{ border: '1px solid var(--primary)', background: 'rgba(251, 197, 49, 0.05)', marginBottom: '2rem' }}>
                  <h2 style={{ marginBottom: '1.5rem' }}>Start New Workout</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                      <div>
                          <label className="text-muted" style={{ display: 'block', marginBottom: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Custom Workout</label>
                          <div className="input-group">
                              <input 
                                  type="text" 
                                  placeholder="e.g. Morning Pump" 
                                  onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleStartCustomWorkout((e.target as HTMLInputElement).value);
                                  }}
                                  style={{ marginBottom: '1rem' }}
                              />
                              <button className="btn btn-primary" onClick={(e) => {
                                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                  handleStartCustomWorkout(input.value);
                              }} style={{ width: '100%' }}>Start Custom session</button>
                          </div>
                      </div>
                      <div>
                          <label className="text-muted" style={{ display: 'block', marginBottom: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>From Split</label>
                          <div className="input-group">
                              <select 
                                  onChange={(e) => {
                                      const split = availableSplits.find(s => s.id === parseInt(e.target.value));
                                      if (split) handleStartSplitWorkout(split);
                                  }}
                                  defaultValue=""
                              >
                                  <option value="" disabled>Choose a split...</option>
                                  {availableSplits.map(split => (
                                      <option key={split.id} value={split.id}>
                                          {split.name} ({split.exercises.length} Exercises)
                                      </option>
                                  ))}
                              </select>
                              {availableSplits.length === 0 && <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>No splits configured.</p>}
                          </div>
                      </div>
                  </div>
                  <button className="btn btn-secondary" onClick={() => setIsStartingNew(false)} style={{ width: '100%', marginTop: '2rem' }}>Cancel</button>
              </div>
          ) : !suggestionData && (
            <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', marginBottom: '2rem', textAlign: 'center', padding: '4rem' }}>
                {nextWorkout && !nextWorkout.is_gym_day && (
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ marginBottom: '1rem', color: 'var(--primary)' }}>
                            <CoffeeIcon size={64} />
                        </div>                        <h2 style={{ margin: 0 }}>Rest Day</h2>
                        <p className="text-muted">Enjoy your recovery! But if you're feeling energetic...</p>
                    </div>
                )}
                <button onClick={() => setIsStartingNew(true)} className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1rem' }}>+ Add New Workout</button>
                {nextWorkout && nextWorkout.is_gym_day && !nextWorkout.split_id && (
                    <p className="text-muted" style={{ marginTop: '1.5rem', fontSize: '0.8rem' }}>
                        Tip: Configure your <span style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setActiveTab('splits')}>Workout Splits</span> for automated routines.
                    </p>
                )}
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
                            <button 
                                onClick={() => handleRemoveExercise(s.exercise_name)}
                                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem' }}
                                title="Remove Exercise"
                            >
                                ×
                            </button>
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

            {isAddingExercise ? (
                <div className="card animate-fade-in" style={{ border: '1px solid var(--primary)', background: 'rgba(251, 197, 49, 0.05)' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Add Extra Exercise</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'end' }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Muscle Group</label>
                            <select 
                                value={selectedMuscleGroup}
                                onChange={(e) => setSelectedMuscleGroup(e.target.value)}
                            >
                                {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                            </select>
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label style={{ margin: 0 }}>Select Exercise</label>
                                <div 
                                    onClick={() => setShowAllMachinery(!showAllMachinery)}
                                    style={{ 
                                        fontSize: '0.65rem', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '0.4rem', 
                                        cursor: 'pointer', 
                                        color: showAllMachinery ? 'var(--primary)' : 'var(--text-muted)',
                                        background: showAllMachinery ? 'rgba(251, 197, 49, 0.1)' : 'rgba(255,255,255,0.05)',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '0.4rem',
                                        border: `1px solid ${showAllMachinery ? 'var(--primary)' : 'transparent'}`,
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ 
                                        width: '8px', 
                                        height: '8px', 
                                        borderRadius: '50%', 
                                        background: showAllMachinery ? 'var(--primary)' : 'rgba(255,255,255,0.2)' 
                                    }} />
                                    SHOW ALL
                                </div>
                            </div>
                            <select 
                                onChange={(e) => handleAddCustomExercise(e.target.value)}
                                defaultValue=""
                            >
                                <option value="" disabled>Choose...</option>
                                {machinery
                                    .filter(m => categorizeMachine(m) === selectedMuscleGroup)
                                    .filter(m => showAllMachinery || !user?.profile?.selected_machinery || user.profile.selected_machinery.includes(m.id))
                                    .map(m => (
                                        m.exercises.map((e: any) => (
                                            <option key={`${m.id}-${e.name}`} value={`${e.name}|${m.id}`}>{e.name} ({m.name})</option>
                                        ))
                                    ))}
                                <option value="Custom">Custom Exercise...</option>
                            </select>
                        </div>
                    </div>
                    {machinery
                        .filter(m => categorizeMachine(m) === selectedMuscleGroup)
                        .filter(m => showAllMachinery || !user?.profile?.selected_machinery || user.profile.selected_machinery.includes(m.id))
                        .length === 0 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '1rem', textAlign: 'center' }}>
                                No machines found in your gym for this group. 
                                <span style={{ cursor: 'pointer', textDecoration: 'underline', marginLeft: '0.3rem' }} onClick={() => setShowAllMachinery(true)}>Show all equipment?</span>
                            </div>
                        )
                    }
                    <button className="btn btn-secondary" onClick={() => setIsAddingExercise(false)} style={{ width: '100%', marginTop: '1.5rem' }}>Cancel</button>
                </div>
            ) : (
                <button 
                    className="btn btn-secondary" 
                    onClick={() => setIsAddingExercise(true)}
                    style={{ width: '100%', borderStyle: 'dashed', marginTop: '1rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                >
                    + Add Extra Exercise
                </button>
            )}
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
