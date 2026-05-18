import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { CameraIcon, SearchIcon, SuccessIcon, PlusIcon } from './Icons';

export const MealAnalysis = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [activeTab, setActiveTab] = useState<'photo' | 'search' | 'foods' | 'meals'>('photo');
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [logging, setLogging] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [mealType, setMealType] = useState('Lunch');
  
  // Custom Foods & Meals State
  const [customItems, setCustomItems] = useState<any[]>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newCustom, setNewCustom] = useState({
    label: '',
    kcal_per_100g: '',
    protein_per_100g: '',
    carbs_per_100g: '',
    fat_per_100g: '',
    fiber_per_100g: '',
    salt_per_100g: '',
    default_grams: '100',
    is_quantifiable: false,
    unit_name: 'piece'
  });

  // Editing state
  const [editingCustomItem, setEditingCustomItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  // Meal Builder State
  const [isBuildingMeal, setIsBuildingMeal] = useState(false);
  const [mealBuilderItems, setMealBuilderItems] = useState<any[]>([]);
  const [mealBuilderName, setMealBuilderName] = useState('');
  const [builderSearch, setBuilderSearch] = useState('');
  const [builderResults, setBuilderResults] = useState<any[]>([]);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showEditAdvanced, setShowEditAdvanced] = useState(false);

  // For quantifiable logging
  const [quantity, setQuantity] = useState<string | number>(1);

  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab === 'foods' || activeTab === 'meals') {
      fetchCustomData();
    }
  }, [activeTab]);

  const fetchCustomData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/meal/custom');
      setCustomItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomFood = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const g = parseFloat(newCustom.default_grams) || 100;
      const ratio = newCustom.is_quantifiable ? (g / 100.0) : 1.0;

      await api.post('/meal/custom', {
        ...newCustom,
        kcal_per_100g: (parseFloat(newCustom.kcal_per_100g) || 0) / ratio,
        protein_per_100g: (parseFloat(newCustom.protein_per_100g) || 0) / ratio,
        carbs_per_100g: (parseFloat(newCustom.carbs_per_100g) || 0) / ratio,
        fat_per_100g: (parseFloat(newCustom.fat_per_100g) || 0) / ratio,
        fiber_per_100g: (parseFloat(newCustom.fiber_per_100g) || 0) / ratio,
        salt_per_100g: (parseFloat(newCustom.salt_per_100g) || 0) / ratio,
        is_whole_meal: false,
        default_grams: g,
        is_quantifiable: newCustom.is_quantifiable,
        unit_name: newCustom.unit_name
      });
      setNewCustom({ label: '', kcal_per_100g: '', protein_per_100g: '', carbs_per_100g: '', fat_per_100g: '', fiber_per_100g: '', salt_per_100g: '', default_grams: '100', is_quantifiable: false, unit_name: 'piece' });
      setShowAddCustom(false);
      fetchCustomData();
      setMessage('Food added to your database!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error(err);
      setMessage(err.response?.data?.detail || 'Error adding food.');
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleEditItem = (item: any) => {
      setEditingCustomItem(item);
      const g = parseFloat(item.default_grams) || 100;
      const ratio = item.is_quantifiable && !item.is_whole_meal ? (g / 100.0) : 1.0;

      setEditForm({
          ...item,
          kcal_per_100g: String(Math.round((item.kcal_per_100g * ratio) * 10) / 10),
          protein_per_100g: String(Math.round((item.protein_per_100g * ratio) * 10) / 10),
          carbs_per_100g: String(Math.round((item.carbs_per_100g * ratio) * 10) / 10),
          fat_per_100g: String(Math.round((item.fat_per_100g * ratio) * 10) / 10),
          fiber_per_100g: String(Math.round(((item.fiber_per_100g || 0) * ratio) * 10) / 10),
          salt_per_100g: String(Math.round(((item.salt_per_100g || 0) * ratio) * 10) / 10),
          default_grams: String(item.default_grams || 100)
      });
  };

  const handleUpdateCustomItem = async (e: React.FormEvent) => {
      e.preventDefault();
      setUpdating(true);
      try {
          const g = parseFloat(editForm.default_grams) || 100;
          const ratio = editForm.is_quantifiable && !editingCustomItem.is_whole_meal ? (g / 100.0) : 1.0;

          await api.put(`/meal/custom/${editingCustomItem.id}`, {
              ...editForm,
              kcal_per_100g: (parseFloat(editForm.kcal_per_100g) || 0) / ratio,
              protein_per_100g: (parseFloat(editForm.protein_per_100g) || 0) / ratio,
              carbs_per_100g: (parseFloat(editForm.carbs_per_100g) || 0) / ratio,
              fat_per_100g: (parseFloat(editForm.fat_per_100g) || 0) / ratio,
              fiber_per_100g: (parseFloat(editForm.fiber_per_100g) || 0) / ratio,
              salt_per_100g: (parseFloat(editForm.salt_per_100g) || 0) / ratio,
              default_grams: g
          });
          setEditingCustomItem(null);
          fetchCustomData();
          setMessage('Item updated successfully!');
          setTimeout(() => setMessage(''), 3000);
      } catch (err: any) {
          console.error(err);
          setMessage(err.response?.data?.detail || 'Error updating item.');
          setTimeout(() => setMessage(''), 4000);
      } finally {
          setUpdating(false);
      }
  };

  const handleQuickLog = async (cm: any) => {
    setLogging(true);
    try {
      await api.post('/meal/log', {
        label: cm.label,
        grams: cm.default_grams || 100,
        kcal: Math.round(cm.kcal_per_100g),
        protein: cm.protein_per_100g,
        carbs: cm.carbs_per_100g,
        fat: cm.fat_per_100g,
        fiber: cm.fiber_per_100g,
        salt: cm.salt_per_100g,
        type: mealType
      });
      setMessage(`${cm.label} logged!`);
      if (onSuccess) {
          setTimeout(onSuccess, 1000);
      } else {
          setTimeout(() => navigate('/'), 1000);
      }
    } catch (err) {
      setMessage('Error logging meal.');
    } finally {
      setLogging(false);
    }
  };

  const handleDeleteCustom = async (id: number) => {
    if (!confirm('Delete this item?')) return;
    try {
      await api.delete(`/meal/custom/${id}`);
      fetchCustomData();
    } catch (err) {
      console.error(err);
    }
  };

  // --- Meal Builder Logic ---
  useEffect(() => {
      const delayFn = setTimeout(() => {
          if (builderSearch.trim().length >= 2) {
              performBuilderSearch();
          } else {
              setBuilderResults([]);
          }
      }, 300);
      return () => clearTimeout(delayFn);
  }, [builderSearch]);

  const performBuilderSearch = async () => {
      try {
          const res = await api.get(`/meal/search?q=${builderSearch}`);
          setBuilderResults(res.data.results);
      } catch (err) { console.error(err); }
  };

  const addToMeal = (item: any) => {
      // Calculate base 100g values immediately if they don't exist
      const g = Number(item.grams) || 100;
      const baseKcal = Number(item.kcal_100g) || (Number(item.kcal) / (g / 100));
      const baseP = Number(item.protein_100g) || (Number(item.protein) / (g / 100));
      const baseC = Number(item.carbs_100g) || (Number(item.carbs) / (g / 100));
      const baseF = Number(item.fat_100g) || (Number(item.fat) / (g / 100));
      const baseFib = Number(item.fiber_100g) || ((Number(item.fiber) || 0) / (g / 100));
      const baseS = Number(item.salt_100g) || ((Number(item.salt) || 0) / (g / 100));

      const startGrams = Number(item.default_grams) || g;
      const ratio = startGrams / 100.0;

      const newItem = {
          ...item,
          grams: startGrams,
          default_grams: Number(item.default_grams) || 100,
          kcal: Math.round(baseKcal * ratio),
          protein: baseP * ratio,
          carbs: baseC * ratio,
          fat: baseF * ratio,
          fiber: baseFib * ratio,
          salt: baseS * ratio,
          kcal_100g: baseKcal,
          protein_100g: baseP,
          carbs_100g: baseC,
          fat_100g: baseF,
          fiber_100g: baseFib,
          salt_100g: baseS
      };
      setMealBuilderItems([...mealBuilderItems, newItem]);
      setBuilderResults([]);
      setBuilderSearch('');
  };

  const updateBuilderItemGrams = (idx: number, newGrams: number) => {
      const updated = [...mealBuilderItems];
      const item = updated[idx];
      
      const safeGrams = Math.max(0, Number(newGrams) || 0);
      const kcal100 = Number(item.kcal_100g) || 0;
      const baseRatio = safeGrams / 100.0;
      
      updated[idx] = {
          ...item,
          grams: safeGrams,
          kcal: Math.round(kcal100 * baseRatio),
          protein: (Number(item.protein_100g) || 0) * baseRatio,
          carbs: (Number(item.carbs_100g) || 0) * baseRatio,
          fat: (Number(item.fat_100g) || 0) * baseRatio,
          fiber: (Number(item.fiber_100g) || 0) * baseRatio,
          salt: (Number(item.salt_100g) || 0) * baseRatio
      };
      setMealBuilderItems(updated);
  };

  const removeFromBuilder = (idx: number) => {
      setMealBuilderItems(mealBuilderItems.filter((_, i) => i !== idx));
  };

  // Helper for consistent nutritional updates
  const updateEditItemStats = (newGrams: number, newQuantity: string | number) => {
      const safeGrams = Math.max(0, Number(newGrams) || 0);
      const kcal100 = Number(editItem.kcal_100g) || 0;
      const baseRatio = safeGrams / 100.0;
      
      setQuantity(newQuantity);
      setEditItem({ 
          ...editItem, 
          grams: safeGrams,
          kcal: Math.round(kcal100 * baseRatio),
          protein: (Number(editItem.protein_100g) || 0) * baseRatio,
          carbs: (Number(editItem.carbs_100g) || 0) * baseRatio,
          fat: (Number(editItem.fat_100g) || 0) * baseRatio,
          fiber: (Number(editItem.fiber_100g) || 0) * baseRatio,
          salt: (Number(editItem.salt_100g) || 0) * baseRatio
      });
  };

  const builderTotals = mealBuilderItems.reduce((acc, item) => ({
      kcal: acc.kcal + (item.kcal || 0),
      p: acc.p + (item.protein || 0),
      c: acc.c + (item.carbs || 0),
      f: acc.f + (item.fat || 0),
      fib: acc.fib + (item.fiber || 0),
      s: acc.s + (item.salt || 0)
  }), { kcal: 0, p: 0, c: 0, f: 0, fib: 0, s: 0 });

  const saveBuiltMeal = async () => {
      if (!mealBuilderName || mealBuilderItems.length === 0) return;
      try {
          await api.post('/meal/custom', {
              label: mealBuilderName,
              kcal_per_100g: builderTotals.kcal,
              protein_per_100g: builderTotals.p,
              carbs_per_100g: builderTotals.c,
              fat_per_100g: builderTotals.f,
              fiber_per_100g: builderTotals.fib,
              salt_per_100g: builderTotals.s,
              is_whole_meal: true,
              default_grams: mealBuilderItems.reduce((acc, i) => acc + (i.grams || 0), 0),
              ingredients: mealBuilderItems
          });
          setIsBuildingMeal(false);
          setMealBuilderItems([]);
          setMealBuilderName('');
          fetchCustomData();
          setMessage('New whole meal saved to your library!');
          setTimeout(() => setMessage(''), 3000);
      } catch (err: any) {
          console.error(err);
          setMessage(err.response?.data?.detail || 'Error saving whole meal.');
          setTimeout(() => setMessage(''), 4000);
      }
  };
  
  // --- Standard Search ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim() && activeTab === 'search') {
        handleSearch();
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/meal/search?q=${searchQuery}`);
      setResults(res.data.results);
      setSelectedIdx(null);
      setEditItem(null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setResults([]);
      setSelectedIdx(null);
      setEditItem(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setMessage('');
    setResults([]);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/meal/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const analysisResults = res.data.results;
      setResults(analysisResults);
      if (analysisResults.length === 0) {
        setMessage('No food detected. Please try another photo.');
      } else {
        handleSelect(0, analysisResults[0]);
      }
    } catch (err) { setMessage('Error analyzing image.'); }
    finally { setLoading(false); }
  };

  const handleSelect = (idx: number, item: any) => {
    setSelectedIdx(idx);
    
    // For standard items from AI, we calculate 100g base once
    const baseKcal = item.kcal_100g || (item.kcal / (item.grams / 100));
    const baseP = item.protein_100g || (item.protein / (item.grams / 100));
    const baseC = item.carbs_100g || (item.carbs / (item.grams / 100));
    const baseF = item.fat_100g || (item.fat / (item.grams / 100));
    const baseFib = item.fiber_100g || ((item.fiber || 0) / (item.grams / 100));
    const baseS = item.salt_100g || ((item.salt || 0) / (item.grams / 100));

    setEditItem({ 
        ...item, 
        original_item: item,
        kcal_100g: baseKcal,
        protein_100g: baseP,
        carbs_100g: baseC,
        fat_100g: baseF,
        fiber_100g: baseFib,
        salt_100g: baseS
    });
    setQuantity(item.is_quantifiable ? 1 : 1);
  };

  const handleLogMeal = async () => {
    if (!editItem) return;
    setLogging(true);
    try {
      await api.post('/meal/log', {
        ...editItem,
        type: mealType
      });
      setMessage('Meal logged successfully!');
      if (onSuccess) {
          setTimeout(onSuccess, 1500);
      } else {
          setTimeout(() => navigate('/'), 1500);
      }
    } catch (err) { setMessage('Error logging meal.'); }
    finally { setLogging(false); }
  };

  return (
    <div className="container animate-fade-in">
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="nav-links" style={{ display: 'flex', borderRadius: 0, border: 'none', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', flexWrap: 'wrap' }}>
            {[
                { id: 'photo', label: 'AI Photo', icon: <CameraIcon size={16} /> },
                { id: 'foods', label: 'My Foods', icon: <PlusIcon size={16} /> },
                { id: 'meals', label: 'My Meals', icon: <PlusIcon size={16} /> },
                { id: 'search', label: 'Search', icon: <SearchIcon size={16} /> }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as any); setResults([]); setEditItem(null); }}
                    className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, minWidth: '120px', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: '0.2rem' }}
                >
                    {tab.icon} {tab.label}
                </button>
            ))}
        </div>

        <div style={{ padding: '2.5rem' }}>
            {activeTab === 'photo' && (
                <>
                    <h2>AI Meal Analysis</h2>
                    <p className="text-muted">Take a photo of your meal to estimate calories and macros.</p>
                    <div className="input-group" style={{ marginTop: '2rem' }}>
                        <div style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', position: 'relative' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                <CameraIcon size={32} color={file ? 'var(--primary)' : 'var(--text-muted)'} />
                                {file ? <div style={{ color: 'var(--primary)', fontWeight: 600 }}>{file.name} selected</div> : <div className="text-muted">Click to upload a meal photo</div>}
                            </div>
                            <input type="file" accept="image/*" onChange={handleFileChange} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleUpload} disabled={!file || loading} style={{ width: '100%' }}>{loading ? 'Analyzing...' : 'Analyze Meal'}</button>
                </>
            )}

            {activeTab === 'search' && (
                <>
                    <h2>Search Food</h2>
                    <p className="text-muted">Search from our global database and your custom items.</p>
                    <div className="input-group" style={{ marginTop: '2rem' }}>
                        <input type="text" placeholder="Search (e.g. Chicken Breast, Pasta...)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    {loading && <p className="text-muted animate-fade-in">Searching...</p>}
                </>
            )}

            {activeTab === 'foods' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2>My Custom Foods</h2>
                            <p className="text-muted">Individual ingredients or items (per 100g).</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowAddCustom(!showAddCustom)}>{showAddCustom ? 'Cancel' : '+ Add Food'}</button>
                    </div>

                    {showAddCustom && (
                        <div className="card animate-fade-in" style={{ marginTop: '2rem', border: '1px solid var(--primary)', background: 'rgba(251, 197, 49, 0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>New Custom Food</h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button 
                                        type="button" 
                                        className={`btn ${newCustom.is_quantifiable ? 'btn-primary' : 'btn-secondary'}`}
                                        style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem' }}
                                        onClick={() => setNewCustom({...newCustom, is_quantifiable: !newCustom.is_quantifiable})}
                                    >
                                        {newCustom.is_quantifiable ? '✓ Quantifiable' : '+ Make Quantifiable'}
                                    </button>
                                </div>
                            </div>
                            
                            <form onSubmit={handleAddCustomFood} style={{ display: 'grid', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: newCustom.is_quantifiable ? '2fr 1fr 1fr' : '2fr 1fr', gap: '1rem' }}>
                                    <div className="input-group">
                                        <label>Food Name</label>
                                        <input type="text" placeholder="e.g. Rice Cake" value={newCustom.label} onChange={e => setNewCustom({...newCustom, label: e.target.value})} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Unit Weight (g)</label>
                                        <input type="number" value={newCustom.default_grams} onChange={e => setNewCustom({...newCustom, default_grams: e.target.value})} required />
                                    </div>
                                    {newCustom.is_quantifiable && (
                                        <div className="input-group">
                                            <label>Unit Name</label>
                                            <input type="text" placeholder="piece" value={newCustom.unit_name} onChange={e => setNewCustom({...newCustom, unit_name: e.target.value})} required />
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                                    <div className="input-group"><label>{newCustom.is_quantifiable ? 'Kcal/Unit' : 'Kcal (100g)'}</label><input type="number" value={newCustom.kcal_per_100g} onChange={e => setNewCustom({...newCustom, kcal_per_100g: e.target.value})} required /></div>
                                    <div className="input-group"><label>{newCustom.is_quantifiable ? 'Pro/Unit (g)' : 'Protein (g)'}</label><input type="number" step="0.01" value={newCustom.protein_per_100g} onChange={e => setNewCustom({...newCustom, protein_per_100g: e.target.value})} required /></div>
                                    <div className="input-group"><label>{newCustom.is_quantifiable ? 'Carb/Unit (g)' : 'Carbs (g)'}</label><input type="number" step="0.01" value={newCustom.carbs_per_100g} onChange={e => setNewCustom({...newCustom, carbs_per_100g: e.target.value})} required /></div>
                                    <div className="input-group"><label>{newCustom.is_quantifiable ? 'Fat/Unit (g)' : 'Fat (g)'}</label><input type="number" step="0.01" value={newCustom.fat_per_100g} onChange={e => setNewCustom({...newCustom, fat_per_100g: e.target.value})} required /></div>
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }} onClick={() => setShowAdvanced(!showAdvanced)}>{showAdvanced ? '− Hide Fiber/Salt' : '+ Add Fiber/Salt'}</button>
                                </div>
                                {showAdvanced && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div className="input-group"><label>{newCustom.is_quantifiable ? 'Fib/Unit (g)' : 'Fiber (g)'}</label><input type="number" step="0.01" value={newCustom.fiber_per_100g} onChange={e => setNewCustom({...newCustom, fiber_per_100g: e.target.value})} /></div>
                                        <div className="input-group"><label>{newCustom.is_quantifiable ? 'Salt/Unit (g)' : 'Salt (g)'}</label><input type="number" step="0.01" value={newCustom.salt_per_100g} onChange={e => setNewCustom({...newCustom, salt_per_100g: e.target.value})} /></div>
                                    </div>
                                )}
                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save Food</button>
                            </form>
                        </div>
                    )}

                    <div style={{ marginTop: '2rem', display: 'grid', gap: '1rem' }}>
                        {customItems.filter(i => !i.is_whole_meal).map(cm => {
                            const ratio = cm.is_quantifiable ? (parseFloat(cm.default_grams) || 100) / 100.0 : 1.0;
                            return (
                            <div key={cm.id} className="card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', marginBottom: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div onClick={() => handleEditItem(cm)} style={{ cursor: 'pointer', flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{cm.label}</div>
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                            <span>{Math.round(cm.kcal_per_100g * ratio)} kcal</span>
                                            <span>P: {(cm.protein_per_100g * ratio).toFixed(1)}g C: {(cm.carbs_per_100g * ratio).toFixed(1)}g F: {(cm.fat_per_100g * ratio).toFixed(1)}g ({cm.is_quantifiable ? `1 ${cm.unit_name}` : '100g'})</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }} onClick={() => handleEditItem(cm)}>Edit</button>
                                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', color: '#ff4d4d', borderColor: 'rgba(255,77,77,0.2)', fontSize: '0.7rem' }} onClick={() => handleDeleteCustom(cm.id)}>Delete</button>
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </>
            )}

            {activeTab === 'meals' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2>My Whole Meals</h2>
                            <p className="text-muted">Built from combinations of your foods.</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => setIsBuildingMeal(!isBuildingMeal)}>{isBuildingMeal ? 'Cancel Builder' : '+ Build a Meal'}</button>
                    </div>

                    {isBuildingMeal && (
                        <div className="card animate-fade-in" style={{ marginTop: '2rem', border: '1px solid var(--primary)', background: 'rgba(0, 242, 254, 0.02)' }}>
                            <h3>Meal Builder</h3>
                            <div className="input-group" style={{ marginTop: '1.5rem' }}>
                                <label>Meal Name</label>
                                <input type="text" placeholder="e.g. My Daily Post-Workout Lunch" value={mealBuilderName} onChange={e => setMealBuilderName(e.target.value)} />
                            </div>

                            <div className="input-group" style={{ position: 'relative' }}>
                                <label>Add Foods to Meal</label>
                                <input type="text" placeholder="Search foods..." value={builderSearch} onChange={e => setBuilderSearch(e.target.value)} />
                                {builderResults.length > 0 && (
                                    <div className="card" style={{ position: 'absolute', top: '100%', left: 0, width: '100%', zIndex: 10, background: '#111', padding: '0.5rem', maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--primary)' }}>
                                        {builderResults.map((r, i) => (
                                            <div key={i} className="meal-item" onClick={() => addToMeal(r)} style={{ cursor: 'pointer', padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                {r.label} <span className="text-muted">({r.kcal} kcal)</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {mealBuilderItems.length > 0 && (
                                <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                                        {mealBuilderItems.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600 }}>{item.label}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                        {item.is_quantifiable ? `${(item.grams / item.default_grams).toFixed(1)} ${item.unit_name}s` : `${item.grams}g`}
                                                    </div>
                                                </div>
                                                
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {item.is_quantifiable ? (
                                                        <>
                                                            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => updateBuilderItemGrams(idx, Math.max(0, item.grams - (parseFloat(item.default_grams) || 100)))}>−</button>
                                                            <div style={{ width: '40px', textAlign: 'center', fontWeight: 700 }}>{(item.grams / (parseFloat(item.default_grams) || 100)).toFixed(0)}</div>
                                                            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => updateBuilderItemGrams(idx, item.grams + (parseFloat(item.default_grams) || 100))}>+</button>
                                                        </>
                                                    ) : (
                                                        <div className="input-group" style={{ width: '80px', marginBottom: 0 }}>
                                                            <input type="number" value={item.grams} onChange={e => updateBuilderItemGrams(idx, parseInt(e.target.value)||0)} style={{ padding: '0.3rem' }} />
                                                        </div>
                                                    )}
                                                </div>

                                                <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', color: '#ff4d4d' }} onClick={() => removeFromBuilder(idx)}>×</button>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '1rem', border: '1px solid rgba(0, 242, 254, 0.1)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 800 }}>MEAL TOTAL</span>
                                            <span style={{ color: 'var(--primary)', fontWeight: 900, fontSize: '1.2rem' }}>{builderTotals.kcal} KCAL</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            <span>P: {Number(builderTotals.p).toFixed(2)}g</span>
                                            <span>C: {Number(builderTotals.c).toFixed(2)}g</span>
                                            <span>F: {Number(builderTotals.f).toFixed(2)}g</span>
                                            {builderTotals.fib > 0 && <span>Fib: {Number(builderTotals.fib).toFixed(2)}g</span>}
                                        </div>
                                    </div>
                                    
                                    <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={saveBuiltMeal} disabled={!mealBuilderName || mealBuilderItems.length === 0}>Save Whole Meal</button>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ marginTop: '2rem', display: 'grid', gap: '1rem' }}>
                        {customItems.filter(i => i.is_whole_meal).map(cm => (
                            <div key={cm.id} className="card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderLeft: '4px solid var(--primary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div onClick={() => handleEditItem(cm)} style={{ cursor: 'pointer', flex: 1 }}>
                                        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)' }}>{cm.label}</div>
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#fff', marginTop: '0.5rem' }}>
                                            <span style={{ fontWeight: 700 }}>{Math.round(cm.kcal_per_100g)} kcal</span>
                                            <span className="text-muted">P: {Number(cm.protein_per_100g).toFixed(2)}g C: {Number(cm.carbs_per_100g).toFixed(2)}g F: {Number(cm.fat_per_100g).toFixed(2)}g</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 800 }} onClick={() => handleQuickLog(cm)} disabled={logging}>QUICK LOG</button>
                                        <button className="btn btn-secondary" style={{ padding: '0.5rem 0.8rem', fontSize: '0.75rem' }} onClick={() => handleEditItem(cm)}>Edit</button>
                                        <button className="btn btn-secondary" style={{ padding: '0.5rem 0.8rem', color: '#ff4d4d', fontSize: '0.75rem' }} onClick={() => handleDeleteCustom(cm.id)}>Delete</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {message && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '0.75rem', background: 'rgba(0,242,254,0.1)', color: 'var(--primary)', textAlign: 'center', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <SuccessIcon size={20} /> {message}
                </div>
            )}
        </div>
      </div>


      {(results.length > 0 || editItem) && (
        <div style={{ display: 'grid', gridTemplateColumns: results.length > 0 ? '1fr 1fr' : '1fr', gap: '2rem', marginTop: '2rem' }}>
            {results.length > 0 && (
            <div className="card">
                <h3>Search Results</h3>
                <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Select the closest match:</p>
                <div style={{ maxHeight: '440px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {results.map((item, idx) => (
                    <div 
                        key={idx} 
                        className="meal-item"
                        onClick={() => handleSelect(idx, item)}
                        style={{ 
                        cursor: 'pointer', 
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        border: selectedIdx === idx ? '1px solid var(--primary)' : '1px solid var(--card-border)',
                        background: selectedIdx === idx ? 'rgba(0, 242, 254, 0.05)' : undefined,
                        transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <div className="meal-info">
                                <span className="meal-label">{item.label}</span>
                                {item.is_custom && <span style={{ fontSize: '0.6rem', background: 'var(--primary)', color: '#000', padding: '0.1rem 0.3rem', borderRadius: '0.2rem', marginLeft: '0.5rem', fontWeight: 900 }}>CUSTOM</span>}
                            </div>
                            <div className="meal-kcal">{item.kcal} kcal</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                            <span>P: {Number(item.protein).toFixed(2)}g</span>
                            <span>C: {Number(item.carbs).toFixed(2)}g</span>
                            <span>F: {Number(item.fat).toFixed(2)}g</span>
                        </div>
                    </div>
                    ))}
                </div>
            </div>
            )}

            {editItem && (
            <div className="card animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Refine & Log</h3>
                    <div style={{ background: 'var(--primary)', color: '#000', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontWeight: 900, fontSize: '0.7rem' }}>
                        {editItem.original_item?.is_whole_meal ? 'WHOLE MEAL' : (editItem.original_item?.is_quantifiable ? 'UNIT BASED' : 'WEIGHT BASED')}
                    </div>
                </div>

                <div className="input-group">
                    <label>Meal Category</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                        {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(cat => (
                            <button 
                                key={cat}
                                type="button"
                                className={`btn ${mealType === cat ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ fontSize: '0.8rem', padding: '0.5rem', fontWeight: mealType === cat ? 800 : 400 }}
                                onClick={() => setMealType(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="input-group">
                    <label>Food/Meal Name</label>
                    <input type="text" value={editItem.label} onChange={(e) => setEditItem({ ...editItem, label: e.target.value })} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: editItem.original_item?.is_quantifiable ? '1.2fr 1fr' : '1fr 1fr', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem' }}>
                    {editItem.original_item?.is_quantifiable ? (
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Quantity ({editItem.original_item.unit_name}s)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => {
                                    const newQ = Math.max(0.5, Number(quantity) - 1);
                                    const newGrams = newQ * (parseFloat(editItem.original_item?.default_grams) || 100);
                                    updateEditItemStats(newGrams, newQ);
                                }}>−</button>
                                <input 
                                    type="number" 
                                    step="0.5"
                                    value={quantity} 
                                    onChange={(e) => {
                                        const newQ = parseFloat(e.target.value) || 0;
                                        const newGrams = newQ * (parseFloat(editItem.original_item?.default_grams) || 100);
                                        updateEditItemStats(newGrams, newQ);
                                    }} 
                                    style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.2rem' }}
                                />
                                <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => {
                                    const newQ = Number(quantity) + 1;
                                    const newGrams = newQ * (parseFloat(editItem.original_item?.default_grams) || 100);
                                    updateEditItemStats(newGrams, newQ);
                                }}>+</button>
                            </div>
                        </div>
                    ) : (
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Weight (g)</label>
                            <input 
                                type="number" 
                                value={editItem.grams} 
                                onChange={(e) => {
                                    const newGrams = parseInt(e.target.value) || 0;
                                    updateEditItemStats(newGrams, quantity);
                                }} 
                            />
                        </div>
                    )}
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Total Calories</label>
                        <input type="number" value={editItem.kcal} onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            const g = Number(editItem.grams) || 100;
                            setEditItem({ 
                                ...editItem, 
                                kcal: val,
                                kcal_100g: val / (g / 100)
                            });
                        }} style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.1rem' }} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="input-group"><label>Protein (g)</label><input type="number" step="0.01" value={editItem.protein.toFixed(2)} onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        const g = Number(editItem.grams) || 100;
                        setEditItem({...editItem, protein: val, protein_100g: val / (g / 100)});
                    }}/></div>
                    <div className="input-group"><label>Carbs (g)</label><input type="number" step="0.01" value={editItem.carbs.toFixed(2)} onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        const g = Number(editItem.grams) || 100;
                        setEditItem({...editItem, carbs: val, carbs_100g: val / (g / 100)});
                    }}/></div>
                    <div className="input-group"><label>Fat (g)</label><input type="number" step="0.01" value={editItem.fat.toFixed(2)} onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        const g = Number(editItem.grams) || 100;
                        setEditItem({...editItem, fat: val, fat_100g: val / (g / 100)});
                    }}/></div>
                </div>

                <div style={{ marginBottom: '1rem', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', opacity: 0.7 }} onClick={() => setShowEditAdvanced(!showEditAdvanced)}>{showEditAdvanced ? '− Hide Advanced' : '+ Add Fiber/Salt'}</button>
                </div>

                {showEditAdvanced && (
                    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div className="input-group"><label>Fiber (g)</label><input type="number" step="0.01" value={editItem.fiber?.toFixed(2) || 0} onChange={e => setEditItem({...editItem, fiber: parseFloat(e.target.value)||0})}/></div>
                        <div className="input-group"><label>Salt (g)</label><input type="number" step="0.01" value={editItem.salt?.toFixed(2) || 0} onChange={e => setEditItem({...editItem, salt: parseFloat(e.target.value)||0})}/></div>
                    </div>
                )}
                
                <button className="btn btn-primary" onClick={handleLogMeal} disabled={logging} style={{ width: '100%', marginTop: '1rem', padding: '1.25rem', fontSize: '1rem' }}>{logging ? 'Saving...' : 'Confirm & Log to Diary'}</button>
            </div>
            )}
        </div>
      )}

      {editingCustomItem && createPortal(
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1.5rem', backdropFilter: 'blur(4px)' }}>
              <div className="card animate-fade-in" style={{ maxWidth: '600px', width: '100%', border: '1px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                      <h3 style={{ margin: 0 }}>Edit {editingCustomItem.is_whole_meal ? 'Meal' : 'Food'}</h3>
                      {!editingCustomItem.is_whole_meal && (
                          <button 
                              className={`btn ${editForm.is_quantifiable ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem' }}
                              onClick={() => setEditForm({...editForm, is_quantifiable: !editForm.is_quantifiable})}
                          >
                              {editForm.is_quantifiable ? '✓ Quantifiable' : '+ Make Quantifiable'}
                          </button>
                      )}
                  </div>

                  <form onSubmit={handleUpdateCustomItem} style={{ display: 'grid', gap: '1.25rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: editForm.is_quantifiable ? '2fr 1fr 1fr' : '2fr 1fr', gap: '1rem' }}>
                          <div className="input-group">
                              <label>Name</label>
                              <input type="text" value={editForm.label} onChange={e => setEditForm({...editForm, label: e.target.value})} required />
                          </div>
                          {!editingCustomItem.is_whole_meal && (
                              <div className="input-group">
                                  <label>{editForm.is_quantifiable ? 'Unit Wt' : 'Std Wt'} (g)</label>
                                  <input type="number" value={editForm.default_grams} onChange={e => setEditForm({...editForm, default_grams: e.target.value})} required />
                              </div>
                          )}
                          {editForm.is_quantifiable && (
                              <div className="input-group">
                                  <label>Unit Name</label>
                                  <input type="text" placeholder="piece" value={editForm.unit_name} onChange={e => setEditForm({...editForm, unit_name: e.target.value})} required />
                              </div>
                          )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                          <div className="input-group"><label>{editingCustomItem.is_whole_meal ? 'Total Kcal' : (editForm.is_quantifiable ? 'Kcal/Unit' : 'Kcal (100g)')}</label><input type="number" value={editForm.kcal_per_100g} onChange={e => setEditForm({...editForm, kcal_per_100g: e.target.value})} required /></div>
                          <div className="input-group"><label>{editForm.is_quantifiable && !editingCustomItem.is_whole_meal ? 'Pro/Unit (g)' : 'Protein (g)'}</label><input type="number" step="0.01" value={editForm.protein_per_100g} onChange={e => setEditForm({...editForm, protein_per_100g: e.target.value})} required /></div>
                          <div className="input-group"><label>{editForm.is_quantifiable && !editingCustomItem.is_whole_meal ? 'Carb/Unit (g)' : 'Carbs (g)'}</label><input type="number" step="0.01" value={editForm.carbs_per_100g} onChange={e => setEditForm({...editForm, carbs_per_100g: e.target.value})} required /></div>
                          <div className="input-group"><label>{editForm.is_quantifiable && !editingCustomItem.is_whole_meal ? 'Fat/Unit (g)' : 'Fat (g)'}</label><input type="number" step="0.01" value={editForm.fat_per_100g} onChange={e => setEditForm({...editForm, fat_per_100g: e.target.value})} required /></div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div className="input-group"><label>{editForm.is_quantifiable && !editingCustomItem.is_whole_meal ? 'Fib/Unit (g)' : 'Fiber (g)'}</label><input type="number" step="0.01" value={editForm.fiber_per_100g} onChange={e => setEditForm({...editForm, fiber_per_100g: e.target.value})} /></div>
                          <div className="input-group"><label>{editForm.is_quantifiable && !editingCustomItem.is_whole_meal ? 'Salt/Unit (g)' : 'Salt (g)'}</label><input type="number" step="0.01" value={editForm.salt_per_100g} onChange={e => setEditForm({...editForm, salt_per_100g: e.target.value})} /></div>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingCustomItem(null)}>Cancel</button>
                          <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={updating}>{updating ? 'Saving...' : 'Confirm'}</button>
                      </div>
                  </form>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
};
