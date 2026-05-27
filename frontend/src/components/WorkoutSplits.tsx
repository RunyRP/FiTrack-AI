import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth, usePopup } from '../hooks';
import { PlusIcon, TrashIcon, ArrowRightIcon, EditIcon } from './Icons';

interface SplitExercise {
    machine_id?: number;
    name: string;
    target_sets: number;
    target_reps: number;
    muscle_group?: string;
}

interface WorkoutSplit {
    id: number;
    name: string;
    exercises: SplitExercise[];
}

interface WorkoutSchedule {
    split_mode: 'dynamic' | 'fixed';
    gym_days: number[];
    fixed_schedule: Record<string, number>;
    split_sequence: number[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core', 'Other'];

export const WorkoutSplits = () => {
    const { user } = useAuth();
    const [splits, setSplits] = useState<WorkoutSplit[]>([]);
    const [schedule, setSchedule] = useState<WorkoutSchedule>({
        split_mode: 'dynamic',
        gym_days: [],
        fixed_schedule: {},
        split_sequence: []
    });
    const [machinery, setMachinery] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingSplit, setIsAddingSplit] = useState(false);
    const [editingSplitId, setEditingSplitId] = useState<number | null>(null);
    const [newSplitName, setNewSplitName] = useState('');
    const [newSplitExercises, setNewSplitExercises] = useState<SplitExercise[]>([]);
    const [showAllMachinery, setShowAllMachinery] = useState(false);

    const { showPopup } = usePopup();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [splitsRes, scheduleRes, machineryRes] = await Promise.all([
                api.get('/workout/splits'),
                api.get('/workout/schedule'),
                api.get('/workout/machinery')
            ]);
            setSplits(splitsRes.data);
            setSchedule(scheduleRes.data);
            setMachinery(machineryRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSplit = async () => {
        if (!newSplitName || newSplitExercises.length === 0) return;
        try {
            if (editingSplitId) {
                await api.put(`/workout/splits/${editingSplitId}`, {
                    name: newSplitName,
                    exercises: newSplitExercises
                });
            } else {
                await api.post('/workout/splits', {
                    name: newSplitName,
                    exercises: newSplitExercises
                });
            }
            setNewSplitName('');
            setNewSplitExercises([]);
            setIsAddingSplit(false);
            setEditingSplitId(null);
            fetchData();
        } catch (err) {
            console.error(err);
            showPopup({
                title: 'Error',
                message: `Failed to ${editingSplitId ? 'update' : 'create'} split.`,
                type: 'alert'
            });
        }
    };

    const handleEditSplit = (split: WorkoutSplit) => {
        setNewSplitName(split.name);
        setNewSplitExercises([...split.exercises]);
        setEditingSplitId(split.id);
        setIsAddingSplit(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteSplit = async (id: number) => {
        showPopup({
            title: 'Delete Split',
            message: 'Are you sure you want to delete this workout split? This will remove it from your schedule and history links.',
            type: 'confirm',
            confirmLabel: 'DELETE',
            onConfirm: async () => {
                try {
                    await api.delete(`/workout/splits/${id}`);
                    fetchData();
                } catch (err: any) {
                    console.error(err);
                    const errorMsg = err.response?.data?.detail || 'Failed to delete split. It might be referenced by other workouts.';
                    showPopup({
                        title: 'Error',
                        message: errorMsg,
                        type: 'alert'
                    });
                }
            }
        });
    };

    const handleUpdateSchedule = async (newSchedule: Partial<WorkoutSchedule>) => {
        const updated = { ...schedule, ...newSchedule };
        setSchedule(updated);
        try {
            await api.post('/workout/schedule', updated);
        } catch (err) {
            console.error(err);
        }
    };

    const toggleGymDay = (dayIdx: number) => {
        const days = schedule.gym_days.includes(dayIdx)
            ? schedule.gym_days.filter(d => d !== dayIdx)
            : [...schedule.gym_days, dayIdx].sort();
        handleUpdateSchedule({ gym_days: days });
    };

    const addExerciseToNewSplit = () => {
        setNewSplitExercises([...newSplitExercises, { name: '', target_sets: 3, target_reps: 12, muscle_group: MUSCLE_GROUPS[0] }]);
    };

    const updateNewSplitExercise = (idx: number, field: keyof SplitExercise, value: any) => {
        const updated = [...newSplitExercises];
        if (field === 'name' && value.includes('|')) {
            const [name, id] = value.split('|');
            updated[idx] = { ...updated[idx], name, machine_id: parseInt(id) };
        } else {
            updated[idx] = { ...updated[idx], [field]: value };
        }
        setNewSplitExercises(updated);
    };

    const categorizeMachine = (m: any) => {
        if (!m || !m.exercises || !m.exercises[0] || !m.exercises[0].muscles) return 'Other';
        const primaryMuscle = m.exercises[0].muscles[0] || 'Other';
        const muscle = primaryMuscle.toLowerCase();
        
        if (muscle.includes('quad') || muscle.includes('leg') || muscle.includes('glute') || muscle.includes('hamstring') || muscle.includes('calf')) return 'Legs';
        if (muscle.includes('chest') || muscle.includes('pectoral')) return 'Chest';
        if (muscle.includes('back') || muscle.includes('lat') || muscle.includes('row')) return 'Back';
        if (muscle.includes('shoulder') || muscle.includes('delt')) return 'Shoulders';
        if (muscle.includes('bicep') || muscle.includes('tricep') || muscle.includes('arm')) return 'Arms';
        if (muscle.includes('core') || muscle.includes('ab') || muscle.includes('stomach')) return 'Core';
        return 'Other';
    };

    if (loading) return <div className="stat-value" style={{ fontSize: '1.5rem', textAlign: 'center', padding: '4rem' }}>Loading splits...</div>;

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2>Workout Splits</h2>
                    <p className="text-muted">Define your training blocks and schedule.</p>
                </div>
                {!isAddingSplit && (
                    <button className="btn btn-primary" onClick={() => setIsAddingSplit(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'auto' }}>
                        <PlusIcon size={18} /> Create New Split
                    </button>
                )}
            </div>

            {isAddingSplit && (
                <div className="card animate-fade-in" style={{ marginBottom: '2rem', border: '1px solid var(--primary)', padding: 'clamp(1rem, 4vw, 1.5rem)' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>{editingSplitId ? 'Edit Training Split' : 'New Training Split'}</h3>
                    
                    <div className="input-group">
                        <label>Split Name (e.g. Push, Upper Body)</label>
                        <input 
                            type="text" 
                            placeholder="Split Name" 
                            value={newSplitName}
                            onChange={(e) => setNewSplitName(e.target.value)}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <label className="text-muted" style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Exercises</label>
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
                        {newSplitExercises.map((ex, idx) => (
                            <div key={idx} className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: 'clamp(1rem, 3vw, 1.5rem)', marginBottom: '1rem', border: '1px solid var(--card-border)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem' }}>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label>Muscle Group</label>
                                        <select 
                                            value={ex.muscle_group}
                                            onChange={(e) => updateNewSplitExercise(idx, 'muscle_group', e.target.value)}
                                        >
                                            {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label>Machine / Exercise</label>
                                        <select 
                                            value={ex.machine_id ? `${ex.name}|${ex.machine_id}` : ex.name}
                                            onChange={(e) => updateNewSplitExercise(idx, 'name', e.target.value)}
                                        >
                                            <option value="">Select Exercise</option>
                                            {machinery
                                                .filter(m => categorizeMachine(m) === ex.muscle_group)
                                                .filter(m => showAllMachinery || !user?.profile?.selected_machinery || user.profile.selected_machinery.includes(m.id))
                                                .map(m => (
                                                    m.exercises.map((e: any) => (
                                                        <option key={`${m.id}-${e.name}`} value={`${e.name}|${m.id}`}>{e.name} ({m.name})</option>
                                                    ))
                                                ))
                                            }
                                            <option value="Custom">Custom Exercise...</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="input-group" style={{ marginBottom: 0 }}>
                                            <label>Sets</label>
                                            <input 
                                                type="number" 
                                                placeholder="Sets" 
                                                value={ex.target_sets}
                                                onChange={(e) => updateNewSplitExercise(idx, 'target_sets', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="input-group" style={{ marginBottom: 0 }}>
                                            <label>Reps</label>
                                            <input 
                                                type="number" 
                                                placeholder="Reps" 
                                                value={ex.target_reps}
                                                onChange={(e) => updateNewSplitExercise(idx, 'target_reps', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                        <button className="btn btn-secondary" style={{ width: '100%', height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setNewSplitExercises(newSplitExercises.filter((_, i) => i !== idx))}>
                                            <TrashIcon size={18} /> Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button className="btn btn-secondary" onClick={addExerciseToNewSplit} style={{ width: '100%', borderStyle: 'dashed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}>
                            <PlusIcon size={18} /> Add Exercise
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" style={{ flex: 2, minWidth: '150px' }} onClick={handleAddSplit}>{editingSplitId ? 'Update Split' : 'Save Split'}</button>
                        <button className="btn btn-secondary" style={{ flex: 1, minWidth: '150px' }} onClick={() => { setIsAddingSplit(false); setEditingSplitId(null); setNewSplitName(''); setNewSplitExercises([]); }}>Cancel</button>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                {splits.map(split => (
                    <div key={split.id} className="card" style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                            <button 
                                onClick={() => handleEditSplit(split)}
                                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}
                            >
                                <EditIcon size={18} />
                            </button>
                            <button 
                                onClick={() => handleDeleteSplit(split.id)}
                                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}
                            >
                                <TrashIcon size={18} />
                            </button>
                        </div>
                        <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', paddingRight: '3rem' }}>{split.name}</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {split.exercises.map((ex, i) => (
                                <span key={i} className="insight-chip" style={{ borderRadius: '0', fontSize: '0.7rem' }}>
                                    {ex.name} ({ex.target_sets}×{ex.target_reps})
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="card">
                <h2 style={{ marginBottom: '1.5rem' }}>Training Schedule</h2>
                
                <div style={{ marginBottom: '2rem' }}>
                    <label className="text-muted" style={{ display: 'block', marginBottom: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schedule Mode</label>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button 
                            className={`btn ${schedule.split_mode === 'dynamic' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1, minWidth: '200px', padding: '1rem' }}
                            onClick={() => handleUpdateSchedule({ split_mode: 'dynamic' })}
                        >
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontWeight: 800 }}>Dynamic Sequence</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginTop: '0.2rem' }}>Rotates through splits each gym day</div>
                            </div>
                        </button>
                        <button 
                            className={`btn ${schedule.split_mode === 'fixed' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1, minWidth: '200px', padding: '1rem' }}
                            onClick={() => handleUpdateSchedule({ split_mode: 'fixed' })}
                        >
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontWeight: 800 }}>Fixed Calendar</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginTop: '0.2rem' }}>Specific splits on assigned days</div>
                            </div>
                        </button>
                    </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <label className="text-muted" style={{ display: 'block', marginBottom: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Gym Days</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {DAYS.map((day, idx) => (
                            <button 
                                key={idx}
                                className={`btn ${schedule.gym_days.includes(idx) ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ flex: '1 0 80px', padding: '0.75rem 0.5rem', fontSize: '0.8rem' }}
                                onClick={() => toggleGymDay(idx)}
                            >
                                {day.substring(0, 3)}
                            </button>
                        ))}
                    </div>
                </div>

                {schedule.split_mode === 'dynamic' ? (
                    <div>
                        <label className="text-muted" style={{ display: 'block', marginBottom: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Split Sequence</label>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {schedule.split_sequence.map((splitId, idx) => {
                                const split = splits.find(s => s.id === splitId);
                                return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div className="btn btn-primary" style={{ padding: '0.5rem 0.75rem', cursor: 'default', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                                            {split?.name || 'Unknown'}
                                            <span 
                                                style={{ cursor: 'pointer', opacity: 0.5, display: 'flex', alignItems: 'center' }}
                                                onClick={() => {
                                                    const seq = [...schedule.split_sequence];
                                                    seq.splice(idx, 1);
                                                    handleUpdateSchedule({ split_sequence: seq });
                                                }}
                                            >
                                                <TrashIcon size={14} />
                                            </span>
                                        </div>
                                        {idx < schedule.split_sequence.length - 1 && <span style={{ color: 'var(--primary)', fontWeight: 900 }}><ArrowRightIcon size={14} /></span>}
                                    </div>
                                );
                            })}
                            <div className="input-group" style={{ marginBottom: 0, width: 'auto' }}>
                                <select 
                                    style={{ padding: '0.5rem 2rem 0.5rem 1rem', fontSize: '0.85rem' }}
                                    onChange={(e) => {
                                        if (!e.target.value) return;
                                        handleUpdateSchedule({ split_sequence: [...schedule.split_sequence, parseInt(e.target.value)] });
                                        e.target.value = '';
                                    }}
                                >
                                    <option value="">+ Add to Sequence</option>
                                    {splits.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                ) : (
                    <div>
                        <label className="text-muted" style={{ display: 'block', marginBottom: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fixed Calendar Assignment</label>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {schedule.gym_days.map(dayIdx => (
                                <div key={dayIdx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', border: '1px solid var(--card-border)', flexWrap: 'wrap' }}>
                                    <div style={{ width: '80px', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', fontSize: '0.8rem' }}>{DAYS[dayIdx].substring(0, 3)}</div>
                                    <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
                                        <select 
                                            style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                                            value={schedule.fixed_schedule[dayIdx.toString()] || ''}
                                            onChange={(e) => {
                                                const fixed = { ...schedule.fixed_schedule, [dayIdx.toString()]: parseInt(e.target.value) };
                                                handleUpdateSchedule({ fixed_schedule: fixed });
                                            }}
                                        >
                                            <option value="">Select Split</option>
                                            {splits.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            ))}
                            {schedule.gym_days.length === 0 && <p className="text-muted" style={{ textAlign: 'center', padding: '2rem', border: '1px dashed var(--card-border)', fontSize: '0.9rem' }}>Select your gym days above to assign splits.</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
