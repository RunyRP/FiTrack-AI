import { useState, useEffect } from 'react';
import { useAuth } from '../App';

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
        id: 'balanced',
        name: 'Balanced', 
        p: 0.30, f: 0.30, c: 0.40, 
        desc: '30/30/40 - Standard athlete split',
        why: 'Ideal for sustainable performance and recovery. Provides enough carbs for high-intensity training while keeping protein high for muscle maintenance.'
    },
    { 
        id: 'low_carb',
        name: 'Low Carb', 
        p: 0.40, f: 0.40, c: 0.20, 
        desc: '40/40/20 - Focused on fat loss',
        why: 'Best for improving insulin sensitivity and steady energy levels. Reducing carbs can help reduce water retention and is often preferred for fat loss.'
    },
    { 
        id: 'high_protein',
        name: 'High Protein', 
        p: 0.50, f: 0.25, c: 0.25, 
        desc: '50/25/25 - Maximum muscle preservation',
        why: 'Essential for aggressive cutting phases to prevent muscle breakdown. Protein is the most satiating macro, helping control hunger during a deficit.'
    },
    { 
        id: 'keto',
        name: 'Keto-Style', 
        p: 0.25, f: 0.70, c: 0.05, 
        desc: '25/70/5 - High fat, minimal carbs',
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
    const [macroPresetId, setMacroPresetId] = useState<string>('balanced'); 

    useEffect(() => {
        if (user?.profile) {
            if (user.profile.age) setAge(user.profile.age);
            if (user.profile.gender) setGender(user.profile.gender.toLowerCase() === 'female' ? 'female' : 'male');
            if (user.profile.height) setHeight(user.profile.height);
            if (user.profile.weight) setWeight(user.profile.weight);
            
            // Sync with profile activity level
            const activityMap: Record<string, number> = {
                'sedentary': 1.2,
                'lightly_active': 1.375,
                'moderately_active': 1.465,
                'active': 1.55,
                'very_active': 1.725,
                'extra_active': 1.9
            };
            if (user.profile.activity_level) setActivity(activityMap[user.profile.activity_level] || 1.2);
            
            // Sync with objective
            const objectiveMap: Record<string, number> = {
                'lose_weight': 2,
                'maintenance': 3,
                'bulk': 4,
                'maintain': 3
            };
            if (user.profile.objective) {
                let idx = objectiveMap[user.profile.objective] || 3;
                if (user.profile.objective === 'lose_weight' && user.profile.cut_intensity === 'medium') idx = 1;
                if (user.profile.objective === 'lose_weight' && user.profile.cut_intensity === 'aggressive') idx = 0;
                if (user.profile.objective === 'bulk' && user.profile.cut_intensity === 'medium') idx = 5;
                setSelectedGoalIdx(idx);
            }

            if (user.profile.macro_distribution) setMacroPresetId(user.profile.macro_distribution);
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
    const preset = MACRO_PRESETS.find(p => p.id === macroPresetId) || MACRO_PRESETS[0];
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

                {/* Metabolic Results */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div className="card" style={{ textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Basal Metabolic Rate</div>
                        <div style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1 }}>{Math.round(bmr)}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, marginTop: '0.5rem' }}>KCAL / DAY (AT REST)</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', border: '2px solid var(--primary)', background: 'rgba(251, 197, 49, 0.03)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Total Daily Energy Expenditure</div>
                        <div style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1 }}>{Math.round(tdee)}</div>
                        <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700, marginTop: '0.5rem' }}>KCAL / DAY (MAINTENANCE)</div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: GOAL & MACROS */}
            <div style={{ marginBottom: '4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ width: '4px', height: '2rem', background: 'var(--primary)', borderRadius: '2px' }} />
                    <h2 style={{ margin: 0, fontSize: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800 }}>2. Target Optimization</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
                    {/* Goal Selection */}
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Select Your Primary Goal</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                            {goals.map((goal, idx) => (
                                <button 
                                    key={goal.name}
                                    className="btn btn-secondary"
                                    onClick={() => setSelectedGoalIdx(idx)}
                                    style={{ 
                                        height: 'auto', 
                                        padding: '1.25rem 1rem', 
                                        textAlign: 'left', 
                                        flexDirection: 'column', 
                                        gap: '0.25rem',
                                        border: selectedGoalIdx === idx ? `2px solid ${goal.color}` : '1px solid rgba(255,255,255,0.05)',
                                        background: selectedGoalIdx === idx ? `${goal.color}11` : 'rgba(255,255,255,0.02)'
                                    }}
                                >
                                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: selectedGoalIdx === idx ? goal.color : '#fff' }}>{goal.name}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{goal.adjustment > 0 ? '+' : ''}{goal.adjustment} kcal</div>
                                </button>
                            ))}
                        </div>
                        <div className="card" style={{ margin: 0, padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>
                                <strong>Strategy:</strong> {goals[selectedGoalIdx].desc}
                            </p>
                        </div>
                    </div>

                    {/* Macro Presets */}
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Macro Distribution</label>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {MACRO_PRESETS.map((p) => (
                                <button 
                                    key={p.name}
                                    className="btn btn-secondary"
                                    onClick={() => setMacroPresetId(p.id)}
                                    style={{ 
                                        padding: '1rem', 
                                        textAlign: 'left', 
                                        justifyContent: 'space-between',
                                        border: macroPresetId === p.id ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                                        background: macroPresetId === p.id ? 'rgba(251, 197, 49, 0.05)' : 'rgba(255,255,255,0.02)'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 900 }}>{p.name}</div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{p.desc}</div>
                                    </div>
                                    {macroPresetId === p.id && <div style={{ color: 'var(--primary)', fontWeight: 900 }}>✓</div>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 3: THE PLAN */}
            <div style={{ marginBottom: '6rem' }}>
                <div style={{ background: 'var(--primary)', padding: '3rem', borderRadius: '1.5rem', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4rem', color: '#000', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'rgba(0,0,0,0.05)', borderRadius: '50%' }} />
                    
                    <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem', opacity: 0.7 }}>Your Optimized Daily Target</div>
                        <div style={{ fontSize: '5rem', fontWeight: 900, lineHeight: 1, marginBottom: '0.5rem' }}>{currentCals}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem' }}>KCAL / DAY</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', borderTop: '2px solid rgba(0,0,0,0.1)', paddingTop: '2rem' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 900, opacity: 0.7, textTransform: 'uppercase' }}>Protein</div>
                                <div style={{ fontSize: '2rem', fontWeight: 900 }}>{macros.protein}g</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 900, opacity: 0.7, textTransform: 'uppercase' }}>Carbs</div>
                                <div style={{ fontSize: '2rem', fontWeight: 900 }}>{macros.carbs}g</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 900, opacity: 0.7, textTransform: 'uppercase' }}>Fats</div>
                                <div style={{ fontSize: '2rem', fontWeight: 900 }}>{macros.fat}g</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.9)', padding: '2rem', borderRadius: '1rem', color: '#fff', alignSelf: 'center' }}>
                        <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ background: 'var(--primary)', color: '#000', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>i</span>
                            Preset Rationale
                        </h3>
                        <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                            {preset.why}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
