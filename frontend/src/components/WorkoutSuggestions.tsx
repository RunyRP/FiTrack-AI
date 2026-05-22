import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api, { API_URL } from '../api';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { WorkoutSplits } from './WorkoutSplits';
import { CoffeeIcon } from './Icons';

interface Set {
    reps: number | string;
    weight: number | string;
    rpe: number | string;
}

interface LoggedExercise {
    exercise_name: string;
    machine_id?: number;
    sets: Set[];
}

export const WorkoutSuggestions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Initialize state from localStorage if available to prevent race conditions
  const [suggestionData, setSuggestionData] = useState<any>(() => {
    const saved = localStorage.getItem('activeWorkout');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            return data.suggestionData || null;
        } catch (e) { return null; }
    }
    return null;
  });

  const [workoutName, setWorkoutName] = useState<string>(() => {
    const saved = localStorage.getItem('activeWorkout');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            return data.workoutName || 'My Workout';
        } catch (e) { return 'My Workout'; }
    }
    return 'My Workout';
  });

  const [loggedExercises, setLoggedExercises] = useState<Record<string, Set[]>>(() => {
    const saved = localStorage.getItem('activeWorkout');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            return data.loggedExercises || {};
        } catch (e) { return {}; }
    }
    return {};
  });

  const [selectedSplitId, setSelectedSplitId] = useState<number | null>(() => {
    const saved = localStorage.getItem('activeWorkout');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            return data.selectedSplitId || null;
        } catch (e) { return null; }
    }
    return null;
  });

  const [nextWorkout, setNextWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'routine' | 'history' | 'splits'>('routine');
  
  // Logging state
  const [saving, setLogging] = useState(false);
  const [workoutHistory, setHistory] = useState<any[]>([]);
  const [machinery, setMachinery] = useState<any[]>([]);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [showAllMachinery, setShowAllMachinery] = useState(false);
  
  // New workout flow
  const [isStartingNew, setIsStartingNew] = useState(false);
  const [availableSplits, setAvailableSplits] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
    fetchNextWorkout(!!suggestionData);
    fetchMachinery();
    fetchSplits();
  }, [user]);

  // Save workout state to localStorage whenever it changes
  useEffect(() => {
    if (suggestionData) {
        localStorage.setItem('activeWorkout', JSON.stringify({
            workoutName,
            loggedExercises,
            suggestionData,
            selectedSplitId
        }));
    } else {
        localStorage.removeItem('activeWorkout');
    }
  }, [workoutName, loggedExercises, suggestionData, selectedSplitId]);

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

  const fetchNextWorkout = async (isResuming: boolean = false) => {
    setLoading(true);
    try {
        const res = await api.get('/workout/next');
        setNextWorkout(res.data);

        // If we are already resuming a saved session, DON'T auto-start another one
        if (isResuming) {
            setLoading(false);
            return;
        }

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
            weight: s.weight,
            rpe: '' // Removed default placeholder
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
          initialLogs[s.exercise_name] = [{ reps: 10, weight: 0, rpe: '' }];
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
          [exName]: [...prev[exName], { reps: 10, weight: prev[exName][prev[exName].length-1].weight, rpe: '' }]
      }));
  };

  const removeSet = (exName: string, setIdx: number) => {
    setLoggedExercises(prev => {
        if (prev[exName].length <= 1) return prev; // Keep at least one set
        const newSets = prev[exName].filter((_, i) => i !== setIdx);
        return { ...prev, [exName]: newSets };
    });
  };

  const updateSet = (exName: string, setIdx: number, field: keyof Set, value: string) => {
    let sanitizedValue = value;
    // Strip leading zeros if the user types something like "034"
    if (sanitizedValue.length > 1 && sanitizedValue.startsWith('0') && sanitizedValue[1] !== '.') {
        sanitizedValue = sanitizedValue.substring(1);
    }

    setLoggedExercises(prev => {
        const newSets = [...prev[exName]];
        newSets[setIdx] = { ...newSets[setIdx], [field]: sanitizedValue };
        return { ...prev, [exName]: newSets };
    });
  };

  const handleSaveWorkout = async () => {
      setLogging(true);
      try {
          const exercises: LoggedExercise[] = Object.entries(loggedExercises).map(([name, sets]) => ({
              exercise_name: name,
              machine_id: suggestionData.suggestions.find((s: any) => s.exercise_name === name)?.machine_id,
              // Sanitize: convert string inputs back to numbers before sending
              sets: sets.map(s => ({
                reps: parseInt(s.reps.toString()) || 10,
                weight: parseFloat(s.weight.toString()) || 0,
                rpe: parseFloat(s.rpe.toString()) || 8
              }))
          }));

          await api.post('/workout/session', {
              name: workoutName,
              split_id: selectedSplitId,
              exercises: exercises
          });
          
          alert('Workout saved successfully!');
          
          // Clear active workout state
          setLoggedExercises({});
          setWorkoutName('My Workout');
          setSelectedSplitId(null);
          setSuggestionData(null);
          setIsStartingNew(false);
          setIsAddingExercise(false);
          setPredictions({});
          
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
        [name]: [{ reps: 10, weight: 0, rpe: '' }]
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

  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
  };

  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('Chest');
  const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core', 'Other'];

  const [showAIModal, setShowAIModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMuscleGroup, setAiMuscleGroup] = useState('Total Body');
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [plateaus, setPlateaus] = useState<Record<string, any>>({});
  const [predicting, setPredicting] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Record<number, boolean>>({});
  const [showRPEInfo, setShowRPEInfo] = useState(false);

  const handleAnalyzePlateau = async (exerciseName: string, exerciseHistory: any[]) => {
    try {
        const res = await api.post('/workout/analyze-plateau', {
            exercise_name: exerciseName,
            history: [...exerciseHistory].reverse().slice(-4) // Last 4 sessions
        });
        if (res.data.success && res.data.analysis.is_plateau) {
            setPlateaus(prev => ({ ...prev, [exerciseName]: res.data.analysis }));
        }
    } catch (err) {
        console.error("Plateau analysis failed", err);
    }
  };

  const toggleSessionExpansion = (sessionId: number) => {
    setExpandedSessions(prev => ({ ...prev, [sessionId]: !prev[sessionId] }));
  };

  const getExerciseHistoryCount = (exerciseName: string) => {
    let count = 0;
    workoutHistory.forEach(session => {
        if (session.exercises.some((ex: any) => ex.exercise_name === exerciseName)) {
            count++;
        }
    });
    return count;
  };

  const closePrediction = (exerciseName: string) => {
    setPredictions(prev => {
        const next = { ...prev };
        delete next[exerciseName];
        return next;
    });
  };

  const closePlateau = (exerciseName: string) => {
    setPlateaus(prev => {
        const next = { ...prev };
        delete next[exerciseName];
        return next;
    });
  };

  const handlePredictLoad = async (exerciseName: string) => {
    setPredicting(exerciseName);
    try {
        // Actually, let's just fetch all history and filter
        const rawHistoryRes = await api.get('/workout/history?limit=50');
        const exerciseHistory: any[] = [];
        
        rawHistoryRes.data.forEach((session: any) => {
            const ex = session.exercises.find((e: any) => e.exercise_name === exerciseName);
            if (ex && ex.sets && ex.sets.length > 0) {
                // Average weight, sets count, average reps, average RPE
                const avgWeight = ex.sets.reduce((acc: number, s: any) => acc + s.weight, 0) / ex.sets.length;
                const avgReps = ex.sets.reduce((acc: number, s: any) => acc + s.reps, 0) / ex.sets.length;
                const avgRPE = ex.sets.reduce((acc: number, s: any) => acc + (s.rpe || 8), 0) / ex.sets.length;
                
                exerciseHistory.push({
                    date: session.date,
                    weight_kg: avgWeight,
                    sets: ex.sets.length,
                    reps: Math.round(avgReps),
                    rpe: avgRPE
                });
            }
        });

        if (exerciseHistory.length === 0) {
            alert("Insufficient history for AI analysis.");
            return;
        }

        // Run plateau analysis in parallel
        handleAnalyzePlateau(exerciseName, exerciseHistory);

        // 3. Call prediction endpoint
        const predictRes = await api.post('/workout/predict-next-load', {
            exercise_name: exerciseName,
            history: [...exerciseHistory].reverse().slice(-5) // Last 5 sessions, oldest to newest
        });

        if (predictRes.data.success) {
            setPredictions(prev => ({ ...prev, [exerciseName]: predictRes.data.prediction }));
        } else {
            alert("AI Prediction failed: " + predictRes.data.error);
        }
    } catch (err) {
        console.error(err);
        alert("Failed to get AI prediction.");
    } finally {
        setPredicting(null);
    }
  };

  const parseSetsAndReps = (str: string) => {
      // AI might return "3x10", "3 sets of 10 reps", "3 x 12", etc.
      const match = str.match(/(\d+)\s*[xX]\s*(\d+)/) || str.match(/(\d+)\s+sets?\s+of\s+(\d+)/);
      if (match) {
          return { sets: parseInt(match[1]), reps: parseInt(match[2]) };
      }
      return { sets: 3, reps: 10 }; // Default fallback
  };

  const handleAISuggest = async () => {
      setAiLoading(true);
      try {
          const res = await api.get(`/workout/ai-suggest?muscle_group=${aiMuscleGroup}`);
          if (res.data.status === 'error') {
              alert(res.data.message);
              return;
          }

          const workout = res.data.workout;
          setWorkoutName(`AI ${res.data.muscle_group} Workout`);
          setSelectedSplitId(null);

          const initialLogs: Record<string, Set[]> = {};
          workout.forEach((ex: any) => {
              const { sets, reps } = parseSetsAndReps(ex.sets_and_reps || "3x10");
              const setArray: Set[] = [];
              for (let i = 0; i < sets; i++) {
                  setArray.push({ reps, weight: 0, rpe: '' });
              }
              initialLogs[ex.exercise_name] = setArray.length > 0 ? setArray : [{ reps, weight: 0, rpe: '' }];
          });
          setLoggedExercises(initialLogs);

          setSuggestionData({
              objective: user?.profile?.objective || 'maintain',
              suggestions: workout.map((ex: any) => {
                  const { sets, reps } = parseSetsAndReps(ex.sets_and_reps || "3x10");
                  return {
                      exercise_name: ex.exercise_name,
                      machine_id: ex.machine_id,
                      machine_image: ex.image_url,
                      muscles: [res.data.muscle_group],
                      reps: reps,
                      sets: sets,
                      instructions: ex.basic_instructions,
                      safety: ex.safety_warning
                  };
              })
          });
          setShowAIModal(false);
          setActiveTab('routine');
      } catch (err) {
          console.error(err);
          alert('Failed to generate AI workout.');
      } finally {
          setAiLoading(false);
      }
  };
  return (
    <div className="container animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ margin: 0 }}>Training</h1>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button 
                  className="btn btn-secondary" 
                  style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', borderColor: 'var(--primary)', color: 'var(--primary)', flex: 1, minWidth: '150px' }}
                  onClick={() => setShowAIModal(true)}
              >
                  SUGGEST A WORKOUT
              </button>
              <button 
                  className="btn btn-primary" 
                  style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', flex: 1, minWidth: '150px' }}
                  onClick={() => navigate('/setup', { state: { equipmentOnly: true } })}
              >
                  YOUR GYM EQUIPMENT
              </button>
          </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
        <div className="nav-links" style={{ display: 'flex', borderRadius: 0, border: 'none', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', flexWrap: 'wrap' }}>
            <button 
                onClick={() => setActiveTab('routine')}
                className={`btn ${activeTab === 'routine' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, borderRadius: '0.75rem', margin: '0.2rem', minWidth: '100px' }}
            >
                Live Workout
            </button>
            <button 
                onClick={() => setActiveTab('splits')}
                className={`btn ${activeTab === 'splits' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, borderRadius: '0.75rem', margin: '0.2rem', minWidth: '100px' }}
            >
                Workout Splits
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, borderRadius: '0.75rem', margin: '0.2rem', minWidth: '100px' }}
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
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
            <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', marginBottom: '2rem', textAlign: 'center', padding: '4rem 1.5rem' }}>
                {nextWorkout && !nextWorkout.is_gym_day && (
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ marginBottom: '1rem', color: 'var(--primary)' }}>
                            <CoffeeIcon size={64} />
                        </div>                        <h2 style={{ margin: 0 }}>Rest Day</h2>
                        <p className="text-muted">Enjoy your recovery! But if you're feeling energetic...</p>
                    </div>
                )}
                <button onClick={() => setIsStartingNew(true)} className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1rem', width: '100%', maxWidth: '300px' }}>+ Add New Workout</button>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <input 
                            type="text" 
                            value={workoutName} 
                            onChange={(e) => setWorkoutName(e.target.value)}
                            style={{ background: 'transparent', border: 'none', fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 800, color: 'white', padding: 0, width: '100%' }}
                        />
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                            <p className="text-muted" style={{ margin: 0 }}>{formatObjective(suggestionData.objective)} Focus</p>
                            {selectedSplitId && <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem' }}>SCHEDULED SPLIT</span>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '400px' }}>
                        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleCancelWorkout}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveWorkout} disabled={saving}>
                            {saving ? 'Saving...' : 'Finish & Save'}
                        </button>
                    </div>
                </div>

            {suggestionData.suggestions.map((s: any, idx: number) => (
              <div key={idx} className="card" style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.05)', marginBottom: '1.5rem', overflow: 'hidden', padding: 0 }}>
                <div style={{ display: 'flex', gap: '0', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        {s.machine_image && (
                            <div style={{ width: '100%', height: '180px', maxWidth: '300px', flexShrink: 0 }}>
                                <img src={getImageUrl(s.machine_image)} alt={s.exercise_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        )}
                        <div style={{ flex: 1, padding: '1.5rem', minWidth: '280px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ margin: 0 }}>{s.exercise_name}</h3>
                                    {s.muscles && <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.2rem' }}>
                                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>Target: {s.muscles.join(', ')}</span>
                                    </div>}
                                </div>
                                <button 
                                    onClick={() => handleRemoveExercise(s.exercise_name)}
                                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem' }}
                                    title="Remove Exercise"
                                >
                                    ×
                                </button>
                            </div>

                            {plateaus[s.exercise_name] ? (
                                <div style={{ marginBottom: '1.5rem', background: 'rgba(255, 71, 87, 0.05)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #ff4757', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ff4757', textTransform: 'uppercase' }}>⚠️ Plateau Detected</div>
                                        <button 
                                            onClick={() => closePlateau(s.exercise_name)}
                                            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '1rem', padding: '0 0.2rem' }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>
                                        Suggested Phase: {plateaus[s.exercise_name].suggested_phase}
                                    </div>
                                    <p style={{ fontSize: '0.8rem', margin: 0, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                                        {plateaus[s.exercise_name].reasoning}
                                    </p>
                                    {plateaus[s.exercise_name].recommended_deload_weight_kg > 0 && (
                                        <button 
                                            className="btn btn-secondary" 
                                            style={{ fontSize: '0.65rem', padding: '0.3rem 0.7rem', marginTop: '0.75rem', width: '100%', borderColor: '#ff4757', color: '#ff4757' }}
                                            onClick={() => {
                                                const deloadWeight = plateaus[s.exercise_name].recommended_deload_weight_kg;
                                                setLoggedExercises(prev => {
                                                    const existingSets = prev[s.exercise_name] || [];
                                                    const updatedSets = existingSets.map(set => ({
                                                        ...set,
                                                        weight: deloadWeight
                                                    }));
                                                    return { ...prev, [s.exercise_name]: updatedSets };
                                                });
                                                closePlateau(s.exercise_name);
                                                closePrediction(s.exercise_name);
                                            }}
                                        >
                                            APPLY DELOAD: {plateaus[s.exercise_name].recommended_deload_weight_kg}kg
                                        </button>
                                    )}
                                </div>
                            ) : predictions[s.exercise_name] && (
                                <div style={{ marginBottom: '1.5rem', background: 'rgba(0, 242, 254, 0.05)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--primary)', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>AI Smart Prediction</div>
                                        <button 
                                            onClick={() => closePrediction(s.exercise_name)}
                                            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '1rem', padding: '0 0.2rem' }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div style={{ marginBottom: '0.5rem' }}>
                                        {predictions[s.exercise_name].recommended_sets?.map((rset: any, i: number) => (
                                            <div key={i} style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white' }}>
                                                Set {rset.set_number}: {rset.weight_kg}kg x {rset.target_reps} reps
                                            </div>
                                        ))}
                                    </div>
                                    <p style={{ fontSize: '0.8rem', margin: 0, fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                        "{predictions[s.exercise_name].reasoning}"
                                    </p>
                                    <button 
                                        className="btn btn-primary" 
                                        style={{ fontSize: '0.65rem', padding: '0.3rem 0.7rem', marginTop: '0.75rem', width: '100%' }}
                                        onClick={() => {
                                            const pred = predictions[s.exercise_name];
                                            if (pred.recommended_sets && pred.recommended_sets.length > 0) {
                                                setLoggedExercises(prev => {
                                                    const existingSets = prev[s.exercise_name] || [];
                                                    
                                                    const maxSets = Math.max(existingSets.length, pred.recommended_sets.length);
                                                    const updatedSets = [];

                                                    for (let i = 0; i < maxSets; i++) {
                                                        const baseSet = i < existingSets.length ? existingSets[i] : { rpe: '' };
                                                        const pSet = i < pred.recommended_sets.length 
                                                            ? pred.recommended_sets[i] 
                                                            : pred.recommended_sets[pred.recommended_sets.length - 1];
                                                        
                                                        updatedSets.push({
                                                            ...baseSet,
                                                            weight: parseFloat(pSet.weight_kg) || 0,
                                                            reps: parseInt(pSet.target_reps) || 10
                                                        });
                                                    }

                                                    return { ...prev, [s.exercise_name]: updatedSets };
                                                });
                                                closePrediction(s.exercise_name);
                                                closePlateau(s.exercise_name);
                                            }
                                        }}
                                    >
                                        APPLY PREDICTED LOAD
                                    </button>
                                </div>
                            )}

                            {s.instructions && (
                                <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.5rem', borderLeft: '3px solid var(--primary)' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Instructions</div>
                                    <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>{s.instructions}</p>
                                    {s.safety && (
                                        <div style={{ marginTop: '0.75rem', color: '#ff4757', fontSize: '0.8rem' }}>
                                            <strong>⚠️ Safety:</strong> {s.safety}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Log Sets</div>
                                {!predictions[s.exercise_name] && (
                                    <button 
                                        onClick={() => handlePredictLoad(s.exercise_name)}
                                        disabled={predicting === s.exercise_name || getExerciseHistoryCount(s.exercise_name) === 0}
                                        style={{ 
                                            background: getExerciseHistoryCount(s.exercise_name) === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(251, 197, 49, 0.1)', 
                                            border: '1px solid ' + (getExerciseHistoryCount(s.exercise_name) === 0 ? 'rgba(255,255,255,0.1)' : 'var(--primary)'), 
                                            color: getExerciseHistoryCount(s.exercise_name) === 0 ? 'var(--text-muted)' : 'var(--primary)', 
                                            fontSize: '0.65rem', 
                                            padding: '0.3rem 0.7rem', 
                                            borderRadius: '0.5rem',
                                            cursor: getExerciseHistoryCount(s.exercise_name) === 0 ? 'not-allowed' : 'pointer',
                                            fontWeight: 800,
                                            transition: 'all 0.2s ease'
                                        }}
                                        title={getExerciseHistoryCount(s.exercise_name) === 0 ? "Log this exercise at least once to enable AI predictions" : ""}
                                    >
                                        {predicting === s.exercise_name ? 'ANALYZING...' : 'PREDICT NEXT LOAD'}
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {loggedExercises[s.exercise_name]?.map((set, sIdx) => (
                                    <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '0.75rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 800, color: 'var(--text-muted)', width: '20px' }}>{sIdx + 1}</span>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: '70px' }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>KG</label>
                                            <input 
                                                type="number" 
                                                placeholder="0"
                                                value={set.weight} 
                                                onChange={(e) => updateSet(s.exercise_name, sIdx, 'weight', e.target.value)}
                                                style={{ width: '100%', padding: '0.4rem', borderRadius: '0.4rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.85rem' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: '70px' }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>REPS</label>
                                            <input 
                                                type="number" 
                                                placeholder="10"
                                                value={set.reps} 
                                                onChange={(e) => updateSet(s.exercise_name, sIdx, 'reps', e.target.value)}
                                                style={{ width: '100%', padding: '0.4rem', borderRadius: '0.4rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.85rem' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: '70px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>RPE</label>
                                                <span 
                                                    onClick={() => setShowRPEInfo(true)}
                                                    style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', width: '12px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: 'var(--text-muted)' }}
                                                >?</span>
                                            </div>
                                            <input 
                                                type="number" 
                                                min="1" max="10" step="0.5"
                                                placeholder="8"
                                                value={set.rpe} 
                                                onChange={(e) => updateSet(s.exercise_name, sIdx, 'rpe', e.target.value)}
                                                style={{ width: '100%', padding: '0.4rem', borderRadius: '0.4rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.85rem' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.4rem', width: 'auto', justifyContent: 'flex-end', marginLeft: 'auto' }}>
                                            {sIdx > 0 && (
                                                <button 
                                                    className="btn btn-secondary" 
                                                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', minWidth: '32px' }} 
                                                    onClick={() => removeSet(s.exercise_name, sIdx)}
                                                    title="Remove Set"
                                                >
                                                    -
                                                </button>
                                            )}
                                            {sIdx === loggedExercises[s.exercise_name].length - 1 ? (
                                                <button 
                                                    className="btn btn-secondary" 
                                                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', minWidth: '32px', color: 'var(--primary)', borderColor: 'var(--primary)' }} 
                                                    onClick={() => addSet(s.exercise_name)}
                                                    title="Add Set"
                                                >
                                                    +
                                                </button>
                                            ) : (
                                                <div style={{ width: '32px' }} />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            ))}

            {isAddingExercise ? (
                <div className="card animate-fade-in" style={{ border: '1px solid var(--primary)', background: 'rgba(251, 197, 49, 0.05)' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Add Extra Exercise</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <h3 style={{ margin: 0 }}>{session.name}</h3>
                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>{new Date(session.date).toLocaleDateString()} at {new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', width: '100%', maxWidth: '500px' }}>
                            {session.split_id && (
                                <div style={{ border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.7rem', fontWeight: 700 }}>
                                    SPLIT
                                </div>
                            )}
                            <button 
                                className="btn btn-secondary"
                                style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem', border: '1px solid rgba(255,255,255,0.1)' }}
                                onClick={() => toggleSessionExpansion(session.id)}
                            >
                                {expandedSessions[session.id] ? 'HIDE' : 'DETAILS'}
                            </button>
                            <div style={{ background: 'rgba(0,242,254,0.1)', color: 'var(--primary)', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.7rem', fontWeight: 700 }}>
                                {session.exercises.length} EX
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
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1rem' }}>
                        {session.exercises.map((ex: any, exIdx: number) => {
                            const maxWeight = Math.max(...ex.sets.map((s: any) => s.weight));
                            const totalReps = ex.sets.reduce((acc: number, s: any) => acc + s.reps, 0);
                            const isExpanded = expandedSessions[session.id];

                            return (
                                <div key={exIdx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{ex.exercise_name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Best: {maxWeight}kg • Total: {totalReps} reps
                                    </div>

                                    {isExpanded && (
                                        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                                            {ex.sets.map((set: any, sIdx: number) => (
                                                <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem', color: 'rgba(255,255,255,0.6)' }}>
                                                    <span>SET {sIdx + 1}</span>
                                                    <span>{set.weight}kg x {set.reps} <span style={{ color: 'var(--primary)', fontWeight: 800 }}>@ RPE {set.rpe || 'N/A'}</span></span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
      )}
      {showAIModal && createPortal(
          <div style={{ 
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
              background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', zIndex: 10000, padding: '1.5rem',
              backdropFilter: 'blur(8px)'
          }}>
              <div className="card animate-fade-in" style={{ maxWidth: '500px', width: '100%', position: 'relative' }}>
                  <h2 style={{ marginBottom: '1rem' }}>AI Workout Suggestion</h2>
                  <p className="text-muted" style={{ marginBottom: '2rem', fontSize: '0.9rem' }}>
                      Choose a target muscle group. Our AI will build a safe, effective routine using <strong>EXCLUSIVELY</strong> the equipment in your library.
                  </p>

                  <div className="input-group">
                      <label>Target Area</label>
                      <select 
                          value={aiMuscleGroup} 
                          onChange={(e) => setAiMuscleGroup(e.target.value)}
                          style={{ padding: '1rem' }}
                      >
                          <option value="Total Body">Total Body</option>
                          <option value="Chest">Chest</option>
                          <option value="Back">Back</option>
                          <option value="Shoulders">Shoulders</option>
                          <option value="Legs">Legs</option>
                          <option value="Arms">Arms</option>
                          <option value="Core">Core</option>
                      </select>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                      <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAIModal(false)}>Cancel</button>
                      <button 
                          className="btn btn-primary" 
                          style={{ flex: 2 }} 
                          onClick={handleAISuggest}
                          disabled={aiLoading}
                      >
                          {aiLoading ? 'Generating Routine...' : 'Generate Workout'}
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {showRPEInfo && createPortal(
          <div style={{ 
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
              background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', zIndex: 10001, padding: '1.5rem',
              backdropFilter: 'blur(8px)'
          }}>
              <div className="card animate-fade-in" style={{ maxWidth: '500px', width: '100%', position: 'relative' }}>
                  <h2 style={{ marginBottom: '1rem' }}>What is RPE?</h2>
                  <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                      <strong>RPE (Rate of Perceived Exertion)</strong> measures how difficult a set was for you. 
                      It helps the AI understand when to increase the weight or when to back off.
                  </p>

                  <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                      {[
                          { rank: '10', desc: 'Max Effort: No more reps possible' },
                          { rank: '9.5', desc: 'No more reps, but could lift slightly more weight' },
                          { rank: '9', desc: '1 rep left in the tank' },
                          { rank: '8.5', desc: '1-2 reps left in the tank' },
                          { rank: '8', desc: '2 reps left in the tank' },
                          { rank: '7.5', desc: '2-3 reps left in the tank' },
                          { rank: '7', desc: '3 reps left in the tank' },
                          { rank: '5-6', desc: '4-6 reps left in the tank (Moderate)' },
                          { rank: '1-4', desc: 'Very light to light effort' }
                      ].map((item, i) => (
                          <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ width: '40px', fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>{item.rank}</div>
                              <div style={{ fontSize: '0.85rem' }}>{item.desc}</div>
                          </div>
                      ))}
                  </div>

                  <button 
                      className="btn btn-primary" 
                      style={{ width: '100%', marginTop: '2rem' }} 
                      onClick={() => setShowRPEInfo(false)}
                  >
                      Got it!
                  </button>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
};
