import React, { useState, useEffect } from 'react';
import api from '../api';

export const Dashboard = () => {
  const [log, setLog] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stepsInput, setStepsInput] = useState<number>(0);
  const [waterInput, setWaterInput] = useState<number>(0);

  const fetchData = async () => {
    try {
      const [logRes, profileRes] = await Promise.all([
        api.get('/log/today'),
        api.get('/user/me')
      ]);
      setLog(logRes.data);
      setProfile(profileRes.data.profile);
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

  if (!log || !profile) return <div className="container">Loading dashboard...</div>;

  const kcalPercent = profile.target_kcal ? (log.total_kcal / profile.target_kcal) * 100 : 0;
  const stepsPercent = (log.steps / 10000) * 100;

  return (
    <div className="container">
      <div className="card">
        <h1>Welcome Back</h1>
        <p className="text-muted">Here's your progress for today</p>
      </div>

      <div className="dashboard-grid">
        <div className="card stat-card">
          <h3>Calories</h3>
          <div className="progress-ring">
            <span className="stat-value">{log.total_kcal}</span>
          </div>
          <p>Goal: {profile.target_kcal || 2000} kcal</p>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginTop: '1rem' }}>
            <div style={{ width: `${Math.min(kcalPercent, 100)}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px' }}></div>
          </div>
        </div>

        <div className="card stat-card">
          <h3>Steps</h3>
          <div className="stat-value">{log.steps}</div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <input 
              type="number" 
              value={stepsInput} 
              onChange={(e) => setStepsInput(parseInt(e.target.value))}
              style={{ width: '100px', padding: '0.25rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}
            />
            <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={updateSteps}>Save</button>
          </div>
          <p style={{ marginTop: '0.5rem' }}>Target: 10,000 steps</p>
        </div>

        <div className="card stat-card">
          <h3>Water (ml)</h3>
          <div className="stat-value">{log.water_ml}</div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <input 
              type="number" 
              value={waterInput} 
              onChange={(e) => setWaterInput(parseInt(e.target.value))}
              style={{ width: '100px', padding: '0.25rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}
            />
            <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={updateWater}>Save</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Today's Meals</h3>
        {log.food_items.map((item: any, idx: number) => (
          <div key={idx} className="meal-item">
            <span>{item.label} ({item.grams}g)</span>
            <span>{item.kcal} kcal</span>
          </div>
        ))}
        {log.food_items.length === 0 && <p className="text-muted">No meals logged yet. Go to "Log Meal" to analyze a photo!</p>}
      </div>
    </div>
  );
};
