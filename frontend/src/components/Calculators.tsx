import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { CalculatorIcon } from './Icons';

const ACTIVITY_LEVELS = [
    { label: 'Sedentary: little or no exercise', value: 1.2 },
    { label: 'Light: exercise 1-3 times/week', value: 1.375 },
    { label: 'Moderate: exercise 4-5 times/week', value: 1.465 },
    { label: 'Active: daily exercise or intense exercise 3-4 times/week', value: 1.55 },
    { label: 'Very Active: intense exercise 6-7 times/week', value: 1.725 },
    { label: 'Extra Active: very intense exercise daily, or physical job', value: 1.9 },
];

const MACRO_PRESETS = [
    { 
        name: 'Balanced', 
        p: 0.30, f: 0.25, c: 0.45, 
        desc: '30/25/45 - Standard athlete split',
        why: 'Ideal for sustainable performance and recovery. Provides enough carbs for high-intensity training while keeping protein high for muscle maintenance.'
    },
    { 
        name: 'Low Carb', 
        p: 0.40, f: 0.40, c: 0.20, 
        desc: '40/40/20 - Focused on fat loss',
        why: 'Best for improving insulin sensitivity and steady energy levels. Reducing carbs can help reduce water retention and is often preferred for fat loss.'
    },
    { 
        name: 'High Protein', 
        p: 0.45, f: 0.25, c: 0.30, 
        desc: '45/25/30 - Maximum muscle preservation',
        why: 'Essential for aggressive cutting phases to prevent muscle breakdown. Protein is the most satiating macro, helping control hunger during a deficit.'
    },
    { 
        name: 'Keto-ish', 
        p: 0.30, f: 0.60, c: 0.10, 
        desc: '30/60/10 - High fat, minimal carbs',
        why: 'Focuses on using fat as the primary fuel source. Excellent for appetite control and those who prefer high-fat meals over high-carb options.'
    },
];

export const Calculators = () => {
    const { user } = useAuth();
    
    const [age, setAge] = useState<number>(25);
    const [gender, setGender] = useState<'male' | 'female'>('male');
    const [height, setHeight] = useState<number>(175);
    const [weight, setWeight] = useState<number>(70);
    const [activity, setActivity] = useState<number>(1.55);
    const [selectedGoalIdx, setSelectedGoalIdx] = useState<number>(3); // Default to Maintenance
    const [macroPresetIdx, setMacroPresetIdx] = useState<number>(0); // Default to Balanced

    useEffect(() => {
        if (user?.profile) {
            if (user.profile.age) setAge(user.profile.age);
            if (user.profile.gender) setGender(user.profile.gender.toLowerCase() === 'female' ? 'female' : 'male');
            if (user.profile.height) setHeight(user.profile.height);
            if (user.profile.weight) setWeight(user.profile.weight);
            setActivity(1.55);
        }
    }, [user]);

    // BMR Calculation (Mifflin-St Jeor Equation)
    const calculateBMR = () => {
        if (gender === 'male') {
            return (10 * weight) + (6.25 * height) - (5 * age) + 5;
        } else {
            return (10 * weight) + (6.25 * height) - (5 * age) - 161;
        }
    };

    const bmr = calculateBMR();
    const tdee = bmr * activity;

    const goals = [
        { name: 'Extreme Cut', adjustment: -1000, color: '#eb4d4b', desc: 'Maximum fat loss, hard to sustain' },
        { name: 'Aggressive Cut', adjustment: -750, color: '#ff4757', desc: 'Fast fat loss for disciplined athletes' },
        { name: 'Weight Loss', adjustment: -500, color: '#ffa502', desc: 'Sustainable, healthy fat loss' },
        { name: 'Maintenance', adjustment: 0, color: 'var(--primary)', desc: 'Stay at your current weight' },
        { name: 'Lean Bulk', adjustment: 300, color: '#2ecc71', desc: 'Build muscle with minimal fat gain' },
        { name: 'Bulk', adjustment: 500, color: '#1e90ff', desc: 'Maximum muscle and strength gains' },
    ];

    const currentCals = Math.round(tdee + goals[selectedGoalIdx].adjustment);

    // Macro splits based on selected preset
    const preset = MACRO_PRESETS[macroPresetIdx];
    const macros = {
        protein: Math.round((currentCals * preset.p) / 4),
        fat: Math.round((currentCals * preset.f) / 9),
        carbs: Math.round((currentCals * preset.c) / 4)
    };

    return (
        <div className="container animate-fade-in" style={{ maxWidth: '1200px' }}>
            <div style={{ marginBottom: '3rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1.5rem' }}>
                <h1 style={{ margin: 0, fontSize: '2.5rem' }}>Body Performance Tools</h1>
                <p className="text-muted" style={{ margin: 0 }}>Scientific estimation of your metabolic needs and nutritional targets.</p>
            </div>

            {/* SECTION 1: METABOLIC PROFILE */}
            <div style={{ marginBottom: '4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ width: '4px', height: '2rem', background: 'var(--primary)', borderRadius: '2px' }} />
                    <h2 style={{ margin: 0, fontSize: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800 }}>1. Metabolic Profile</h2>
                </div>

                {/* Row 1: Body Composition & Activity */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Body Profile & Lifestyle</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                        <div className="input-group" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
                            <label>Gender</label>
                            <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                                <button 
                                    className={`btn ${gender === 'male' ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ flex: 1, padding: '0', fontSize: '0.8rem', height: '2.8rem' }}
                                    onClick={() => setGender('male')}
                                >Male</button>
                                <button 
                                    className={`btn ${gender === 'female' ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ flex: 1, padding: '0', fontSize: '0.8rem', height: '2.8rem' }}
                                    onClick={() => setGender('female')}
                                >Female</button>
                            </div>
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Age (years)</label>
                            <input type="number" style={{ height: '2.8rem' }} value={age} onChange={(e) => setAge(parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Height (cm)</label>
                            <input type="number" style={{ height: '2.8rem' }} value={height} onChange={(e) => setHeight(parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Weight (kg)</label>
                            <input type="number" style={{ height: '2.8rem' }} value={weight} onChange={(e) => setWeight(parseInt(e.target.value) || 0)} />
                        </div>
                        
                        {/* Activity Level Selector */}
                        <div className="input-group" style={{ gridColumn: 'span 4', marginBottom: 0, marginTop: '1rem' }}>
                            <label style={{ color: 'var(--primary)', fontWeight: 800, display: 'block', marginBottom: '0.5rem' }}>Activity Level & Exercise Frequency</label>
                            <select 
                                style={{ 
                                    height: '3.8rem', 
                                    width: '100%', 
                                    fontSize: '1rem', 
                                    padding: '0 1rem',
                                    background: '#1a1a1a', // Solid black
                                    border: '2px solid var(--primary)', 
                                    borderRadius: '8px',
                                    color: '#ffffff', // Solid white
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    appearance: 'revert', // Native look is most reliable for reading
                                    display: 'block'
                                }} 
                                value={activity} 
                                onChange={(e) => setActivity(parseFloat(e.target.value))}
                            >
                                {ACTIVITY_LEVELS.map(lvl => (
                                    <option key={lvl.value} value={lvl.value} style={{ background: '#1a1a1a', color: 'white' }}>
                                        {lvl.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Row 2: Metabolic Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div className="card" style={{ borderLeft: '4px solid var(--primary)', marginBottom: 0 }}>
                        <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Basal Metabolic Rate (BMR)</div>
                        <div className="stat-value">{Math.round(bmr)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>kcal</span></div>
                        <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '1rem', marginBottom: 0 }}>Calories burned at absolute rest.</p>
                    </div>
                    <div className="card" style={{ borderLeft: '4px solid var(--primary)', marginBottom: 0 }}>
                        <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Daily Energy Expenditure (TDEE)</div>
                        <div className="stat-value">{Math.round(tdee)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>kcal</span></div>
                        <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '1rem', marginBottom: 0 }}>Calories burned including daily activity.</p>
                    </div>
                </div>
            </div>

            {/* SECTION 2: GOAL STRATEGY */}
            <div style={{ marginBottom: '4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ width: '4px', height: '2rem', background: 'var(--primary)', borderRadius: '2px' }} />
                    <h2 style={{ margin: 0, fontSize: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800 }}>2. Goal Strategy</h2>
                </div>

                {/* Row 3: Goals and Macros */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' }}>
                    <div style={{ display: 'grid', gap: '2rem' }}>
                        <div className="card" style={{ marginBottom: 0 }}>
                            <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Training Goal</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                {goals.map((goal, idx) => (
                                    <div 
                                        key={goal.name}
                                        onClick={() => setSelectedGoalIdx(idx)}
                                        style={{ 
                                            display: 'flex', 
                                            flexDirection: 'column',
                                            justifyContent: 'space-between', 
                                            padding: '1.25rem',
                                            background: selectedGoalIdx === idx ? 'rgba(251, 197, 49, 0.05)' : 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${selectedGoalIdx === idx ? 'var(--primary)' : 'var(--card-border)'}`,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            textAlign: 'center',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {selectedGoalIdx === idx && (
                                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'var(--primary)' }} />
                                        )}
                                        <div style={{ marginBottom: '1rem' }}>
                                            <div style={{ fontWeight: 900, fontSize: '0.85rem', color: selectedGoalIdx === idx ? 'var(--primary)' : 'white', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{goal.name}</div>
                                            <div style={{ fontSize: '0.6rem', opacity: 0.5, lineHeight: 1.2 }}>{goal.desc}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1 }}>{Math.round(tdee + goal.adjustment)}</div>
                                            <div style={{ fontSize: '0.65rem', color: goal.color, fontWeight: 800, marginTop: '0.25rem' }}>
                                                {goal.adjustment > 0 ? '+' : ''}{goal.adjustment} kcal
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="card" style={{ marginBottom: 0 }}>
                            <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Macro Distribution</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                {MACRO_PRESETS.map((p, idx) => (
                                    <button 
                                        key={p.name}
                                        className={`btn ${macroPresetIdx === idx ? 'btn-primary' : 'btn-secondary'}`}
                                        style={{ padding: '1rem 0.5rem', fontSize: '0.75rem' }}
                                        onClick={() => setMacroPresetIdx(idx)}
                                    >
                                        <div style={{ fontWeight: 900 }}>{p.name}</div>
                                        <div style={{ fontSize: '0.6rem', opacity: 0.7, fontWeight: 400, textTransform: 'none' }}>{p.p*100}/{p.f*100}/{p.c*100}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ border: '2px solid var(--primary)', background: 'rgba(251, 197, 49, 0.03)', marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Daily Target: {goals[selectedGoalIdx].name}</div>
                                <div className="stat-value" style={{ fontSize: '3rem' }}>{currentCals}</div>
                                <div className="text-muted" style={{ fontSize: '0.8rem' }}>kcal / DAY</div>
                            </div>

                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderLeft: '4px solid #ff4757' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.7rem' }}>PROTEIN</span>
                                        <span style={{ color: '#ff4757', fontWeight: 900 }}>{macros.protein}G</span>
                                    </div>
                                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)' }}>
                                        <div style={{ width: `${preset.p * 100}%`, height: '100%', background: '#ff4757' }} />
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderLeft: '4px solid #ffa502' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.7rem' }}>FATS</span>
                                        <span style={{ color: '#ffa502', fontWeight: 900 }}>{macros.fat}G</span>
                                    </div>
                                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)' }}>
                                        <div style={{ width: `${preset.f * 100}%`, height: '100%', background: '#ffa502' }} />
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderLeft: '4px solid #2ecc71' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.7rem' }}>CARBS</span>
                                        <span style={{ color: '#2ecc71', fontWeight: 900 }}>{macros.carbs}G</span>
                                    </div>
                                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)' }}>
                                        <div style={{ width: `${preset.c * 100}%`, height: '100%', background: '#2ecc71' }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid var(--card-border)', borderRadius: '4px' }}>
                                <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                                    {MACRO_PRESETS[macroPresetIdx].name} Rationale
                                </div>
                                <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
                                    {MACRO_PRESETS[macroPresetIdx].why}
                                </p>
                            </div>
                            <div style={{ marginTop: '1rem', fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                {preset.name} Mode: {preset.desc}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
