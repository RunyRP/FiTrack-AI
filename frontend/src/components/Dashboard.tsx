import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../api';
import { useAuth } from '../App';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { CoachIcon, SavedIcon, SyncIcon, ResetIcon, DropIcon, GlassIcon, BottleIcon, FireIcon, FootprintsIcon, ScaleIcon, ConnectedIcon } from './Icons';

export const Dashboard = () => {
  const [data, setData] = useState<any>(() => {
      const cached = localStorage.getItem('dashboard_cache');
      return cached ? JSON.parse(cached) : null;
  });
  const [stepsInput, setStepsInput] = useState<number>(0);
  const [waterInput, setWaterInput] = useState<string>('0'); 
  const [weightInput, setWeightInput] = useState<string>('');
  const [weightPeriod, setWeightPeriod] = useState<number>(4); // Default to 4 weeks
  const [savingWater, setSavingWater] = useState(false);
  const [lastStepsUpdate, setLastStepsUpdate] = useState<string>('');
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
      setWaterInput(String(res.data.today.water_ml / 1000)); 
      setLastStepsUpdate(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
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
      try {
          const hour = new Date().getHours();
          const res = await api.get(`/log/feedback?hour=${hour}`);
          const newData = { ...data, feedback: res.data };
          setData(newData);
          localStorage.setItem('dashboard_cache', JSON.stringify(newData));
      } catch (err) {
          console.error(err);
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
      const valueToSave = litersOverride !== undefined ? litersOverride : parseFloat(waterInput);
      const ml = Math.round(valueToSave * 1000);
      await api.put(`/log/water?water_ml=${ml}`);
      await fetchData();
      setTimeout(() => setSavingWater(false), 600);
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
      setTimeout(() => setSavingWater(false), 600);
    } catch (err) {
      setSavingWater(false);
    }
  };

  const handleWaterInputChange = (val: string) => {
      // 1. Remove initial 0 if a digit is pressed
      let cleaned = val;
      if (waterInput === '0' && val.length > 1) {
          cleaned = val.replace(/^0+/, '');
      }
      
      // 2. Allow only numbers and one dot
      cleaned = cleaned.replace(/[^0-9.]/g, '');
      
      const parts = cleaned.split('.');
      if (parts.length > 2) return; // Ignore multiple dots
      
      // 3. Enforce digit limits: X.XX format
      let integerPart = parts[0].slice(0, 1); // Only 1 digit for Liters
      let decimalPart = parts[1] !== undefined ? parts[1].slice(0, 2) : '';
      
      const finalVal = parts.length === 2 ? `${integerPart}.${decimalPart}` : integerPart;
      setWaterInput(finalVal || '0');
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
      try {
        await api.post('/log/google-store-code', { code: codeResponse.code });
        await api.post('/log/sync-google-fit', {}); 
        await fetchData();
        alert('Steps synced successfully!');
      } catch (err) {
        alert('Failed to sync.');
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

  const weightChange = (() => {
      const daysToLookBack = weightPeriod * 7;
      const filteredHistory = (weightHistory || []).slice(-daysToLookBack);
      const validWeights = filteredHistory.filter((h: any) => h.weight !== null);
      if (validWeights.length < 2) return null;
      const initial = validWeights[0].weight;
      const current = validWeights[validWeights.length - 1].weight;
      return current - initial;
  })();

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
                <span style={{ color: 'var(--primary)' }}><CoachIcon size={24} /></span>
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
                {feedback.insights && feedback.insights.length > 0 
                    ? feedback.insights.join(' ') 
                    : (feedback.summary || "No feedback yet.")}
            </p>


            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {feedback.insights.map((insight: string, i: number) => (
                    <div 
                        key={i} 
                        className="insight-chip"
                        style={{ 
                            fontSize: '0.8rem', 
                            padding: '0.4rem 0.8rem', 
                            background: 'rgba(251, 197, 49, 0.05)', 
                            border: '1px solid rgba(251, 197, 49, 0.1)', 
                            color: 'var(--text-muted)',
                            transition: 'all 0.3s ease',
                            cursor: 'default'
                        }}
                    >
                        {insight}
                    </div>
                ))}
            </div>
        </div>
      )}
      {/* Trackers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div className="card stat-card">
          <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <FireIcon size={20} color="var(--primary)" /> Daily Calories
          </h3>
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
          <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <DropIcon size={20} color="var(--primary)" /> Hydration
          </h3>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', width: '100%' }}>
                <input 
                    id="main-water-input"
                    type="text" 
                    inputMode="decimal"
                    value={waterInput} 
                    onChange={(e) => handleWaterInputChange(e.target.value)}
                    className="stat-value"
                    style={{ background: 'linear-gradient(135deg, #fff 0%, #fbc531 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'initial', color: '#fff', fontSize: '4.5rem', border: 'none', outline: 'none', textAlign: 'center', width: 'auto', minWidth: '150px', caretColor: 'transparent' }}
                />
                <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 800, marginLeft: '0.5rem' }}>LITERS</span>
            </div>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Goal: 3.00 L</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className={`btn ${savingWater ? 'btn-success' : 'btn-primary'}`} onClick={() => updateWater()}>{savingWater ? <><SavedIcon size={18} /> Saved</> : 'Update'}</button>
                <button className="btn btn-secondary" onClick={() => { setWaterInput('0'); updateWater(0); }}><ResetIcon size={18} /></button>
            </div>
          </div>
          <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              {[
                { label: 'Sip', amt: 0.015, icon: <DropIcon size={14} /> }, 
                { label: 'Glass', amt: 0.25, icon: <GlassIcon size={14} /> }, 
                { label: 'Bottle', amt: 0.5, icon: <BottleIcon size={14} /> }
              ].map(item => (
                  <button key={item.label} className="btn btn-secondary" style={{ padding: '0.5rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => addWater(item.amt)}>
                    {item.icon} {item.label}
                  </button>
              ))}
          </div>

        </div>
      </div>

      {/* Activity & Weight */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div className="card stat-card" style={{ textAlign: 'left', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FootprintsIcon size={20} color="var(--primary)" /> Daily Steps
                    </h3>
                    <div className="stat-value" style={{ margin: '0.5rem 0', fontSize: '3rem' }}>{today.steps.toLocaleString()}</div>
                    <p className="text-muted" style={{ margin: 0 }}>Goal: {profile.target_steps?.toLocaleString() || '10,000'}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => googleSync()} 
                        style={{ fontSize: '0.7rem', flexDirection: 'column', padding: '0.5rem 1rem', minWidth: '110px' }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {dashboardUser.has_google_sync ? <><ConnectedIcon size={14} color="currentColor" /> Connected</> : <><SyncIcon size={14} /> Sync Fit</>}
                        </span>
                        {lastStepsUpdate && (
                            <span style={{ fontSize: '0.55rem', opacity: 0.9, marginTop: '2px', fontWeight: 700, color: 'var(--success)' }}>Last updated at: {lastStepsUpdate}</span>
                        )}
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
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ScaleIcon size={20} color="var(--primary)" /> Current Weight
                    </h3>
                    <div className="stat-value" style={{ margin: '0.5rem 0', fontSize: '3rem' }}>{lastKnownWeight || '--'} <span style={{ fontSize: '1.2rem' }}>KG</span></div>
                    <p className="text-muted">{weightLabel}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="number" step="0.1" className="btn btn-secondary" value={weightInput} onChange={e => setWeightInput(e.target.value)} style={{ width: '100px', caretColor: 'transparent' }}/>
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
            {weightChange !== null && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <select 
                            value={weightPeriod} 
                            onChange={(e) => setWeightPeriod(parseInt(e.target.value))}
                            style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                color: 'var(--text-muted)', 
                                fontSize: '0.7rem', 
                                fontWeight: 800, 
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                outline: 'none',
                                padding: '0.2rem'
                            }}
                        >
                            <option value={1} style={{ background: '#000' }}>1 WEEK</option>
                            <option value={2} style={{ background: '#000' }}>2 WEEKS</option>
                            <option value={3} style={{ background: '#000' }}>3 WEEKS</option>
                            <option value={4} style={{ background: '#000' }}>4 WEEKS</option>
                        </select>
                        <span className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 800 }}>PROGRESS</span>
                    </div>
                    <span style={{ 
                        fontSize: '1.2rem', 
                        fontWeight: 900, 
                        color: weightChange <= 0 ? 'var(--success)' : 'var(--primary)' 
                    }}>
                        {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} KG
                        <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem', opacity: 0.7 }}>
                            {weightChange > 0 ? 'GAINED' : 'LOST'}
                        </span>
                    </span>
                </div>
            )}
        </div>

        <div className="card">
            <h3 className="text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Daily Calories</h3>
            <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="displayDate" tick={{fontSize: 10, fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip 
                            contentStyle={{ background: '#000', border: '1px solid var(--primary)', borderRadius: '0' }}
                            itemStyle={{ color: 'var(--primary)', fontSize: '0.8rem' }}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar dataKey="total_kcal" fill="var(--primary)" fillOpacity={0.6}>
                            {history.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fillOpacity={index === history.length - 1 ? 1 : 0.6} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="card">
            <h3 className="text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Steps</h3>
            <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="displayDate" tick={{fontSize: 10, fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip 
                            contentStyle={{ background: '#000', border: '1px solid var(--primary)', borderRadius: '0' }}
                            itemStyle={{ color: 'var(--primary)', fontSize: '0.8rem' }}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar dataKey="steps" fill="var(--primary)" fillOpacity={0.6}>
                            {history.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fillOpacity={index === history.length - 1 ? 1 : 0.6} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};
