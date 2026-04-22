import { useState, useEffect } from 'react';
import api from '../api';

export const Dashboard = () => {
  const [data, setData] = useState<any>(null);
  const [stepsInput, setStepsInput] = useState<number>(0);
  const [waterInput, setWaterInput] = useState<number>(0);
  const [weightInput, setWeightInput] = useState<number>(0);

  const fetchData = async () => {
    try {
      const res = await api.get('/log/dashboard-data');
      setData(res.data);
      setStepsInput(res.data.today.steps);
      setWaterInput(res.data.today.water_ml);
      setWeightInput(res.data.today.weight || res.data.user.profile.weight || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateSteps = async () => {
    try {
      await api.put(`/log/steps?steps=${stepsInput}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateWater = async () => {
    try {
      await api.put(`/log/water?water_ml=${waterInput}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateWeight = async () => {
    try {
        await api.put(`/log/weight?weight=${weightInput}`);
        fetchData();
    } catch (err) {
        console.error(err);
    }
  };

  if (!data) return (
    <div className="container" style={{ display: 'flex', height: '50vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="stat-value" style={{ fontSize: '1.5rem' }}>Loading your dashboard...</div>
    </div>
  );

  const { today, user, history, feedback } = data;
  const profile = user.profile;

  const kcalPercent = profile.target_kcal ? (today.total_kcal / profile.target_kcal) * 100 : 0;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(kcalPercent, 100) / 100) * circumference;

  // Macro Totals
  const totals = today.food_items.reduce((acc: any, item: any) => ({
      p: acc.p + (item.protein || 0),
      c: acc.c + (item.carbs || 0),
      f: acc.f + (item.fat || 0)
  }), { p: 0, c: 0, f: 0 });

  // Targets (Simple heuristic: 30% P, 40% C, 30% F)
  const targets = {
      p: Math.round((profile.target_kcal * 0.3) / 4),
      c: Math.round((profile.target_kcal * 0.4) / 4),
      f: Math.round((profile.target_kcal * 0.3) / 9)
  };

  return (
    <div className="container">
      <div className="card" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Welcome Back, {profile.name || 'Athlete'}</h1>
        <p className="text-muted" style={{ fontSize: '1.1rem' }}>Your daily targets are personalized for your <strong>{profile.objective?.replace('_', ' ')}</strong> plan.</p>
      </div>

      {feedback && (
        <div className="card animate-fade-in" style={{ 
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.05) 0%, rgba(79, 172, 254, 0.05) 100%)',
            borderColor: 'rgba(0, 242, 254, 0.2)',
            textAlign: 'left',
            padding: '1.5rem 2.5rem',
            marginBottom: '2rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🤖</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)' }}>Daily AI Coach</h3>
                <div style={{ 
                    marginLeft: 'auto', 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '0.5rem', 
                    fontSize: '0.7rem', 
                    fontWeight: 800, 
                    background: feedback.status === 'on_track' ? 'rgba(0, 255, 175, 0.1)' : 'rgba(251, 197, 49, 0.1)',
                    color: feedback.status === 'on_track' ? 'var(--success)' : 'var(--warning)'
                }}>
                    {feedback.status === 'on_track' ? 'ON TRACK' : 'NEEDS ATTENTION'}
                </div>
            </div>
            <p style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '1rem', color: '#fff', lineHeight: 1.4 }}>
                "{feedback.summary}"
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {feedback.insights.map((insight: string, i: number) => (
                    <div key={i} style={{ 
                        fontSize: '0.8rem', 
                        padding: '0.4rem 0.8rem', 
                        background: 'rgba(255,255,255,0.03)', 
                        borderRadius: '0.5rem', 
                        border: '1px solid rgba(255,255,255,0.05)',
                        color: 'var(--text-muted)'
                    }}>
                        • {insight}
                    </div>
                ))}
            </div>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="card stat-card">
          <h3>Daily Calories</h3>
          <div className="progress-ring-container">
            <svg className="progress-ring-svg" width="160" height="160">
              <circle className="progress-ring-circle-bg" cx="80" cy="80" r={radius} />
              <circle 
                className="progress-ring-circle" 
                cx="80" cy="80" r={radius} 
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="progress-content">
              <div className="stat-value" style={{ fontSize: '2rem', margin: 0 }}>{today.total_kcal}</div>
              <div className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>KCAL</div>
            </div>
          </div>
          <p className="text-muted">Goal: {profile.target_kcal} kcal</p>
          
          <div style={{ marginTop: '2rem', display: 'grid', gap: '1rem', textAlign: 'left' }}>
              {[
                  { label: 'Protein', current: totals.p, target: targets.p, color: 'var(--primary)' },
                  { label: 'Carbs', current: totals.c, target: targets.c, color: '#fbc531' },
                  { label: 'Fats', current: totals.f, target: targets.f, color: 'var(--accent)' }
              ].map(m => (
                  <div key={m.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem', fontWeight: 600 }}>
                          <span>{m.label}</span>
                          <span>{Math.round(m.current)}g / {m.target}g</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ 
                              height: '100%', 
                              width: `${Math.min((m.current/m.target)*100, 100)}%`, 
                              background: m.color,
                              transition: 'width 0.5s ease'
                          }}></div>
                      </div>
                  </div>
              ))}
          </div>
        </div>

        <div className="card stat-card">
          <h3>Activity & Weight</h3>
          <div style={{ display: 'grid', gap: '2rem', marginTop: '1rem' }}>
              <div>
                  <div className="stat-value" style={{ margin: '0 0 0.5rem' }}>{today.steps.toLocaleString()}</div>
                  <p className="text-muted" style={{ marginBottom: '1rem' }}>Steps (Goal: 10,000)</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="number" className="btn btn-secondary" value={stepsInput} onChange={e => setStepsInput(parseInt(e.target.value)||0)} style={{ flex: 1, cursor: 'text' }}/>
                      <button className="btn btn-primary" onClick={updateSteps}>Update</button>
                  </div>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                  <div className="stat-value" style={{ margin: '0 0 0.5rem', color: 'var(--success)' }}>{today.weight || '--'} <span style={{ fontSize: '1rem' }}>KG</span></div>
                  <p className="text-muted" style={{ marginBottom: '1rem' }}>Current Body Weight</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="number" step="0.1" className="btn btn-secondary" value={weightInput} onChange={e => setWeightInput(parseFloat(e.target.value)||0)} style={{ flex: 1, cursor: 'text' }}/>
                      <button className="btn btn-primary" onClick={updateWeight}>Log</button>
                  </div>
              </div>
          </div>
        </div>

        <div className="card stat-card">
          <h3>Hydration</h3>
          <div className="stat-value" style={{ background: 'linear-gradient(135deg, #fff 0%, #3498db 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {today.water_ml} <span style={{ fontSize: '1rem', WebkitTextFillColor: 'var(--text-muted)' }}>ML</span>
          </div>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Goal: 3,000 ml</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <input 
              type="number" 
              className="btn btn-secondary"
              value={waterInput} 
              onChange={(e) => setWaterInput(parseInt(e.target.value) || 0)}
              style={{ width: '120px', cursor: 'text', textAlign: 'center' }}
            />
            <button className="btn btn-primary" onClick={updateWater}>Update</button>
          </div>
        </div>
      </div>

      <h2 style={{ margin: '3rem 0 1.5rem' }}>History & Progress</h2>
      <div className="dashboard-grid" style={{ marginBottom: '3rem' }}>
        <div className="card">
            <h3 className="text-muted" style={{ fontSize: '0.9rem', textTransform: 'uppercase' }}>Weight Tracking</h3>
            <div className="chart-container">
            {history.map((h: any, i: number) => {
                const weights = history.map((x: any) => x.weight).filter((x: any) => x !== null);
                const minWeight = Math.min(...weights, 50) - 2;
                const maxWeight = Math.max(...weights, 100) + 2;
                const barHeight = h.weight ? ((h.weight - minWeight) / (maxWeight - minWeight)) * 100 : 0;
                const isToday = i === history.length - 1;
                
                return (
                <div key={i} className="chart-bar-wrapper">
                    <div 
                        className="chart-bar"
                        title={h.weight ? `${h.weight} kg` : 'No entry'}
                        style={{ 
                            height: `${Math.max(barHeight, 2)}%`, 
                            background: isToday ? 'var(--success)' : 'rgba(0, 255, 175, 0.2)',
                            borderRadius: '4px'
                        }} 
                    ></div>
                    <span className="chart-label">{new Date(h.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                </div>
                );
            })}
            </div>
        </div>

        <div className="card">
            <h3 className="text-muted" style={{ fontSize: '0.9rem', textTransform: 'uppercase' }}>Daily Calories</h3>
            <div className="chart-container">
            {history.map((h: any, i: number) => {
                const maxKcal = Math.max(...history.map((x: any) => x.total_kcal), profile.target_kcal, 1);
                const barHeight = (h.total_kcal / maxKcal) * 100;
                const isToday = i === history.length - 1;
                
                return (
                <div key={i} className="chart-bar-wrapper">
                    <div 
                        className="chart-bar"
                        title={`${h.total_kcal} kcal`}
                        style={{ height: `${Math.max(barHeight, 5)}%`, opacity: isToday ? 1 : 0.6 }} 
                    ></div>
                    <span className="chart-label">{new Date(h.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                </div>
                );
            })}
            </div>
        </div>

        <div className="card">
            <h3 className="text-muted" style={{ fontSize: '0.9rem', textTransform: 'uppercase' }}>Steps</h3>
            <div className="chart-container">
            {history.map((h: any, i: number) => {
                const barHeight = (h.steps / 12000) * 100;
                const isToday = i === history.length - 1;
                
                return (
                <div key={i} className="chart-bar-wrapper">
                    <div 
                        className="chart-bar"
                        title={`${h.steps} steps`}
                        style={{ 
                            height: `${Math.max(barHeight, 5)}%`,
                            background: isToday ? 'var(--secondary)' : 'rgba(79, 172, 254, 0.2)',
                            opacity: isToday ? 1 : 0.6
                        }} 
                    ></div>
                    <span className="chart-label">{new Date(h.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                </div>
                );
            })}
            </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ margin: 0 }}>Recent Meals</h2>
            <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => window.location.href='/meal'}>+ Add Meal</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {today.food_items.map((item: any, idx: number) => (
            <div key={idx} className="meal-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                    <div className="meal-info">
                        <span className="meal-label">{item.label}</span>
                        <span className="meal-meta">{item.type || 'Meal'} • {item.grams}g</span>
                    </div>
                    <div className="meal-kcal">+{item.kcal} kcal</div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    <span>P: {Math.round(item.protein || 0)}g</span>
                    <span>C: {Math.round(item.carbs || 0)}g</span>
                    <span>F: {Math.round(item.fat || 0)}g</span>
                </div>
            </div>
            ))}
        </div>
        {today.food_items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem' }}>
                <p className="text-muted">No meals tracked today.</p>
            </div>
        )}
      </div>
    </div>
  );
};
