import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import api from '../api';
import { useAuth, usePopup } from '../hooks';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { CoachIcon, SavedIcon, SyncIcon, ResetIcon, DropIcon, GlassIcon, BottleIcon, FireIcon, FootprintsIcon, ScaleIcon, ConnectedIcon, TrashIcon, AppleIcon, CapsuleIcon, EditIcon } from './Icons';
import { MACRO_DISTRIBUTIONS, type MacroDistType } from '../constants';
import { QuickLogModal } from './QuickLogModal';

interface EditFoodModalProps {
  item: any;
  onClose: () => void;
  onSave: (updated: any) => void;
}

const EditFoodModal = ({ item, onClose, onSave }: EditFoodModalProps) => {
  const [formData, setFormData] = useState({ 
    ...item, 
    ingredients: item.ingredients ? [...item.ingredients] : [] 
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/log/food-item?logged_at=${encodeURIComponent(item.logged_at)}`, formData);
      onSave(formData);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleIngredientChange = (idx: number, field: string, value: any) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[idx] = { ...newIngredients[idx], [field]: value };
    
    const totalKcal = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.kcal) || 0), 0);
    const totalP = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.protein) || 0), 0);
    const totalC = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.carbs) || 0), 0);
    const totalF = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.fat) || 0), 0);
    const totalG = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.grams) || 0), 0);
    
    setFormData({
        ...formData,
        ingredients: newIngredients,
        kcal: Math.round(totalKcal),
        protein: Number(totalP.toFixed(2)),
        carbs: Number(totalC.toFixed(2)),
        fat: Number(totalF.toFixed(2)),
        grams: Math.round(totalG)
    });
  };

  const removeIngredient = (idx: number) => {
    const newIngredients = formData.ingredients.filter((_: any, i: number) => i !== idx);
    
    const totalKcal = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.kcal) || 0), 0);
    const totalP = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.protein) || 0), 0);
    const totalC = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.carbs) || 0), 0);
    const totalF = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.fat) || 0), 0);
    const totalG = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.grams) || 0), 0);
    
    setFormData({
        ...formData,
        ingredients: newIngredients,
        kcal: Math.round(totalKcal),
        protein: Number(totalP.toFixed(2)),
        carbs: Number(totalC.toFixed(2)),
        fat: Number(totalF.toFixed(2)),
        grams: Math.round(totalG)
    });
  };

  const mealTypes = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000, padding: '1rem', backdropFilter: 'blur(10px)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative', background: '#0a0a0a', border: '1px solid var(--card-border)', borderRadius: '1rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', zIndex: 1 }}
        >
          ×
        </button>

        <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem' }}>
          <EditIcon size={24} color="var(--primary)" /> Edit Log
        </h2>
        <p style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.1rem', marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {formData.label}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Meal Type Selection */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {mealTypes.map(t => (
                    <button 
                        key={t}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: t })}
                        style={{ 
                            padding: '0.4rem 0.8rem', 
                            borderRadius: '2rem', 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            background: formData.type === t ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                            color: formData.type === t ? '#000' : 'var(--text-muted)',
                            border: '1px solid',
                            borderColor: formData.type === t ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                            flex: '1 0 auto',
                            minWidth: '70px'
                        }}
                    >
                        {t}
                    </button>
                ))}
          </div>

          {/* Ingredients Section */}
          {formData.ingredients && formData.ingredients.length > 0 && (
              <div style={{ marginBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid rgba(251, 197, 49, 0.2)', paddingBottom: '0.5rem' }}>Composition</h4>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                      {formData.ingredients.map((ing: any, idx: number) => (
                          <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{ing.label}</div>
                                  <button 
                                      onClick={() => removeIngredient(idx)}
                                      style={{ background: 'none', border: 'none', color: 'rgba(255,71,87,0.4)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}
                                      onMouseOver={(e) => e.currentTarget.style.color = '#ff4757'}
                                      onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,71,87,0.4)'}
                                  >
                                      ×
                                  </button>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                  <div>
                                      <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Grams</label>
                                      <input 
                                          type="number"
                                          value={ing.grams === 0 ? '' : ing.grams}
                                          onChange={(e) => handleIngredientChange(idx, 'grams', Number(e.target.value))}
                                          placeholder="0"
                                          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.4rem', borderRadius: '0.4rem', fontSize: '0.8rem', textAlign: 'center' }}
                                      />
                                  </div>
                                  <div>
                                      <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Kcal</label>
                                      <input 
                                          type="number"
                                          value={ing.kcal === 0 ? '' : ing.kcal}
                                          onChange={(e) => handleIngredientChange(idx, 'kcal', Number(e.target.value))}
                                          placeholder="0"
                                          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.4rem', borderRadius: '0.4rem', fontSize: '0.8rem', textAlign: 'center' }}
                                      />
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem', display: 'block' }}>Total Grams</label>
                <input 
                  type="number" 
                  value={formData.grams === 0 ? '' : formData.grams} 
                  onChange={e => setFormData({ ...formData, grams: Number(e.target.value) })}
                  readOnly={formData.ingredients.length > 0}
                  placeholder="0"
                  style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff', textAlign: 'center', fontSize: '1rem', fontWeight: 700, opacity: formData.ingredients.length > 0 ? 0.6 : 1 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem', display: 'block' }}>Total Calories</label>
                <input 
                  type="number" 
                  value={formData.kcal === 0 ? '' : formData.kcal} 
                  onChange={e => setFormData({ ...formData, kcal: Number(e.target.value) })}
                  readOnly={formData.ingredients.length > 0}
                  placeholder="0"
                  style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff', textAlign: 'center', fontSize: '1rem', fontWeight: 700, opacity: formData.ingredients.length > 0 ? 0.6 : 1 }}
                />
              </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.4rem', display: 'block', textAlign: 'center' }}>Protein</label>
                <input 
                  type="number" step="0.1"
                  value={formData.protein} 
                  onChange={e => setFormData({ ...formData, protein: parseFloat(e.target.value) })}
                  readOnly={formData.ingredients.length > 0}
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#fff', textAlign: 'center', fontSize: '1.1rem', fontWeight: 800, padding: '0.25rem 0', opacity: formData.ingredients.length > 0 ? 0.6 : 1 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.4rem', display: 'block', textAlign: 'center' }}>Carbs</label>
                <input 
                  type="number" step="0.1"
                  value={formData.carbs} 
                  onChange={e => setFormData({ ...formData, carbs: parseFloat(e.target.value) })}
                  readOnly={formData.ingredients.length > 0}
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#fff', textAlign: 'center', fontSize: '1.1rem', fontWeight: 800, padding: '0.25rem 0', opacity: formData.ingredients.length > 0 ? 0.6 : 1 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.4rem', display: 'block', textAlign: 'center' }}>Fat</label>
                <input 
                  type="number" step="0.1"
                  value={formData.fat} 
                  onChange={e => setFormData({ ...formData, fat: parseFloat(e.target.value) })}
                  readOnly={formData.ingredients.length > 0}
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#fff', textAlign: 'center', fontSize: '1.1rem', fontWeight: 800, padding: '0.25rem 0', opacity: formData.ingredients.length > 0 ? 0.6 : 1 }}
                />
              </div>
          </div>

          <button 
            type="submit" 
            disabled={saving} 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1rem', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}
          >
            {saving ? 'Updating...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const Dashboard = () => {
  const [showLogModal, setShowLogModal] = useState(false);
  const [mealType, setMealType] = useState(() => {
      // 1. Try to initialize from cache to maintain sequence across refreshes
      const cached = localStorage.getItem('dashboard_cache');
      if (cached) {
          try {
              const parsed = JSON.parse(cached);
              const items = parsed?.today?.food_items;
              if (items && items.length > 0) {
                  const loggedTypes = items.map((i: any) => i.type);
                  const mTypes = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
                  let latestIdx = -1;
                  mTypes.forEach((type, idx) => {
                      if (loggedTypes.includes(type)) latestIdx = idx;
                  });
                  if (latestIdx !== -1) {
                      return mTypes[(latestIdx + 1) % mTypes.length];
                  }
              }
          } catch(e) {}
      }

      // 2. Fallback to time-of-day logic
      const hour = new Date().getHours();
      if (hour >= 4 && hour < 11) return 'Breakfast';
      if (hour >= 11 && hour < 16) return 'Lunch';
      if (hour >= 16 && hour < 19) return 'Snack';
      return 'Dinner';
  });

  const [editingItem, setEditingItem] = useState<any>(null);
  const [isAICoachOpen, setIsAICoachOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [data, setData] = useState<any>(() => {
      const cached = localStorage.getItem('dashboard_cache');
      return cached ? JSON.parse(cached) : null;
  });

  const mealTypes = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

  const getNextMealType = (current: string) => {
    const currentIndex = mealTypes.indexOf(current);
    const nextIndex = (currentIndex + 1) % mealTypes.length;
    return mealTypes[nextIndex];
  };

  // Intelligently suggest the next meal category
  useEffect(() => {
    if (data?.today?.food_items) {
      if (data.today.food_items.length === 0) {
        // If nothing is logged today, default to time-of-day
        const hour = new Date().getHours();
        if (hour >= 4 && hour < 11) setMealType('Breakfast');
        else if (hour >= 11 && hour < 16) setMealType('Lunch');
        else if (hour >= 16 && hour < 19) setMealType('Snack');
        else setMealType('Dinner');
      } else {
        // If meals exist, suggest the first missing one in the sequence
        const loggedTypes = data.today.food_items.map((item: any) => item.type);
        const nextMeal = mealTypes.find(type => !loggedTypes.includes(type));
        if (nextMeal) {
            setMealType(nextMeal);
        }
      }
    }
  }, [data?.today?.food_items]);

  const [stepsInput, setStepsInput] = useState<string>('');
  const [waterInput, setWaterInput] = useState<string>('0'); 
  const [weightInput, setWeightInput] = useState<string>('');
  const [weightPeriod, setWeightPeriod] = useState<number>(4); // Default to 4 weeks
  const [savingWater, setSavingWater] = useState(false);
  const [savingCreatine, setSavingCreatine] = useState(false);
  const [lastStepsUpdate, setLastStepsUpdate] = useState<string>('');
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const { user: authUser, refreshUser } = useAuth();
  const { showPopup } = usePopup();

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
      
      setStepsInput(String(res.data.today.steps));
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
      await api.put(`/log/steps?steps=${parseInt(stepsInput) || 0}`);
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
      
      // 3. Enforce digit limits: XX.XX format
      let integerPart = parts[0].slice(0, 2); // Allow up to 2 digits for Liters (max 99L)
      let decimalPart = parts[1] !== undefined ? parts[1].slice(0, 2) : '';
      
      const finalVal = parts.length === 2 ? `${integerPart}.${decimalPart}` : integerPart;
      setWaterInput(finalVal || '0');
  };

    const handleWeightInputChange = (val: string) => {
      let cleaned = val.replace(',', '.').replace(/[^0-9.]/g, '');
      const parts = cleaned.split('.');
      if (parts.length > 2) return;
      let integerPart = parts[0].slice(0, 3);
      let decimalPart = parts[1] !== undefined ? parts[1].slice(0, 1) : '';
      const finalVal = parts.length === 2 ? `${integerPart}.${decimalPart}` : integerPart;
      setWeightInput(finalVal);
  };

  const toggleCreatine = async () => {
    try {
      setSavingCreatine(true);
      await api.post('/log/toggle-creatine');
      await fetchData();
      setTimeout(() => setSavingCreatine(false), 600);
    } catch (err) {
      setSavingCreatine(false);
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

  const deleteFoodItem = async (loggedAt: string) => {
    showPopup({
        type: 'confirm',
        title: 'Delete Item',
        message: 'Are you sure you want to remove this item from your diary?',
        confirmLabel: 'DELETE',
        onConfirm: async () => {
            try {
                await api.delete(`/log/food-item?logged_at=${encodeURIComponent(loggedAt)}&date_str=${today.date}`);
                await fetchData();
            } catch (err) {
                console.error(err);
            }
        }
    });
  };

  const googleSync = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      try {
        await api.post('/log/google-store-code', { code: codeResponse.code });
        await api.post('/log/sync-google-fit', {}); 
        await fetchData();
        showPopup({ message: 'Steps synced successfully!', title: 'Success' });
      } catch (err) {
        showPopup({ message: 'Failed to sync with Google Fit.', title: 'Error' });
      }
    },
    scope: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read',
    // @ts-expect-error
    access_type: 'offline',
    prompt: 'consent',
  });

  const handleGoogleSync = async () => {
    // 1. Check if running on native platform
    const isNative = (window as any).Capacitor && (window as any).Capacitor.getPlatform() !== 'web';
    
    if (isNative) {
      try {
        console.log("DEBUG: Starting native Google Auth...");
        const user = await GoogleAuth.signIn();
        console.log("DEBUG: Native Auth success:", user);
        
        if (user.serverAuthCode) {
          await api.post('/log/google-store-code', { code: user.serverAuthCode });
          await api.post('/log/sync-google-fit', {}); 
          await fetchData();
          showPopup({ message: 'Steps synced successfully!', title: 'Success' });
        } else {
          showPopup({ message: 'Please grant all permissions to sync steps.', title: 'Permission Required' });
        }
      } catch (err) {
        console.error('Native Google Auth error:', err);
        showPopup({ message: 'Sync failed. Ensure you signed in and granted permissions.', title: 'Sync Error' });
      }
    } else {
      // 2. Web fallback
      googleSync();
    }
  };

  if (!data) return (
    <div className="container" style={{ display: 'flex', height: '50vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="stat-value" style={{ fontSize: '1.5rem' }}>Preparing...</div>
    </div>
  );

  const { today, user: dashboardUser, history = [], weekly_performance: rawWeeklyPerf, feedback, weightHistory = [] } = data;
  
  // Robust weekly performance calculation (frontend fallback)
  const weekly_performance = (() => {
      // Calculate a window of 5 days: [today-2, today-1, today, today+1, today+2]
      const days = [];
      const todayDate = new Date();
      
      for (let i = -2; i <= 2; i++) {
          const d = new Date(todayDate);
          d.setDate(todayDate.getDate() + i);
          const iso = d.toISOString().split('T')[0];
          
          // Try to find existing data in history or rawWeeklyPerf
          const existing = (rawWeeklyPerf || []).find((p: any) => p.date === iso) || 
                           (history || []).find((h: any) => h.date === iso);
          
          days.push({
              date: iso,
              displayDay: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
              total_kcal: existing?.total_kcal || 0,
              protein: existing?.protein || 0,
              carbs: existing?.carbs || 0,
              fat: existing?.fat || 0,
              steps: existing?.steps || 0,
              water_ml: existing?.water_ml || 0,
              got_creatine: existing?.got_creatine || false,
              rating: existing?.rating || 0,
              targets: existing?.targets || { kcal: 2000, steps: 10000, water_ml: 3000, protein: 150, carbs: 200, fat: 70 }
          });
      }
      return days;
  })();
  
  // Merge profiles to ensure we have the most complete data
  const profile = {
      ...(authUser?.profile || {}),
      ...(dashboardUser?.profile || {})
  };
  
  const displayName = profile.name || authUser?.email?.split('@')[0] || 'Athlete';
  
  const kcalPercent = (profile?.target_kcal && today?.total_kcal) ? (today.total_kcal / profile.target_kcal) * 100 : 0;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(kcalPercent, 100) / 100) * circumference;

  const totals = (today?.food_items || []).reduce((acc: any, item: any) => ({
      p: acc.p + (item.protein || 0),
      c: acc.c + (item.carbs || 0),
      f: acc.f + (item.fat || 0)
  }), { p: 0, c: 0, f: 0 });

  const targets = {
      p: profile.target_protein || Math.round(((profile.target_kcal || 2000) * (MACRO_DISTRIBUTIONS[(profile.macro_distribution || 'balanced') as MacroDistType]?.p || 0.3)) / 4),
      c: profile.target_carbs || Math.round(((profile.target_kcal || 2000) * (MACRO_DISTRIBUTIONS[(profile.macro_distribution || 'balanced') as MacroDistType]?.c || 0.4)) / 4),
      f: profile.target_fat || Math.round(((profile.target_kcal || 2000) * (MACRO_DISTRIBUTIONS[(profile.macro_distribution || 'balanced') as MacroDistType]?.f || 0.3)) / 9)
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
      <div className="card mobile-center" style={{ textAlign: 'left', marginBottom: '1rem', background: '#121212', border: '1px solid var(--card-border)' }}>
          <div>
              <h1 style={{ marginBottom: '0.25rem', margin: 0 }}>Welcome Back, <span style={{ color: 'var(--primary)' }}>{displayName}</span></h1>
              <p className="text-muted" style={{ fontSize: '1.1rem', margin: 0 }}>
                  Plan: <strong>{String(profile.objective || 'N/A').replace('_', ' ').toUpperCase()}</strong> 
                  <span style={{ margin: '0 0.75rem', opacity: 0.3 }}>|</span>
                  Distribution: <strong>{MACRO_DISTRIBUTIONS[(profile.macro_distribution || 'balanced') as MacroDistType]?.name || 'Balanced'}</strong>
              </p>
          </div>
      </div>

      {/* Weekly Performance Tracker */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem', background: '#121212', border: '1px solid var(--card-border)', overflow: 'visible' }}>
          <h3 style={{ fontSize: '0.8rem', marginBottom: '1rem', color: '#fff', textAlign: 'left', fontWeight: 800 }}>WEEKLY PERFORMANCE</h3>
          <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              gap: '0.5rem',
              overflow: 'visible',
              paddingBottom: '0.5rem',
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none', // IE
          }}>
              {(weekly_performance || []).map((day: any, i: number) => {
                  const kcalTarget = day.targets?.kcal || 2000;
                  const stepsTarget = day.targets?.steps || 10000;
                  const waterTarget = day.targets?.water_ml || 3000;
                  const pTarget = day.targets?.protein || 150;
                  const cTarget = day.targets?.carbs || 200;
                  const fTarget = day.targets?.fat || 70;

                  const kcalScore = Math.min((day.total_kcal || 0) / kcalTarget, 1);
                  const stepsScore = Math.min((day.steps || 0) / stepsTarget, 1);
                  const waterScore = Math.min((day.water_ml || 0) / waterTarget, 1);
                  const pScore = Math.min((day.protein || 0) / pTarget, 1);
                  const cScore = Math.min((day.carbs || 0) / cTarget, 1);
                  const fScore = Math.min((day.fat || 0) / fTarget, 1);
                  
                  const macrosScore = (pScore + cScore + fScore) / 3;
                  const avgPerformance = ((kcalScore + stepsScore + waterScore + macrosScore) / 4) * 100;

                  const todayIso = new Date().toISOString().split('T')[0];
                  const isToday = day.date === todayIso;
                  const isFuture = new Date(day.date) > new Date();

                  const TODAY_COLOR = 'var(--primary)'; // Yellow for Today

                  let circleColor = 'rgba(255,255,255,0.05)';
                  let circleBg = 'rgba(255,255,255,0.02)';
                  let glow = 'none';

                  if (!isFuture) {
                      if (avgPerformance >= 70) {
                          circleColor = 'var(--success)';
                          circleBg = 'rgba(46, 204, 113, 0.15)';
                          glow = '0 0 15px rgba(46, 204, 113, 0.2)';
                      } else if (avgPerformance >= 40) {
                          circleColor = '#f39c12'; // Orange/Yellow
                          circleBg = 'rgba(243, 156, 18, 0.1)';
                          glow = '0 0 10px rgba(243, 156, 18, 0.1)';
                      } else {
                          circleColor = '#ff4757'; // Red
                          circleBg = 'rgba(255, 71, 87, 0.1)';
                          glow = '0 0 10px rgba(255, 71, 87, 0.1)';
                      }
                  }
                  
                  const feedbackText = (() => {
                      if (isFuture) return null;
                      const kcalDiff = Math.abs((day.total_kcal || 0) - kcalTarget) / kcalTarget;
                      let kcalVal = "Not enough";
                      if (kcalDiff <= 0.1) kcalVal = "Spot on";
                      else if (day.total_kcal > kcalTarget * 1.1) kcalVal = "Too much";
                      else if (day.total_kcal >= kcalTarget * 0.4) kcalVal = "Good enough";

                      let waterVal = "Need more";
                      if (day.water_ml >= waterTarget) waterVal = "Perfect";
                      else if (day.water_ml >= 2300) waterVal = "Good";
                      else if (day.water_ml >= 1700) waterVal = "Good enough";

                      let stepsVal = "Not enough";
                      if (day.steps >= stepsTarget) stepsVal = "Goal met";
                      else if (day.steps >= stepsTarget * 0.7) stepsVal = "Almost there";
                      else if (day.steps >= stepsTarget * 0.4) stepsVal = "Good enough";

                      return { kcal: kcalVal, water: waterVal, steps: stepsVal };
                  })();

                  // Alignment logic to prevent clipping on first/last days
                  const isFirst = i === 0;
                  const isLast = i === 6;
                  const tooltipX = isFirst ? '20%' : (isLast ? '-20%' : '-50%');
                  const arrowX = isFirst ? '20%' : (isLast ? '80%' : '50%');

                  return (
                      <div 
                        key={i} 
                        onMouseEnter={() => setHoveredDay(i)}
                        onMouseLeave={() => setHoveredDay(null)}
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          gap: '0.75rem', 
                          flex: 1,
                          position: 'relative',
                          padding: '1rem 0',
                          background: isToday ? 'rgba(251, 197, 49, 0.05)' : 'transparent',
                          borderRadius: '1rem',
                          border: isToday ? `1px solid rgba(251, 197, 49, 0.1)` : '1px solid transparent',
                          cursor: 'pointer',
                          overflow: 'visible'
                      }}>
                          {hoveredDay === i && feedbackText && (
                              <div style={{
                                  position: 'absolute',
                                  bottom: '100%',
                                  left: tooltipX === '-50%' ? '50%' : (isFirst ? '0' : 'auto'),
                                  right: isLast ? '0' : 'auto',
                                  transform: tooltipX === '-50%' ? 'translateX(-50%)' : 'none',
                                  marginBottom: '1rem',
                                  background: '#1a1a1a',
                                  border: '1px solid var(--card-border)',
                                  padding: '0.75rem',
                                  borderRadius: '0.5rem',
                                  zIndex: 1000,
                                  minWidth: '150px',
                                  pointerEvents: 'none',
                                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                  animation: 'fade-in 0.2s ease'
                              }}>
                                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>
                                      DAILY SNAPSHOT
                                  </div>
                                  <div style={{ display: 'grid', gap: '0.4rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.7rem' }}>
                                          <span style={{ color: 'var(--text-muted)' }}>Kcal</span>
                                          <span style={{ fontWeight: 700, color: feedbackText.kcal === 'Spot on' ? 'var(--success)' : (feedbackText.kcal === 'Good enough' ? '#f39c12' : '#ff4757') }}>{feedbackText.kcal}</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.7rem' }}>
                                          <span style={{ color: 'var(--text-muted)' }}>Water</span>
                                          <span style={{ fontWeight: 700, color: feedbackText.water === 'Perfect' ? 'var(--success)' : (['Good', 'Good enough'].includes(feedbackText.water) ? '#f39c12' : '#ff4757') }}>{feedbackText.water}</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.7rem' }}>
                                          <span style={{ color: 'var(--text-muted)' }}>Steps</span>
                                          <span style={{ fontWeight: 700, color: feedbackText.steps === 'Goal met' ? 'var(--success)' : (['Almost there', 'Good enough'].includes(feedbackText.steps) ? '#f39c12' : '#ff4757') }}>{feedbackText.steps}</span>
                                      </div>
                                  </div>
                                  <div style={{
                                      position: 'absolute',
                                      top: '100%',
                                      left: arrowX,
                                      transform: 'translateX(-50%)',
                                      borderWidth: '6px',
                                      borderStyle: 'solid',
                                      borderColor: '#1a1a1a transparent transparent transparent'
                                  }} />
                              </div>
                          )}
                          {isToday && (
                              <div style={{
                                  position: 'absolute',
                                  top: '4px',
                                  width: 0,
                                  height: 0,
                                  borderLeft: '5px solid transparent',
                                  borderRight: '5px solid transparent',
                                  borderTop: `6px solid ${TODAY_COLOR}`,
                                  zIndex: 2,
                                  filter: 'drop-shadow(0 0 5px rgba(251, 197, 49, 0.8))'
                              }} />
                          )}
                          <div style={{ 
                              width: '60px', 
                              height: '60px', 
                              borderRadius: '50%', 
                              display: 'flex', 
                              flexDirection: 'column',
                              alignItems: 'center', 
                              justifyContent: 'center',
                              background: circleBg,
                              border: isToday ? `2px solid ${TODAY_COLOR}` : `2px solid ${circleColor}`,
                              color: isToday ? TODAY_COLOR : (isFuture ? 'var(--text-muted)' : circleColor),
                              transition: 'all 0.3s ease',
                              boxShadow: isToday ? `0 0 20px rgba(251, 197, 49, 0.4), inset 0 0 10px rgba(251, 197, 49, 0.1)` : glow,
                              opacity: isFuture ? 0.3 : 1,
                              zIndex: 1,
                              lineHeight: 1.1
                          }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isToday ? TODAY_COLOR : (isFuture ? 'var(--text-muted)' : 'inherit') }}>
                                  {day.displayDay}
                              </span>
                              <span style={{ fontSize: '1rem', fontWeight: 900, marginTop: '2px' }}>
                                  {new Date(day.date).getDate()}
                              </span>
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>

      {feedback && (
        <div 
            className="card animate-fade-in mobile-center" 
            onClick={isDesktop ? undefined : () => setIsAICoachOpen(!isAICoachOpen)}
            style={{ 
                background: 'rgba(251, 197, 49, 0.03)',
                borderLeft: '6px solid var(--primary)',
                textAlign: 'left',
                padding: '1.5rem 2rem',
                marginBottom: '2rem',
                borderTop: '1px solid rgba(251, 197, 49, 0.1)',
                borderRight: '1px solid rgba(251, 197, 49, 0.1)',
                borderBottom: '1px solid rgba(251, 197, 49, 0.1)',
                cursor: isDesktop ? 'default' : 'pointer',
                transition: 'all 0.3s ease'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: 'var(--primary)' }}><CoachIcon size={24} /></span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', textTransform: 'uppercase', color: 'var(--primary)' }}>Daily AI Coach</h3>
                <div style={{ 
                    marginLeft: 'auto', 
                    padding: '0.2rem 0.6rem', 
                    fontSize: '0.7rem', 
                    fontWeight: 800, 
                    background: feedback.status === 'on_track' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(251, 197, 49, 0.1)',
                    color: feedback.status === 'on_track' ? 'var(--success)' : 'var(--warning)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    {feedback.status === 'on_track' ? 'ON TRACK' : 'NEEDS ATTENTION'}
                    {!isDesktop && (
                        <span style={{ 
                            fontSize: '0.6rem', 
                            transform: isAICoachOpen ? 'rotate(180deg)' : 'rotate(0)',
                            transition: 'transform 0.3s ease',
                            opacity: 0.5
                        }}>▼</span>
                    )}
                </div>
            </div>
            
            {(isAICoachOpen || isDesktop) ? (
                <div style={{ marginTop: '1.5rem', animation: 'fade-in 0.3s ease' }}>
                    <p style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '1.5rem', color: '#fff', lineHeight: 1.5 }}>
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
            ) : (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>
                    Tap to view insights & suggestions
                </p>
            )}
        </div>
      )}
      {/* Trackers */}
      <div className="dashboard-stats-grid">
        <div className="card stat-card-consistent">
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
                  { label: 'Protein', current: totals.p, target: targets.p, color: '#3498db' },
                  { label: 'Carbs', current: totals.c, target: targets.c, color: 'var(--primary)' },
                  { label: 'Fats', current: totals.f, target: targets.f, color: '#e74c3c' }
              ].map(m => (
                  <div key={m.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem', fontWeight: 600 }}>
                          <span>{m.label}</span>
                          <span>{(m.current || 0).toFixed(2)}g / {m.target}g</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min((m.current/(m.target || 1))*100, 100)}%`, background: m.color }}></div>
                      </div>
                  </div>
              ))}
          </div>
        </div>

        <div className="card stat-card-consistent">
          <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <DropIcon size={20} color="var(--primary)" /> Hydration
          </h3>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', width: '100%', flexWrap: 'wrap' }}>
                <input 
                    id="main-water-input"
                    type="text" 
                    inputMode="decimal"
                    value={waterInput} 
                    onChange={(e) => handleWaterInputChange(e.target.value)}
                    className="stat-value"
                    spellCheck={false}
                    autoComplete="off"
                    style={{ background: 'transparent', fontSize: 'clamp(3rem, 15vw, 4.5rem)', border: 'none', outline: 'none', textAlign: 'center', width: 'auto', minWidth: '100px', caretColor: 'transparent' }}
                />
                <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 800, marginLeft: '0.5rem' }}>LITERS</span>
            </div>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Goal: 3.00 L</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
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

          {/* Creatine Toggle */}
          <div style={{ 
              marginTop: '2rem', 
              paddingTop: '1.5rem', 
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '1rem',
              flexWrap: 'wrap'
          }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CapsuleIcon size={18} color={today.got_creatine ? 'var(--primary)' : 'var(--text-muted)'} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: today.got_creatine ? '#fff' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Creatine Daily Dose
                  </span>
              </div>
              <div 
                  onClick={toggleCreatine}
                  style={{ 
                      width: '48px', 
                      height: '24px', 
                      background: today.got_creatine ? 'var(--primary)' : 'rgba(255,255,255,0.1)', 
                      borderRadius: '12px', 
                      position: 'relative', 
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: savingCreatine ? 0.6 : 1,
                      pointerEvents: savingCreatine ? 'none' : 'auto'
                  }}
              >
                  <div style={{ 
                      position: 'absolute', 
                      top: '3px', 
                      left: today.got_creatine ? '27px' : '3px', 
                      width: '18px', 
                      height: '18px', 
                      background: today.got_creatine ? '#000' : 'var(--text-muted)', 
                      borderRadius: '50%', 
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                  }} />
              </div>
          </div>

        </div>
      </div>

      {/* Activity & Weight */}
      <div className="dashboard-stats-grid">
        <div className="card stat-card-consistent" style={{ padding: '1.5rem' }}>
            <div className="mobile-stack" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FootprintsIcon size={20} color="var(--primary)" /> Daily Steps
                    </h3>
                    <div className="stat-value" style={{ 
                        margin: '0.5rem 0', 
                        fontSize: 'clamp(3rem, 15vw, 4.5rem)' 
                    }}>
                        {today.steps.toLocaleString()}
                    </div>
                    <p className="text-muted" style={{ margin: 0 }}>Goal: {profile.target_steps?.toLocaleString() || '10,000'} steps</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end', width: '100%', maxWidth: '200px' }}>
                    <button 
                        className="btn btn-secondary btn-sync" 
                        onClick={() => handleGoogleSync()} 
                        style={{ fontSize: '0.7rem', flexDirection: 'column', padding: '0.5rem 1rem', width: '100%', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff' }}>
                            {dashboardUser.has_google_sync ? <><ConnectedIcon size={14} /> Connected</> : <><SyncIcon size={14} /> Sync Fit</>}
                        </span>
                        {lastStepsUpdate && (
                            <span style={{ fontSize: '0.55rem', opacity: 0.9, marginTop: '2px', fontWeight: 700, color: 'var(--success)' }}>last updated at: {lastStepsUpdate}</span>
                        )}
                    </button>
                    
                    {!dashboardUser.has_google_sync && (
                        <div style={{ display: 'flex', gap: '0.25rem', width: '100%' }}>
                            <input 
                                type="number" 
                                className="btn btn-secondary" 
                                value={stepsInput} 
                                onChange={e => setStepsInput(e.target.value)} 
                                style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.05)', cursor: 'text' }}
                            />
                            <button className="btn btn-primary" onClick={updateSteps} style={{ fontSize: '0.7rem', padding: '0 0.75rem' }}>SET</button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="card stat-card-consistent" style={{ padding: '1.5rem' }}>
            <div className="mobile-stack" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ScaleIcon size={20} color="var(--primary)" /> Current Weight
                    </h3>
                    <div className="stat-value" style={{ 
                        margin: '0.5rem 0', 
                        fontSize: 'clamp(3rem, 15vw, 4.5rem)' 
                    }}>
                        {lastKnownWeight || '--'} <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>KG</span>
                    </div>
                    <p className="text-muted">{weightLabel}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', width: '100%', maxWidth: '200px' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                        <input 
                            id="weight-input"
                            type="text" 
                            inputMode="decimal"
                            className="btn btn-secondary" 
                            value={weightInput} 
                            spellCheck={false}
                            autoComplete="off"
                            onChange={e => handleWeightInputChange(e.target.value)} 
                            style={{ width: '80px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', cursor: 'text', padding: '0.5rem', caretColor: 'transparent' }}
                        />
                        <button className="btn btn-primary" onClick={updateWeight} style={{ padding: '0.5rem 1rem', minWidth: '70px' }}>LOG</button>
                    </div>
                </div>
            </div>
        </div>
      </div>


      {/* Today's Food Diary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2rem 0 1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AppleIcon size={28} color="var(--primary)" /> Today's Food Diary
        </h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={() => setShowLogModal(true)}>+ Log Food</button>
        </div>
      </div>
      <div className="card" style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)' }}>
        {today?.food_items && today.food_items.length > 0 ? (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {today.food_items.map((item: any, idx: number) => (
              <div 
                key={idx} 
                className="meal-item" 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '1rem 1.5rem',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(255,255,255,0.03)',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '200px' }}>
                    <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'rgba(251, 197, 49, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 900, fontSize: '0.8rem', flexShrink: 0 }}>
                        {item.type?.charAt(0) || 'M'}
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>{item.label}</div>
                        {item.ingredients && item.ingredients.length > 0 && (
                            <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.2rem', letterSpacing: '0.02em', opacity: 0.8 }}>
                                Composed of: {item.ingredients.map((ing: any) => ing.label).join(', ')}
                            </div>
                        )}
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>
                            {item.grams}g • <span style={{ color: 'var(--primary)' }}>{item.kcal} kcal</span> • P: {(item.protein || 0).toFixed(2)}g C: {(item.carbs || 0).toFixed(2)}g F: {(item.fat || 0).toFixed(2)}g
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                    <button 
                      onClick={() => setEditingItem(item)}
                      className="btn btn-secondary"
                      style={{ 
                          padding: '0.6rem', 
                          borderRadius: '50%', 
                          width: '38px', 
                          height: '38px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: 'rgba(255,255,255,0.2)',
                          border: '1px solid rgba(255,255,255,0.05)'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'}
                      onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                    >
                      <EditIcon size={18} />
                    </button>
                    <button 
                      onClick={() => deleteFoodItem(item.logged_at)}
                      className="btn btn-secondary"
                      style={{ 
                          padding: '0.6rem', 
                          borderRadius: '50%', 
                          width: '38px', 
                          height: '38px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: 'rgba(255,255,255,0.2)',
                          border: '1px solid rgba(255,255,255,0.05)'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.color = '#ff4757'}
                      onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                    >
                      <TrashIcon size={18} />
                    </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <AppleIcon size={48} color="rgba(255,255,255,0.05)" style={{ marginBottom: '1.5rem' }} />
            <p className="text-muted" style={{ fontSize: '1.1rem' }}>No meals logged today yet.</p>
          </div>
        )}
      </div>


      <h2 style={{ margin: '2rem 0 1rem' }}>History & Progress</h2>
      <div className="dashboard-stats-grid">
        <div className="card stat-card-consistent">
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

        <div className="card stat-card-consistent">
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

        <div className="card stat-card-consistent">
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

      {editingItem && createPortal(
          <EditFoodModal 
              item={editingItem} 
              onClose={() => setEditingItem(null)} 
              onSave={() => {
                  setEditingItem(null);
                  fetchData();
              }}
          />,
          document.body
      )}

      {showLogModal && createPortal(
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '2rem', backdropFilter: 'blur(8px)' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <button 
                    onClick={() => setShowLogModal(false)}
                    style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}
                  >
                    ×
                  </button>
                  <QuickLogModal 
                    onClose={() => setShowLogModal(false)}
                    onSuccess={() => {
                        setShowLogModal(false);
                        fetchData();
                    }} 
                    mealType={mealType}
                    setMealType={setMealType}
                    getNextMealType={getNextMealType}
                  />
              </div>
          </div>,
          document.body
      )}
    </div>
  );
};
