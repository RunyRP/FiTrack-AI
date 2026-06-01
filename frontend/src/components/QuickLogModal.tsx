import { useState, useEffect } from 'react';
import api from '../api';
import { SearchIcon, AppleIcon, FireIcon, PlusIcon } from './Icons';

interface QuickLogModalProps {
  onClose: () => void;
  onSuccess: () => void;
  mealType: string;
  setMealType: (t: string) => void;
  getNextMealType: (current: string) => string;
}

export const QuickLogModal = ({ onClose, onSuccess, mealType, setMealType, getNextMealType }: QuickLogModalProps) => {
  const [recentFoods, setRecentFoods] = useState<any[]>([]);
  const [customMeals, setCustomMeals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [logging, setLogging] = useState(false);
  const [refiningItem, setRefiningItem] = useState<any>(null);

  const handleRefineIngredientChange = (idx: number, field: string, value: any) => {
      if (!refiningItem?.ingredients) return;
      const newIngredients = [...refiningItem.ingredients];
      let item = { ...newIngredients[idx], [field]: value };
      
      const grams = parseInt(value) || 0;
      if (field === 'grams' && item.kcal_100g !== undefined) {
          const ratio = grams / 100;
          item.kcal = Math.round((Number(item.kcal_100g) || 0) * ratio);
          item.protein = Number(((Number(item.protein_100g) || 0) * ratio).toFixed(2)) || 0;
          item.carbs = Number(((Number(item.carbs_100g) || 0) * ratio).toFixed(2)) || 0;
          item.fat = Number(((Number(item.fat_100g) || 0) * ratio).toFixed(2)) || 0;
          item.grams = grams;
      }

      newIngredients[idx] = item;
      
      const totalKcal = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.kcal) || 0), 0);
      const totalP = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.protein) || 0), 0);
      const totalC = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.carbs) || 0), 0);
      const totalF = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.fat) || 0), 0);
      const totalG = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.grams) || 0), 0);
      
      setRefiningItem({
          ...refiningItem,
          ingredients: newIngredients,
          kcal: Math.round(totalKcal) || 0,
          protein: Number(totalP.toFixed(2)) || 0,
          carbs: Number(totalC.toFixed(2)) || 0,
          fat: Number(totalF.toFixed(2)) || 0,
          grams: Math.round(totalG) || 0
      });
  };

  const handleRefineSimpleChange = (field: string, value: any) => {
      if (!refiningItem) return;
      let newItem = { ...refiningItem, [field]: value };
      
      const grams = parseInt(value) || 0;
      if (field === 'grams' && refiningItem.kcal_100g !== undefined) {
          const ratio = grams / 100;
          newItem.kcal = Math.round((Number(refiningItem.kcal_100g) || 0) * ratio);
          newItem.protein = Number(((Number(refiningItem.protein_100g) || 0) * ratio).toFixed(2)) || 0;
          newItem.carbs = Number(((Number(refiningItem.carbs_100g) || 0) * ratio).toFixed(2)) || 0;
          newItem.fat = Number(((Number(refiningItem.fat_100g) || 0) * ratio).toFixed(2)) || 0;
          newItem.grams = grams;
      }
      
      setRefiningItem(newItem);
  };

  const removeRefineIngredient = (idx: number) => {
      if (!refiningItem?.ingredients) return;
      const newIngredients = refiningItem.ingredients.filter((_: any, i: number) => i !== idx);
      
      const totalKcal = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.kcal) || 0), 0);
      const totalP = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.protein) || 0), 0);
      const totalC = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.carbs) || 0), 0);
      const totalF = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.fat) || 0), 0);
      const totalG = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.grams) || 0), 0);
      
      setRefiningItem({
          ...refiningItem,
          ingredients: newIngredients,
          kcal: Math.round(totalKcal) || 0,
          protein: Number(totalP.toFixed(2)) || 0,
          carbs: Number(totalC.toFixed(2)) || 0,
          fat: Number(totalF.toFixed(2)) || 0,
          grams: Math.round(totalG) || 0
      });
  };

  const mealTypes = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      const [recentRes, customRes] = await Promise.all([
        api.get('/log/recent-items'),
        api.get('/meal/custom')
      ]);

      const uniqueRecent = (recentRes.data || []).filter((item: any, index: number, self: any[]) =>
          index === self.findIndex((t) => t.label === item.label)
      );
      const uniqueCustom = (customRes.data || []).filter((item: any, index: number, self: any[]) =>
          index === self.findIndex((t) => t.label === item.label)
      );

      setRecentFoods(uniqueRecent);
      setCustomMeals(uniqueCustom);
    } catch (err) {
      console.error('Error fetching quick log data:', err);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length >= 2) handleSearch();
      else setSearchResults([]);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/meal/search?q=${encodeURIComponent(searchQuery)}`);
      const uniqueResults = (res.data.results || []).filter((item: any, index: number, self: any[]) =>
          index === self.findIndex((t) => t.label === item.label)
      );
      setSearchResults(uniqueResults.slice(0, 5));
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLog = async (item: any) => {
    if (item.kcal_100g !== undefined || item.kcal_per_100g !== undefined || (item.ingredients && item.ingredients.length > 0)) {
        let normalized;
        const kcal100 = item.kcal_100g || item.kcal_per_100g;
        const p100 = item.protein_100g || item.protein_per_100g;
        const c100 = item.carbs_100g || item.carbs_per_100g;
        const f100 = item.fat_100g || item.fat_per_100g;

        if (item.kcal !== undefined && item.grams !== undefined) {
            normalized = { 
                ...item, 
                kcal_100g: kcal100, protein_100g: p100, carbs_100g: c100, fat_100g: f100,
                protein: Number(Number(item.protein || 0).toFixed(2)),
                carbs: Number(Number(item.carbs || 0).toFixed(2)),
                fat: Number(Number(item.fat || 0).toFixed(2)),
                ingredients: item.ingredients ? item.ingredients.map((ing: any) => ({ ...ing })) : null
            };
        } else {
            const grams = item.default_grams || 100;
            const ratio = grams / 100;
            normalized = {
                label: item.label,
                grams: Math.round(grams),
                kcal: Math.round((kcal100 || 0) * ratio),
                protein: Number(((p100 || 0) * ratio).toFixed(2)),
                carbs: Number(((c100 || 0) * ratio).toFixed(2)),
                fat: Number(((f100 || 0) * ratio).toFixed(2)),
                kcal_100g: kcal100,
                protein_100g: p100,
                carbs_100g: c100,
                fat_100g: f100,
                type: mealType,
                ingredients: item.ingredients ? item.ingredients.map((ing: any) => ({ ...ing })) : null
            };
        }
        setRefiningItem(normalized);
        return;
    }

    setLogging(true);
    try {
      let logPayload;
      if (item.kcal !== undefined && item.grams !== undefined) {
        logPayload = {
          label: item.label,
          grams: Math.round(item.grams),
          kcal: Math.round(item.kcal),
          protein: Number(Number(item.protein || 0).toFixed(2)),
          carbs: Number(Number(item.carbs || 0).toFixed(2)),
          fat: Number(Number(item.fat || 0).toFixed(2)),
          type: mealType,
          ingredients: item.ingredients || null
        };
      } else {
        const grams = item.default_grams || 100;
        const ratio = grams / 100;
        logPayload = {
          label: item.label,
          grams: Math.round(grams),
          kcal: Math.round((item.kcal_per_100g || 0) * ratio),
          protein: Number(((item.protein_per_100g || 0) * ratio).toFixed(2)),
          carbs: Number(((item.carbs_per_100g || 0) * ratio).toFixed(2)),
          fat: Number(((item.fat_per_100g || 0) * ratio).toFixed(2)),
          type: mealType,
          ingredients: item.ingredients || null
        };
      }
      await api.post('/meal/log', logPayload);
      setMealType(getNextMealType(mealType));
      onSuccess();
    } catch (err) {
      console.error('Logging error:', err);
    } finally {
      setLogging(false);
    }
  };

  const handleRefineLog = async () => {
    if (!refiningItem) return;
    setLogging(true);
    try {
        const payload = {
            label: refiningItem.label || "Unknown Food",
            grams: Math.round(Number(refiningItem.grams) || 0),
            kcal: Math.round(Number(refiningItem.kcal) || 0),
            protein: Number(Number(refiningItem.protein).toFixed(2)) || 0,
            carbs: Number(Number(refiningItem.carbs).toFixed(2)) || 0,
            fat: Number(Number(refiningItem.fat).toFixed(2)) || 0,
            fiber: Number(Number(refiningItem.fiber).toFixed(2)) || 0,
            salt: Number(Number(refiningItem.salt).toFixed(2)) || 0,
            type: mealType,
            ingredients: refiningItem.ingredients || null
        };
        await api.post('/meal/log', payload);
        setRefiningItem(null);
        setMealType(getNextMealType(mealType));
        onSuccess();
    } catch (err) {
        console.error('Refine log error:', err);
    } finally {
        setLogging(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem', backdropFilter: 'blur(10px)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '1.5rem', position: 'relative', background: '#0a0a0a', border: '1px solid var(--card-border)', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', zIndex: 1 }}>×</button>

        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem' }}>
          {refiningItem && (
            <button onClick={() => setRefiningItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                <span style={{ fontSize: '1.2rem', marginRight: '0.25rem' }}>←</span>
            </button>
          )}
          <AppleIcon size={24} color="var(--primary)" /> {refiningItem ? 'Refine & Log' : 'Quick Log'}
        </h2>

        {refiningItem ? (
            <div className="animate-fade-in">
                <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'rgba(251, 197, 49, 0.05)', borderRadius: '1rem', border: '1px solid rgba(251, 197, 49, 0.1)', textAlign: 'center' }}>
                    <div style={{ fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', fontSize: '1.2rem', marginBottom: '0.25rem' }}>{refiningItem.label}</div>
                    <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 700, opacity: 0.9 }}>
                        {refiningItem.kcal} kcal <span style={{ opacity: 0.5, margin: '0 0.5rem' }}>•</span> {refiningItem.grams}g
                    </div>
                </div>

                {refiningItem.ingredients && refiningItem.ingredients.length > 0 ? (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '1rem', fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Composition</h4>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {refiningItem.ingredients.map((ing: any, idx: number) => (
                                <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{ing.label}</div>
                                        <button onClick={() => removeRefineIngredient(idx)} style={{ background: 'none', border: 'none', color: 'rgba(255,71,87,0.4)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}>×</button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div className="input-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Grams</label>
                                            <input 
                                                type="number" 
                                                value={ing.grams === 0 ? '' : ing.grams} 
                                                onChange={e => handleRefineIngredientChange(idx, 'grams', Number(e.target.value))} 
                                                placeholder="0"
                                                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.4rem', borderRadius: '0.4rem', fontSize: '0.8rem', textAlign: 'center' }} 
                                            />
                                        </div>
                                        <div className="input-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Kcal</label>
                                            <input 
                                                type="number" 
                                                value={ing.kcal === 0 ? '' : ing.kcal} 
                                                onChange={e => handleRefineIngredientChange(idx, 'kcal', Number(e.target.value))} 
                                                placeholder="0"
                                                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.4rem', borderRadius: '0.4rem', fontSize: '0.8rem', textAlign: 'center' }} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="input-group">
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem', display: 'block' }}>Weight (Grams)</label>
                            <input 
                                type="number" 
                                value={refiningItem.grams === 0 ? '' : refiningItem.grams} 
                                onChange={e => handleRefineSimpleChange('grams', Number(e.target.value))} 
                                placeholder="0"
                                style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#fff', textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }} 
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                             <div style={{ textAlign: 'center' }}>
                                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>P</label>
                                <div style={{ fontWeight: 800 }}>{(refiningItem.protein || 0).toFixed(2)}g</div>
                             </div>
                             <div style={{ textAlign: 'center' }}>
                                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>C</label>
                                <div style={{ fontWeight: 800 }}>{(refiningItem.carbs || 0).toFixed(2)}g</div>
                             </div>
                             <div style={{ textAlign: 'center' }}>
                                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>F</label>
                                <div style={{ fontWeight: 800 }}>{(refiningItem.fat || 0).toFixed(2)}g</div>
                             </div>
                        </div>
                    </div>
                )}

                <button className="btn btn-primary" onClick={handleRefineLog} disabled={logging || refiningItem.ingredients?.length === 0} style={{ width: '100%', padding: '1rem', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                    {logging ? 'Logging...' : 'Log This Meal'}
                </button>
            </div>
        ) : (
            <>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    {mealTypes.map(t => (
                        <button key={t} onClick={() => setMealType(t)} style={{ padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease', background: mealType === t ? 'var(--primary)' : 'rgba(255,255,255,0.03)', border: '1px solid', borderColor: mealType === t ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: mealType === t ? '#000' : 'var(--text-muted)', flex: '1 0 auto', minWidth: '70px' }}>{t}</button>
                    ))}
                </div>
                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                    <SearchIcon size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="text" placeholder="Search foods or meals..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff', fontSize: '0.9rem' }} />
                </div>
                {loading ? (
                    <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.5rem' }}>Searching...</div>
                ) : searchResults.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: 800 }}>Search Results</h4>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {searchResults.map((item, i) => (
                                <button key={i} disabled={logging} onClick={() => handleQuickLog(item)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(251, 197, 49, 0.05)', border: '1px solid rgba(251, 197, 49, 0.1)', borderRadius: '0.5rem', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                                    <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.kcal} kcal • {item.grams}g</div>
                                    </div>
                                    <PlusIcon size={16} color="var(--primary)" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {!searchQuery && (
                    <>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}><FireIcon size={12} /> Recent Foods</h4>
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                {recentFoods.length > 0 ? recentFoods.map((item, i) => (
                                    <button key={i} disabled={logging} onClick={() => handleQuickLog(item)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.5rem', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                                        <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                                            <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.kcal} kcal • {item.grams}g</div>
                                        </div>
                                        <PlusIcon size={16} color="var(--primary)" />
                                    </button>
                                )) : <div className="text-muted" style={{ fontSize: '0.8rem' }}>No recent foods.</div>}
                            </div>
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}><AppleIcon size={12} /> My Meals</h4>
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                {customMeals.length > 0 ? customMeals.map((item, i) => (
                                    <button key={i} disabled={logging} onClick={() => handleQuickLog(item)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.5rem', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                                        <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                                            <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{Math.round(item.kcal_per_100g * (item.default_grams/100))} kcal</div>
                                        </div>
                                        <PlusIcon size={16} color="var(--primary)" />
                                    </button>
                                )) : <div className="text-muted" style={{ fontSize: '0.8rem' }}>No meals found.</div>}
                            </div>
                        </div>
                    </>
                )}
                <button className="btn btn-secondary" onClick={() => window.location.href='/meal'} style={{ width: '100%', marginTop: '1rem', padding: '1rem', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>Advanced Logging (AI/Photo)</button>
            </>
        )}
      </div>
    </div>
  );
};
