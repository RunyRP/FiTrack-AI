import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../api';

export const Dashboard = () => {
  const [data, setData] = useState<any>(() => {
      const cached = localStorage.getItem('dashboard_cache');
      return cached ? JSON.parse(cached) : null;
  });
  const [stepsInput, setStepsInput] = useState<number>(0);
  const [waterInput, setWaterInput] = useState<number>(0); // Store as Liters in UI
  const [weightInput, setWeightInput] = useState<number>(0);
  const [loadingAI, setLoadingAI] = useState(false);
  const [savingWater, setSavingWater] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/log/dashboard-data');
      setData(res.data);
      localStorage.setItem('dashboard_cache', JSON.stringify(res.data));
      setStepsInput(res.data.today.steps);
      setWaterInput(res.data.today.water_ml / 1000); // Display as L
      setWeightInput(res.data.today.weight || res.data.user.profile.weight || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-sync steps every 5 minutes if a Google session is active
    const syncInterval = setInterval(() => {
        const token = localStorage.getItem('google_access_token');
        if (token) {
            console.log("DEBUG: Auto-syncing Google Fit steps...");
            api.post('/log/sync-google-fit', { access_token: token })
               .then(() => fetchData())
               .catch(err => {
                   console.error("Auto-sync failed:", err);
                   if (err.response?.status === 401 || err.response?.status === 403) {
                       localStorage.removeItem('google_access_token');
                   }
               });
        }
    }, 300000); // 5 minutes

    return () => clearInterval(syncInterval);
  }, []);

  // Auto-refresh AI feedback if it's in the initial state
  useEffect(() => {
      if (data?.feedback?.summary === "Your AI Coach is analyzing your progress...") {
          refreshAI();
      }
  }, [data]);

  const refreshAI = async () => {
      setLoadingAI(true);
      try {
          const res = await api.get('/log/feedback');
          const newData = { ...data, feedback: res.data };
          setData(newData);
          localStorage.setItem('dashboard_cache', JSON.stringify(newData));
      } catch (err) {
          console.error(err);
      } finally {
          setLoadingAI(false);
      }
  };

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
      setSavingWater(true);
      // Convert Liters back to ML for backend (Absolute update)
      const ml = Math.round(waterInput * 1000);
      await api.put(`/log/water?water_ml=${ml}`);
      await fetchData();
      setTimeout(() => setSavingWater(false), 800);
    } catch (err) {
      console.error(err);
      setSavingWater(false);
    }
  };

  const addWater = async (liters: number) => {
    try {
      setSavingWater(true);
      const ml = Math.round(liters * 1000);
      await api.put(`/log/add-water?water_ml=${ml}`);
      await fetchData();
      setTimeout(() => setSavingWater(false), 800);
    } catch (err) {
      console.error(err);
      setSavingWater(false);
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

  const googleSync = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      console.log("DEBUG Google: Auth code received", codeResponse.code);
      setLoadingAI(true); 
      try {
        await api.post('/log/google-store-code', { code: codeResponse.code });
        await api.post('/log/sync-google-fit'); // Now backend will use refresh token
        await fetchData();
        alert('Steps synced successfully! Permanent background sync is now active for your account.');
      } catch (err) {
        console.error("DEBUG Google Sync error:", err);
        alert('Failed to sync with Google Fit. Please try again.');
      } finally {
        setLoadingAI(false);
      }
    },
    scope: 'https://www.googleapis.com/auth/fitness.activity.read',
    onError: (error) => {
        console.error('Login Failed:', error);
        alert('Google Login Failed. Please ensure popups are allowed for this site.');
    }
  });

  if (!data) return (
    <div className="container" style={{ display: 'flex', height: '50vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="stat-value" style={{ fontSize: '1.5rem' }}>Preparing your dashboard...</div>
    </div>
  );

  const { today, user, history, feedback } = data;
  const profile = user.profile;

  const kcalPercent = profile.target_kcal ? (today.total_kcal / profile.target_kcal) * 100 : 0;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(kcalPercent, 100) / 100) * circumference;

  const totals = today.food_items.reduce((acc: any, item: any) => ({
      p: acc.p + (item.protein || 0),
      c: acc.c + (item.carbs || 0),
      f: acc.f + (item.fat || 0)
  }), { p: 0, c: 0, f: 0 });

  const targets = {
      p: Math.round((profile.target_kcal * 0.3) / 4),
      c: Math.round((profile.target_kcal * 0.4) / 4),
      f: Math.round((profile.target_kcal * 0.3) / 9)
  };

  return (
    <div className="container">
      <div className="card" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Welcome Back, {profile.name || 'Athlete'}</h1>
        <p className="text-muted" style={{ fontSize: '1.1rem' }}>Personalized plan: <strong>{profile.objective?.replace('_', ' ')}</strong></p>
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
                {feedback.summary === "Your AI Coach is analyzing your progress..." ? (
                    <button className="btn btn-secondary" onClick={refreshAI} disabled={loadingAI} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                        {loadingAI ? 'Analyzing...' : 'Generate Daily Summary ✨'}
                    </button>
                ) : (
                    `"${feedback.summary}"`
                )}
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

      {/* Main Trackers Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div className="card stat-card" style={{ marginBottom: 0 }}>
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

        <div className="card stat-card" style={{ marginBottom: 0, position: 'relative' }}>
          <button 
            onClick={() => document.getElementById('main-water-input')?.focus()}
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', opacity: 0.6 }}
            title="Edit Total"
          >
            ✏️
          </button>
          <h3>Hydration</h3>
          
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', width: '100%' }}>
                <input 
                    id="main-water-input"
                    type="number" 
                    step="0.01"
                    value={waterInput} 
                    onChange={(e) => setWaterInput(parseFloat(e.target.value) || 0)}
                    className="stat-value"
                    style={{ 
                        background: 'linear-gradient(135deg, #fff 0%, #3498db 100%)', 
                        WebkitBackgroundClip: 'text', 
                        WebkitTextFillColor: 'initial', 
                        color: '#fff',
                        fontSize: '4.5rem',
                        border: 'none',
                        outline: 'none',
                        textAlign: 'center',
                        width: '200px',
                        padding: 0,
                        margin: 0,
                        cursor: 'text'
                    }}
                />
                <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 800, marginLeft: '0.5rem' }}>LITERS</span>
            </div>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Goal: 3.00 L</p>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={updateWater} 
                  style={{ 
                    padding: '0.6rem 2rem', 
                    transition: 'all 0.2s ease',
                    background: savingWater ? 'var(--success)' : 'var(--primary)',
                    borderColor: savingWater ? 'var(--success)' : 'var(--primary)',
                    transform: savingWater ? 'scale(0.95)' : 'scale(1)',
                    boxShadow: savingWater ? 'none' : '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  {savingWater ? 'Saved' : 'Update Daily Total'}
                </button>
                <button 
                    className="btn btn-secondary" 
                    onClick={() => setWaterInput(0)}
                    style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                    title="Reset to 0"
                >
                    🧹 Reset
                </button>
            </div>
          </div>

          <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              {[
                  { label: '💧 Sip (+0.1L)', amt: 0.1 },
                  { label: '🥛 Glass (+0.25L)', amt: 0.25 },
                  { label: '🍼 Bottle (+0.5L)', amt: 0.5 }
              ].map(item => (
                  <button 
                    key={item.label} 
                    className="btn btn-secondary" 
                    style={{ padding: '0.5rem 0.8rem', fontSize: '0.75rem', fontWeight: 600 }} 
                    onClick={() => {
                        setWaterInput(prev => parseFloat((prev + item.amt).toFixed(2)));
                        addWater(item.amt);
                    }}
                  >
                    {item.label}
                  </button>
              ))}
          </div>
        </div>
      </div>

      {/* Activity & Weight Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div className="card stat-card" style={{ marginBottom: 0, textAlign: 'left', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ margin: 0 }}>Daily Steps</h3>
                    <div className="stat-value" style={{ margin: '0.5rem 0', fontSize: '3rem' }}>{today.steps.toLocaleString()}</div>
                    <p className="text-muted">Goal: 10,000</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => googleSync()} 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                        <span>🔄</span> Sync Google Fit
                    </button>
                    <input type="number" className="btn btn-secondary" value={stepsInput} onChange={e => setStepsInput(parseInt(e.target.value)||0)} style={{ width: '100px', cursor: 'text' }}/>
                    <button className="btn btn-primary" onClick={updateSteps}>Set</button>
                </div>
            </div>
        </div>

        <div className="card stat-card" style={{ marginBottom: 0, textAlign: 'left', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ margin: 0 }}>Current Weight</h3>
                    <div className="stat-value" style={{ margin: '0.5rem 0', fontSize: '3rem', color: 'var(--success)' }}>{today.weight || '--'} <span style={{ fontSize: '1.2rem' }}>KG</span></div>
                    <p className="text-muted">Tracking progress</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="number" step="0.1" className="btn btn-secondary" value={weightInput} onChange={e => setWeightInput(parseFloat(e.target.value)||0)} style={{ width: '100px', cursor: 'text' }}/>
                    <button className="btn btn-primary" onClick={updateWeight}>Log</button>
                </div>
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
