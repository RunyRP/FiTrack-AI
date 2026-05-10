import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../api';
import { useAuth } from '../App';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export const Dashboard = () => {
  const [data, setData] = useState<any>(() => {
      const cached = localStorage.getItem('dashboard_cache');
      return cached ? JSON.parse(cached) : null;
  });
  const [stepsInput, setStepsInput] = useState<number>(0);
  const [waterInput, setWaterInput] = useState<number>(0); 
  const [weightInput, setWeightInput] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [savingWater, setSavingWater] = useState(false);
  const { user: authUser, refreshUser } = useAuth();

  const fetchData = async () => {
    try {
      const res = await api.get('/log/dashboard-data');
      // Ensure history dates are valid and data is clean
      const sanitizedHistory = (res.data.history || []).map((h: any) => {
          let dateStr = '---';
          try {
              const d = new Date(h.date);
              if (!isNaN(d.getTime())) {
                  dateStr = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
              }
          } catch(e) {}
          return {
              ...h,
              displayDate: dateStr,
              total_kcal: Number(h.total_kcal) || 0,
              steps: Number(h.steps) || 0
          };
      });
      const cleanData = { ...res.data, history: sanitizedHistory };
      setData(cleanData);
      localStorage.setItem('dashboard_cache', JSON.stringify(cleanData));
      
      setStepsInput(res.data.today.steps);
      setWaterInput(res.data.today.water_ml / 1000); 
    } catch (err) {
      console.error("Fetch data error:", err);
    }
  };


  const syncGoogleFit = async () => {
    try {
        await api.post('/log/sync-google-fit', {});
        await fetchData();
    } catch (err: any) {
        if (err.response?.status === 403) {
            console.warn("Google Fit disconnected.");
        }
    }
  };

  useEffect(() => {
    fetchData();
    syncGoogleFit();
    const syncInterval = setInterval(syncGoogleFit, 300000); 
    return () => clearInterval(syncInterval);
  }, []);

  useEffect(() => {
      if (data?.feedback?.summary === "Your AI Coach is analyzing your progress...") {
          refreshAI();
      }
  }, [data]);

  const refreshAI = async () => {
      setLoadingAI(true);
      try {
          const hour = new Date().getHours();
          const res = await api.get(`/log/feedback?hour=${hour}`);
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

  const updateWater = async (litersOverride?: number) => {
    try {
      setSavingWater(true);
      const valueToSave = litersOverride !== undefined ? litersOverride : waterInput;
      const ml = Math.round(valueToSave * 1000);
      await api.put(`/log/water?water_ml=${ml}`);
      await fetchData();
      setTimeout(() => setSavingWater(false), 1200);
    } catch (err) {
      setSavingWater(false);
    }
  };

  const addWater = async (liters: number) => {
    try {
      setSavingWater(true);
      const ml = Math.round(liters * 1000);
      await api.put(`/log/add-water?water_ml=${ml}`);
      await fetchData();
      setTimeout(() => setSavingWater(false), 1200);
    } catch (err) {
      setSavingWater(false);
    }
  };

  const updateWeight = async () => {
    if (!weightInput) return;
    try {
        await api.put(`/log/weight?weight=${parseFloat(weightInput)}`);
        setWeightInput('');
        await fetchData();
        if (refreshUser) await refreshUser();
    } catch (err) {
        console.error(err);
    }
  };

  const googleSync = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      setLoadingAI(true); 
      try {
        await api.post('/log/google-store-code', { code: codeResponse.code });
        await api.post('/log/sync-google-fit', {}); 
        await fetchData();
        alert('Steps synced successfully!');
      } catch (err) {
        alert('Failed to sync.');
      } finally {
        setLoadingAI(false);
      }
    },
    scope: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read',
    // @ts-expect-error
    access_type: 'offline',
    prompt: 'consent',
  });

  if (!data) return (
    <div className="container" style={{ display: 'flex', height: '50vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="stat-value" style={{ fontSize: '1.5rem' }}>Preparing...</div>
    </div>
  );

  const { today, user: dashboardUser, history = [], feedback, weightHistory = [] } = data;
  const profile = dashboardUser?.profile || authUser?.profile || {};
  const displayName = profile.name || authUser?.email?.split('@')[0] || 'Athlete';
  
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
      p: Math.round(((profile.target_kcal || 2000) * 0.3) / 4),
      c: Math.round(((profile.target_kcal || 2000) * 0.4) / 4),
      f: Math.round(((profile.target_kcal || 2000) * 0.3) / 9)
  };

  const lastKnownWeight = today.weight || (weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : profile.weight);
  const weightLabel = today.weight ? "Today" : "Last Recorded";

  return (
    <div className="container">
      <div className="card" style={{ textAlign: 'left', marginBottom: '2rem', background: '#121212', border: '1px solid var(--card-border)' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Welcome Back, <span style={{ color: 'var(--primary)' }}>{displayName}</span></h1>
        <p className="text-muted" style={{ fontSize: '1.1rem' }}>Personalized plan: <strong>{String(profile.objective || 'N/A').replace('_', ' ').toUpperCase()}</strong></p>
      </div>

      {feedback && (
        <div className="card animate-fade-in" style={{ 
            background: 'rgba(251, 197, 49, 0.03)',
            borderLeft: '6px solid var(--primary)',
            textAlign: 'left',
            padding: '2rem',
            marginBottom: '2rem',
            borderTop: '1px solid rgba(251, 197, 49, 0.1)',
            borderRight: '1px solid rgba(251, 197, 49, 0.1)',
            borderBottom: '1px solid rgba(251, 197, 49, 0.1)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🤖</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', textTransform: 'uppercase', color: 'var(--primary)' }}>Daily AI Coach</h3>
                <div style={{ 
                    marginLeft: 'auto', 
                    padding: '0.2rem 0.6rem', 
                    fontSize: '0.7rem', 
                    fontWeight: 800, 
                    background: feedback.status === 'on_track' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(251, 197, 49, 0.1)',
                    color: feedback.status === 'on_track' ? 'var(--success)' : 'var(--warning)'
                }}>
                    {feedback.status === 'on_track' ? 'ON TRACK' : 'NEEDS ATTENTION'}
                </div>
            </div>
            
            <p style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '1rem', color: '#fff' }}>
                {feedback.summary === "Your AI Coach is analyzing your progress..." ? (
                    <button className="btn btn-secondary" onClick={refreshAI} disabled={loadingAI}>
                        {loadingAI ? 'Analyzing...' : 'Generate Daily Summary ✨'}
                    </button>
                ) : `"${feedback.summary}"`}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {feedback.insights.map((insight: string, i: number) => (
                    <div key={i} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                        • {insight}
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* Trackers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
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
              <div className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 800 }}>KCAL</div>
            </div>
          </div>
          <p className="text-muted">Goal: {profile.target_kcal || 2000} kcal</p>
          
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
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min((m.current/(m.target || 1))*100, 100)}%`, background: m.color }}></div>
                      </div>
                  </div>
              ))}
          </div>
        </div>

        <div className="card stat-card">
          <h3>Hydration</h3>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', width: '100%' }}>
                <input 
                    id="main-water-input"
                    type="number" 
                    step="0.01"
                    min="0"
                    max="9.99"
                    value={waterInput} 
                    onInput={(e: any) => {
                        if (e.target.value.length > 4) e.target.value = e.target.value.slice(0, 4);
                    }}
                    onChange={(e) => setWaterInput(parseFloat(e.target.value) || 0)}
                    className="stat-value"
                    style={{ background: 'linear-gradient(135deg, #fff 0%, #fbc531 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'initial', color: '#fff', fontSize: '4.5rem', border: 'none', outline: 'none', textAlign: 'center', width: 'auto', minWidth: '150px' }}
                />
                <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 800, marginLeft: '0.5rem' }}>LITERS</span>
            </div>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Goal: 3.00 L</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-primary" onClick={() => updateWater()}>{savingWater ? 'Saved' : 'Update'}</button>
                <button className="btn btn-secondary" onClick={() => { setWaterInput(0); updateWater(0); }}>🧹</button>
            </div>
          </div>
          <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              {[{ label: '💧 Sip', amt: 0.015 }, { label: '🥛 Glass', amt: 0.25 }, { label: '🍼 Bottle', amt: 0.5 }].map(item => (
                  <button key={item.label} className="btn btn-secondary" style={{ padding: '0.5rem 0.8rem', fontSize: '0.75rem' }} onClick={() => addWater(item.amt)}>{item.label}</button>
              ))}
          </div>
        </div>
      </div>

      {/* Activity & Weight */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div className="card stat-card" style={{ textAlign: 'left', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ margin: 0 }}>Daily Steps</h3>
                    <div className="stat-value" style={{ margin: '0.5rem 0', fontSize: '3rem' }}>{today.steps.toLocaleString()}</div>
                    <p className="text-muted">Goal: 10,000</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={() => googleSync()} style={{ fontSize: '0.7rem' }}>
                        {dashboardUser.has_google_sync ? '✅ Connected' : '🔄 Sync Fit'}
                    </button>
                    {!dashboardUser.has_google_sync && (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <input type="number" className="btn btn-secondary" value={stepsInput} onChange={e => setStepsInput(parseInt(e.target.value)||0)} style={{ width: '80px' }}/>
                            <button className="btn btn-primary" onClick={updateSteps} style={{ fontSize: '0.7rem' }}>SET</button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="card stat-card" style={{ textAlign: 'left', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ margin: 0 }}>Current Weight</h3>
                    <div className="stat-value" style={{ margin: '0.5rem 0', fontSize: '3rem' }}>{lastKnownWeight || '--'} <span style={{ fontSize: '1.2rem' }}>KG</span></div>
                    <p className="text-muted">{weightLabel}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="number" step="0.1" className="btn btn-secondary" value={weightInput} onChange={e => setWeightInput(e.target.value)} style={{ width: '100px' }}/>
                    <button className="btn btn-primary" onClick={updateWeight}>Log</button>
                </div>
            </div>
        </div>
      </div>

      <h2 style={{ margin: '3rem 0 1.5rem' }}>History & Progress</h2>
      <div className="dashboard-grid" style={{ marginBottom: '3rem' }}>
        <div className="card">
            <h3 className="text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Weight Tracking (30D)</h3>
            <div style={{ width: '100%', height: 220 }}>
                {weightHistory && weightHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={weightHistory}>
                            <defs><linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/><stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" tick={{fontSize: 10, fill: 'var(--text-muted)'}} tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                            <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
                            <Tooltip contentStyle={{ background: '#000', border: '1px solid var(--primary)', borderRadius: '0' }}/>
                            <Area type="monotone" dataKey="weight" stroke="var(--primary)" fillOpacity={1} fill="url(#colorWeight)" strokeWidth={4} isAnimationActive={false}/>
                        </AreaChart>
                    </ResponsiveContainer>
                ) : <div className="text-muted">No data.</div>}
            </div>
        </div>

        <div className="card">
            <h3 className="text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Daily Calories</h3>
            <div className="chart-container" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '120px', gap: '6px' }}>
                {(history || []).map((h: any, i: number) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', height: '100%' }}>
                        <div style={{ width: '100%', height: `${Math.max((Number(h.total_kcal || 0) / (profile?.target_kcal || 2000)) * 100, 4)}%`, background: i === history.length - 1 ? 'var(--primary)' : 'rgba(251, 197, 49, 0.1)', border: `1px solid ${i === history.length - 1 ? 'var(--primary)' : 'rgba(251, 197, 49, 0.2)'}`, minHeight: '2px' }}></div>
                        <span style={{ fontSize: '0.5rem', fontWeight: 900, color: 'var(--text-muted)' }}>{h.displayDate || '---'}</span>
                    </div>
                ))}
            </div>
        </div>

        <div className="card">
            <h3 className="text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Steps</h3>
            <div className="chart-container" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '120px', gap: '6px' }}>
                {(history || []).map((h: any, i: number) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', height: '100%' }}>
                        <div style={{ width: '100%', height: `${Math.max((Number(h.steps || 0) / 10000) * 100, 4)}%`, background: i === history.length - 1 ? 'var(--primary)' : 'rgba(251, 197, 49, 0.1)', border: `1px solid ${i === history.length - 1 ? 'var(--primary)' : 'rgba(251, 197, 49, 0.2)'}`, minHeight: '2px' }}></div>
                        <span style={{ fontSize: '0.5rem', fontWeight: 900, color: 'var(--text-muted)' }}>{h.displayDate || '---'}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};
