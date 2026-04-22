import { useState, useEffect } from 'react';
import api from '../api';

export const Dashboard = () => {
  const [log, setLog] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [stepsInput, setStepsInput] = useState<number>(0);
  const [waterInput, setWaterInput] = useState<number>(0);

  const fetchData = async () => {
    try {
      const [logRes, profileRes, historyRes] = await Promise.all([
        api.get('/log/today'),
        api.get('/user/me'),
        api.get('/log/history?days=7')
      ]);
      setLog(logRes.data);
      setProfile(profileRes.data.profile);
      setHistory(historyRes.data);
      setStepsInput(logRes.data.steps);
      setWaterInput(logRes.data.water_ml);
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

  if (!log || !profile) return (
    <div className="container" style={{ display: 'flex', height: '50vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="stat-value" style={{ fontSize: '1.5rem' }}>Loading your fitness data...</div>
    </div>
  );

  const kcalPercent = profile.target_kcal ? (log.total_kcal / profile.target_kcal) * 100 : 0;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(kcalPercent, 100) / 100) * circumference;

  // Calculate max values for chart scaling
  const maxKcal = Math.max(...history.map(h => h.total_kcal), profile.target_kcal || 2000, 1);
  const maxSteps = Math.max(...history.map(h => h.steps), 10000, 1);
  const maxWater = Math.max(...history.map(h => h.water_ml), 3000, 1);

  return (
    <div className="container">
      <div className="card" style={{ textAlign: 'left', marginBottom: '3rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Welcome Back, {profile.name || 'Athlete'}</h1>
        <p className="text-muted" style={{ fontSize: '1.1rem' }}>You've burned <strong>{log.total_kcal}</strong> calories today. Keep it up!</p>
      </div>

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
              <div className="stat-value" style={{ fontSize: '2rem', margin: 0 }}>{log.total_kcal}</div>
              <div className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>KCAL</div>
            </div>
          </div>
          <p className="text-muted">Goal: {profile.target_kcal || 2000} kcal</p>
        </div>

        <div className="card stat-card">
          <h3>Daily Steps</h3>
          <div className="stat-value">{log.steps.toLocaleString()}</div>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Target: 10,000 steps</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <input 
              type="number" 
              className="btn btn-secondary"
              value={stepsInput} 
              onChange={(e) => setStepsInput(parseInt(e.target.value) || 0)}
              style={{ width: '120px', cursor: 'text', textAlign: 'center' }}
            />
            <button className="btn btn-primary" onClick={updateSteps}>Update</button>
          </div>
        </div>

        <div className="card stat-card">
          <h3>Hydration</h3>
          <div className="stat-value" style={{ background: 'linear-gradient(135deg, #fff 0%, #3498db 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {log.water_ml} <span style={{ fontSize: '1rem', WebkitTextFillColor: 'var(--text-muted)' }}>ML</span>
          </div>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Target: 3,000 ml</p>
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

      <h2 style={{ margin: '3rem 0 1.5rem' }}>Weekly Insights</h2>
      <div className="dashboard-grid" style={{ marginBottom: '3rem' }}>
        <div className="card">
            <h3 className="text-muted" style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Calories</h3>
            <div className="chart-container">
            {history.map((h, i) => {
                const barHeight = (h.total_kcal / maxKcal) * 100;
                const isToday = i === history.length - 1;
                const dayLabel = new Date(h.date).toLocaleDateString('en-US', { weekday: 'short' });
                
                return (
                <div key={i} className="chart-bar-wrapper">
                    <div 
                        className="chart-bar"
                        title={`${h.total_kcal} kcal`}
                        style={{ 
                            height: `${Math.max(barHeight, 5)}%`, 
                            background: isToday ? 'linear-gradient(to top, var(--primary), #fff)' : undefined,
                            opacity: isToday ? 1 : 0.6
                        }} 
                    ></div>
                    <span className="chart-label">{dayLabel}</span>
                </div>
                );
            })}
            </div>
        </div>

        <div className="card">
            <h3 className="text-muted" style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Steps</h3>
            <div className="chart-container">
            {history.map((h, i) => {
                const barHeight = (h.steps / maxSteps) * 100;
                const isToday = i === history.length - 1;
                const dayLabel = new Date(h.date).toLocaleDateString('en-US', { weekday: 'short' });
                
                return (
                <div key={i} className="chart-bar-wrapper">
                    <div 
                        className="chart-bar"
                        title={`${h.steps} steps`}
                        style={{ 
                            height: `${Math.max(barHeight, 5)}%`,
                            background: isToday ? 'linear-gradient(to top, var(--secondary), #fff)' : 'linear-gradient(to top, rgba(79, 172, 254, 0.2), var(--secondary))',
                            opacity: isToday ? 1 : 0.6
                        }} 
                    ></div>
                    <span className="chart-label">{dayLabel}</span>
                </div>
                );
            })}
            </div>
        </div>

        <div className="card">
            <h3 className="text-muted" style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hydration</h3>
            <div className="chart-container">
            {history.map((h, i) => {
                const barHeight = (h.water_ml / maxWater) * 100;
                const isToday = i === history.length - 1;
                const dayLabel = new Date(h.date).toLocaleDateString('en-US', { weekday: 'short' });
                
                return (
                <div key={i} className="chart-bar-wrapper">
                    <div 
                        className="chart-bar"
                        title={`${h.water_ml} ml`}
                        style={{ 
                            height: `${Math.max(barHeight, 5)}%`,
                            background: isToday ? 'linear-gradient(to top, #3498db, #fff)' : 'linear-gradient(to top, rgba(52, 152, 219, 0.2), #3498db)',
                            opacity: isToday ? 1 : 0.6
                        }} 
                    ></div>
                    <span className="chart-label">{dayLabel}</span>
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
            {log.food_items.map((item: any, idx: number) => (
            <div key={idx} className="meal-item">
                <div className="meal-info">
                    <span className="meal-label">{item.label}</span>
                    <span className="meal-meta">{item.grams}g</span>
                </div>
                <div className="meal-kcal">+{item.kcal} kcal</div>
            </div>
            ))}
        </div>
        {log.food_items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem' }}>
                <p className="text-muted">No meals tracked today. Use the AI camera to log your first meal!</p>
            </div>
        )}
      </div>
    </div>
  );
};
