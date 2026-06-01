import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { CameraIcon, SearchIcon, PlusIcon, CalendarIcon, BottleIcon, TrashIcon, EditIcon, SyncIcon, CapsuleIcon, FireIcon } from './Icons';

export const MealAnalysis = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [activeTab, setActiveTab] = useState<'photo' | 'search' | 'foods' | 'meals' | 'history'>('photo');
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [logging, setLogging] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [mealType] = useState('Lunch');
  
  // History State
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [editingLogItem, setEditingLogItem] = useState<{item: any, date: string} | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

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

  const navigate = useNavigate();

  const fetchHistory = async () => {
    setLoading(true);
    setHistoryError(null);
    try {
      const res = await api.get('/log/history?days=30');
      setHistoryData(res.data);
    } catch (err: any) {
      console.error("History fetch error:", err);
      setHistoryError(err.response?.data?.detail || "Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/meal/custom');
      // Remove duplicates based on label
      const uniqueItems = (res.data || []).filter((item: any, index: number, self: any[]) =>
          index === self.findIndex((t) => t.label === item.label)
      );
      setCustomItems(uniqueItems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomData();
    fetchHistory();
  }, []);

  useEffect(() => {
    if (activeTab === 'foods' || activeTab === 'meals') {
      fetchCustomData();
    } else if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const deleteHistoricalFood = async (loggedAt: string, date: string) => {
    if (!confirm('Remove this item?')) return;
    try {
        await api.delete(`/log/food-item?logged_at=${encodeURIComponent(loggedAt)}&date_str=${date}`);
        fetchHistory();
    } catch (err) {
        console.error(err);
    }
  };

  const updateHistoricalWater = async (date: string, liters: string) => {
    try {
        const ml = Math.round(parseFloat(liters) * 1000);
        await api.put(`/log/water?water_ml=${ml}&date_str=${date}`);
        fetchHistory();
    } catch (err) {
        console.error(err);
    }
  };

  const toggleHistoricalCreatine = async (date: string) => {
    try {
        await api.post(`/toggle-creatine?date_str=${date}`);
        fetchHistory();
    } catch (err) {
        console.error(err);
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
          ingredients: item.ingredients ? [...item.ingredients] : [],
          kcal_per_100g: String(Math.round((item.kcal_per_100g * ratio) * 100) / 100),
          protein_per_100g: String(Math.round((item.protein_per_100g * ratio) * 100) / 100),
          carbs_per_100g: String(Math.round((item.carbs_per_100g * ratio) * 100) / 100),
          fat_per_100g: String(Math.round((item.fat_per_100g * ratio) * 100) / 100),
          fiber_per_100g: String(Math.round(((item.fiber_per_100g || 0) * ratio) * 100) / 100),
          salt_per_100g: String(Math.round(((item.salt_per_100g || 0) * ratio) * 100) / 100),
          default_grams: String(item.default_grams || 100)
      });
  };

  const handleEditIngredientChange = (idx: number, field: string, value: any) => {
    if (!editForm.ingredients) return;
    const newIngredients = [...editForm.ingredients];
    let item = { ...newIngredients[idx], [field]: value };
    
    // If weight changed, recalculate this ingredient's kcal and macros if it has base rates
    if (field === 'grams' && item.kcal_100g !== undefined) {
        const ratio = (Number(value) || 0) / 100;
        item.kcal = Math.round((Number(item.kcal_100g) || 0) * ratio);
        item.protein = Number(((Number(item.protein_100g) || 0) * ratio).toFixed(2));
        item.carbs = Number(((Number(item.carbs_100g) || 0) * ratio).toFixed(2));
        item.fat = Number(((Number(item.fat_100g) || 0) * ratio).toFixed(2));
    }

    newIngredients[idx] = item;
    const totalKcal = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.kcal) || 0), 0);
    const totalP = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.protein) || 0), 0);
    const totalC = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.carbs) || 0), 0);
    const totalF = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.fat) || 0), 0);
    
    setEditForm({
        ...editForm,
        ingredients: newIngredients,
        kcal_per_100g: String(Math.round(totalKcal)),
        protein_per_100g: String(totalP.toFixed(2)),
        carbs_per_100g: String(totalC.toFixed(2)),
        fat_per_100g: String(totalF.toFixed(2)),
        default_grams: String(newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.grams) || 0), 0))
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

  const builderTotals = mealBuilderItems.reduce((acc: any, item: any) => ({
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
              protein_per_100g: Number(builderTotals.p.toFixed(2)),
              carbs_per_100g: Number(builderTotals.c.toFixed(2)),
              fat_per_100g: Number(builderTotals.f.toFixed(2)),
              fiber_per_100g: Number(builderTotals.fib.toFixed(2)),
              salt_per_100g: Number(builderTotals.s.toFixed(2)),
              is_whole_meal: true,
              default_grams: mealBuilderItems.reduce((acc: number, i: any) => acc + (i.grams || 0), 0),
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

  const handleRefineSimpleChange = (field: string, value: any) => {
      if (!editItem) return;
      let newItem = { ...editItem, [field]: value };
      
      const grams = parseInt(value) || 0;
      if (field === 'grams' && editItem.kcal_100g !== undefined) {
          const ratio = grams / 100;
          newItem.kcal = Math.round((Number(editItem.kcal_100g) || 0) * ratio);
          newItem.protein = Number(((Number(editItem.protein_100g) || 0) * ratio).toFixed(2)) || 0;
          newItem.carbs = Number(((Number(editItem.carbs_100g) || 0) * ratio).toFixed(2)) || 0;
          newItem.fat = Number(((Number(editItem.fat_100g) || 0) * ratio).toFixed(2)) || 0;
          newItem.grams = grams;
      }
      
      setEditItem(newItem);
  };

  const handleRefineIngredientChange = (idx: number, field: string, value: any) => {
      if (!editItem?.ingredients) return;
      const newIngredients = [...editItem.ingredients];
      let item = { ...newIngredients[idx], [field]: value };

      const grams = parseInt(value) || 0;
      // If weight changed, recalculate this ingredient's kcal and macros if it has base rates
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
      setEditItem({
          ...editItem,
          ingredients: newIngredients,
          kcal: Math.round(totalKcal) || 0,
          protein: Number(totalP.toFixed(2)) || 0,
          carbs: Number(totalC.toFixed(2)) || 0,
          fat: Number(totalF.toFixed(2)) || 0,
          grams: Math.round(totalG) || 0
      });
  };

  const removeRefineIngredient = (idx: number) => {
      if (!editItem?.ingredients) return;
      const newIngredients = editItem.ingredients.filter((_: any, i: number) => i !== idx);
      const totalKcal = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.kcal) || 0), 0);
      const totalP = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.protein) || 0), 0);
      const totalC = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.carbs) || 0), 0);
      const totalF = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.fat) || 0), 0);
      const totalG = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.grams) || 0), 0);
      setEditItem({
          ...editItem,
          ingredients: newIngredients,
          kcal: Math.round(totalKcal) || 0,
          protein: Number(totalP.toFixed(2)) || 0,
          carbs: Number(totalC.toFixed(2)) || 0,
          fat: Number(totalF.toFixed(2)) || 0,
          grams: Math.round(totalG) || 0
      });
  };

  const handleLogMeal = async () => {
    if (!editItem) return;
    setLogging(true);
    try {
      const targetDate = (window as any).retroactiveDate || null;
      const url = targetDate ? `/meal/log?date_str=${targetDate}` : '/meal/log';
      
      // Ensure integer values and clean data for backend
      const payload = {
        label: editItem.label || "Unknown Food",
        grams: Math.round(Number(editItem.grams) || 0),
        kcal: Math.round(Number(editItem.kcal) || 0),
        protein: Number(Number(editItem.protein).toFixed(2)) || 0,
        carbs: Number(Number(editItem.carbs).toFixed(2)) || 0,
        fat: Number(Number(editItem.fat).toFixed(2)) || 0,
        fiber: Number(Number(editItem.fiber).toFixed(2)) || 0,
        salt: Number(Number(editItem.salt).toFixed(2)) || 0,
        type: mealType,
        ingredients: editItem.ingredients || editItem.original_item?.ingredients || null
      };

      await api.post(url, payload);
      setMessage(targetDate ? `Meal logged for ${targetDate}!` : 'Meal logged successfully!');
      (window as any).retroactiveDate = null;
      setEditItem(null); // Clear item to prevent UI sticking/crashing
      setResults([]);

      if (onSuccess) {
          setTimeout(onSuccess, 1000);
      } else if (targetDate) {
          setTimeout(() => {
              setMessage('');
              setActiveTab('history');
              fetchHistory();
          }, 1000);
      } else {
          setTimeout(() => navigate('/'), 1000);
      }
    } catch (err) { 
        console.error("LOGGING ERROR:", err);
        setMessage('Error logging meal.'); 
    } finally { setLogging(false); }
  };

  const handleUpdateHistoricalItem = async (formData: any, date: string, loggedAt: string) => {
    try {
        await api.put(`/log/food-item?logged_at=${encodeURIComponent(loggedAt)}&date_str=${date}`, {
            ...formData,
            protein: Number(Number(formData.protein).toFixed(2)) || 0,
            carbs: Number(Number(formData.carbs).toFixed(2)) || 0,
            fat: Number(Number(formData.fat).toFixed(2)) || 0
        });
        setEditingLogItem(null);
        fetchHistory();
    } catch (err) {
        console.error(err);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/meal/search?q=${encodeURIComponent(searchQuery)}`);
      // Remove duplicates based on label
      const uniqueResults = (res.data.results || []).filter((item: any, index: number, self: any[]) =>
          index === self.findIndex((t) => t.label === item.label)
      );
      setResults(uniqueResults.slice(0, 5));
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
    const g = item.grams || 100;
    const baseKcal = item.kcal_100g || (item.kcal / (g / 100));
    const baseP = item.protein_100g || (item.protein / (g / 100));
    const baseC = item.carbs_100g || (item.carbs / (g / 100));
    const baseF = item.fat_100g || (item.fat / (g / 100));
    const baseFib = item.fiber_100g || ((item.fiber || 0) / (g / 100));
    const baseS = item.salt_100g || ((item.salt || 0) / (g / 100));

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
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim() && activeTab === 'search') {
        handleSearch();
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  return (
    <div className="container animate-fade-in">
      <div className="card" style={{ padding: 0, overflow: 'visible' }}>
        <div className="nav-links" style={{ display: 'flex', borderRadius: 0, border: 'none', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', flexWrap: 'wrap' }}>
            {[
                { id: 'photo', label: 'AI Photo', icon: <CameraIcon size={16} /> },
                { id: 'foods', label: 'My Foods', icon: <PlusIcon size={16} /> },
                { id: 'meals', label: 'My Meals', icon: <PlusIcon size={16} /> },
                { id: 'search', label: 'Search', icon: <SearchIcon size={16} /> },
                { id: 'history', label: 'History', icon: <CalendarIcon size={16} /> }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as any); setResults([]); setEditItem(null); }}
                    className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, minWidth: '100px', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: '0.2rem', padding: '0.6rem' }}
                >
                    {tab.icon} {tab.label}
                </button>
            ))}
        </div>

        <div style={{ padding: activeTab === 'history' ? '1.5rem' : '2.5rem' }}>
            {activeTab === 'history' && (
                <div className="animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h2 style={{ margin: 0 }}>Food Diary History</h2>
                            <p className="text-muted">Review and refine your logs from the last 30 days. (Days found: {historyData.length})</p>
                        </div>
                        <button className="btn btn-secondary" onClick={fetchHistory} disabled={loading}>
                            {loading ? '...' : <SyncIcon size={16} />}
                        </button>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {loading && historyData.length === 0 && (
                            <div className="text-muted" style={{ textAlign: 'center', padding: '3rem' }}>Loading history...</div>
                        )}
                        
                        {historyError && (
                            <div className="card" style={{ padding: '2rem', textAlign: 'center', border: '1px solid #ff4757', background: 'rgba(255,71,87,0.05)' }}>
                                <p style={{ color: '#ff4757', fontWeight: 600 }}>{historyError}</p>
                                <button className="btn btn-secondary" onClick={fetchHistory} style={{ marginTop: '1rem' }}>Try Again</button>
                            </div>
                        )}

                        {!loading && !historyError && historyData.length === 0 && (
                            <div className="card" style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
                                <CalendarIcon size={48} color="rgba(255,255,255,0.05)" style={{ marginBottom: '1.5rem' }} />
                                <p className="text-muted" style={{ fontSize: '1.1rem' }}>No history records found.</p>
                                <button className="btn btn-secondary" onClick={() => setActiveTab('search')} style={{ marginTop: '1rem' }}>Start Logging Today</button>
                            </div>
                        )}

                        {!loading && historyData && Array.isArray(historyData) && historyData.map((day) => {
                            let dateLabel = 'Unknown Date';
                            try {
                                if (day.date) {
                                    dateLabel = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
                                }
                            } catch(e) {}

                            return (
                                <div key={day.date} className="card" style={{ padding: 0, overflow: 'hidden', border: expandedDate === day.date ? '1px solid var(--primary)' : '1px solid var(--card-border)', background: expandedDate === day.date ? 'rgba(251, 197, 49, 0.02)' : 'rgba(255,255,255,0.01)' }}>
                                    <div 
                                        onClick={() => setExpandedDate(expandedDate === day.date ? null : day.date)}
                                        style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}
                                    >
                                        <div style={{ flex: 1, minWidth: '150px' }}>
                                            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: expandedDate === day.date ? 'var(--primary)' : '#fff' }}>
                                                {dateLabel}
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                                                    <FireIcon size={14} color="var(--primary)" />
                                                    <span style={{ fontWeight: 700 }}>{day.total_kcal || 0} kcal</span>
                                                    {day.got_creatine && <CapsuleIcon size={12} color="var(--primary)" style={{ marginLeft: '0.5rem' }} />}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                                                    <BottleIcon size={14} color="#00d2ff" />
                                                    <span style={{ fontWeight: 700 }}>{((day.water_ml || 0) / 1000).toFixed(1)}L</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                                            <span>P: {(day.protein || 0).toFixed(2)}g</span>
                                            <span>C: {(day.carbs || 0).toFixed(2)}g</span>
                                            <span>F: {(day.fat || 0).toFixed(2)}g</span>
                                        </div>
                                    </div>

                                    {expandedDate === day.date && (
                                        <div className="animate-fade-in" style={{ padding: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                                            {/* Creatine Toggle Section */}
                                            <div style={{ marginBottom: '1.25rem', background: 'rgba(251, 197, 49, 0.05)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(251, 197, 49, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <CapsuleIcon size={16} color={day.got_creatine ? "var(--primary)" : "var(--text-muted)"} />
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: day.got_creatine ? "#fff" : "var(--text-muted)" }}>CREATINE TAKEN</span>
                                                </div>
                                                <div onClick={() => toggleHistoricalCreatine(day.date)} style={{ width: '48px', height: '24px', background: day.got_creatine ? 'var(--primary)' : 'rgba(255,255,255,0.1)', borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'all 0.3s ease' }}>
                                                    <div style={{ position: 'absolute', top: '3px', left: day.got_creatine ? '27px' : '3px', width: '18px', height: '18px', background: day.got_creatine ? '#000' : 'var(--text-muted)', borderRadius: '50%', transition: 'all 0.3s ease' }} />
                                                </div>
                                            </div>

                                            <div style={{ marginBottom: '1.25rem', background: 'rgba(0,210,255,0.05)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(0,210,255,0.1)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                    <h4 style={{ fontSize: '0.7rem', color: '#00d2ff', textTransform: 'uppercase', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <BottleIcon size={14} /> Hydration
                                                    </h4>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{((day.water_ml || 0) / 1000).toFixed(1)} Liters</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <input 
                                                        type="number"
                                                        step="0.1"
                                                        defaultValue={((day.water_ml || 0) / 1000).toFixed(1)}
                                                        onBlur={(e) => updateHistoricalWater(day.date, e.target.value)}
                                                        style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,210,255,0.2)', color: '#fff', padding: '0.5rem', borderRadius: '0.5rem', textAlign: 'center', fontWeight: 700 }}
                                                    />
                                                    <button className="btn" style={{ background: '#00d2ff', color: '#000', fontSize: '0.7rem', fontWeight: 800, padding: '0 1rem' }}>SET</button>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                <h4 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Logged Items</h4>
                                                <button 
                                                    className="btn btn-primary" 
                                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem' }}
                                                    onClick={() => {
                                                        setActiveTab('search');
                                                        setMessage(`Retroactive logging for ${day.date}`);
                                                        (window as any).retroactiveDate = day.date;
                                                    }}
                                                >
                                                    + Add Item
                                                </button>
                                            </div>

                                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                                {day.food_items && day.food_items.length > 0 ? day.food_items.map((item: any, fIdx: number) => (
                                                    <div key={fIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.label}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                {item.grams}g • {item.kcal} kcal • {item.type} • {(item.protein || 0).toFixed(2)}P {(item.carbs || 0).toFixed(2)}C {(item.fat || 0).toFixed(2)}F
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <button 
                                                                className="btn btn-secondary" 
                                                                style={{ padding: '0.4rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                onClick={() => {
                                                                    setEditingLogItem({ item, date: day.date });
                                                                }}
                                                            >
                                                                <EditIcon size={14} />
                                                            </button>
                                                            <button 
                                                                className="btn btn-secondary" 
                                                                style={{ padding: '0.4rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4d4d' }}
                                                                onClick={() => deleteHistoricalFood(item.logged_at, day.date)}
                                                            >
                                                                <TrashIcon size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )) : <p className="text-muted" style={{ fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>No items logged.</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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
                    
                    <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
                        {results.map((r, i) => (
                            <div key={i} onClick={() => handleSelect(i, r)} style={{ cursor: 'pointer', padding: '0.75rem 1rem', background: selectedIdx === i ? 'rgba(251, 197, 49, 0.05)' : 'rgba(255,255,255,0.02)', border: selectedIdx === i ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{r.label}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.kcal} kcal • {r.grams}g</div>
                                </div>
                                <PlusIcon size={16} color="var(--primary)" />
                            </div>
                        ))}
                    </div>

                    {editItem && (
                        <div className="card animate-fade-in" style={{ marginTop: '2rem', border: '1px solid var(--primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>Refine & Log</h3>
                                <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 800 }}>{editItem.kcal} kcal <span style={{ opacity: 0.5, margin: '0 0.5rem' }}>•</span> {editItem.grams}g</div>
                            </div>
                            
                            <div className="input-group">
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Food Name</label>
                                <input type="text" value={editItem.label} onChange={e => setEditItem({...editItem, label: e.target.value})} />
                            </div>

                            {editItem.ingredients && editItem.ingredients.length > 0 ? (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '1rem', fontWeight: 800 }}>Composition</h4>
                                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                                        {editItem.ingredients.map((ing: any, idx: number) => (
                                            <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{ing.label}</div>
                                                    <button onClick={() => removeRefineIngredient(idx)} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}>×</button>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Grams</label>
                                                        <input 
                                                           type="number" 
                                                           value={ing.grams === 0 ? '' : ing.grams} 
                                                           onChange={e => handleRefineIngredientChange(idx, 'grams', Number(e.target.value))} 
                                                           placeholder="0"
                                                           style={{ fontSize: '0.8rem', textAlign: 'center' }} 
                                                        />
                                                    </div>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Kcal</label>
                                                        <input 
                                                           type="number" 
                                                           value={ing.kcal === 0 ? '' : ing.kcal} 
                                                           onChange={e => handleRefineIngredientChange(idx, 'kcal', Number(e.target.value))} 
                                                           placeholder="0"
                                                           style={{ fontSize: '0.8rem', textAlign: 'center' }} 
                                                        />
                                                    </div>
                                                </div>
                                                </div>
                                                ))}
                                                </div>
                                                </div>
                                                ) : (
                                                <div className="input-group">
                                                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Weight (Grams)</label>
                                                <input 
                                                type="number" 
                                                value={editItem.grams === 0 ? '' : editItem.grams} 
                                                onChange={e => handleRefineSimpleChange('grams', Number(e.target.value))} 
                                                placeholder="0"
                                                style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }} 
                                                />
                                                </div>
                                                )px}

                            <button className="btn btn-primary" onClick={handleLogMeal} disabled={logging} style={{ width: '100%', marginTop: '1rem' }}>{logging ? 'Logging...' : 'Log This Meal'}</button>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'foods' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><h2>My Custom Foods</h2><p className="text-muted">Individual items per 100g.</p></div>
                        <button className="btn btn-primary" onClick={() => setShowAddCustom(!showAddCustom)}>{showAddCustom ? 'Cancel' : '+ Add Food'}</button>
                    </div>

                    {showAddCustom && (
                        <div className="card animate-fade-in" style={{ marginTop: '2rem', border: '1px solid var(--primary)', background: 'rgba(251, 197, 49, 0.03)' }}>
                            <h3 style={{ marginBottom: '1.5rem' }}>Create New Food</h3>
                            <form onSubmit={handleAddCustomFood} style={{ display: 'grid', gap: '1.25rem' }}>
                                <div className="input-group">
                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Food Label</label>
                                    <input type="text" placeholder="e.g. Greek Yogurt 2%" value={newCustom.label} onChange={e => setNewCustom({...newCustom, label: e.target.value})} required />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="input-group">
                                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Kcal / 100g</label>
                                        <input type="number" value={newCustom.kcal_per_100g} onChange={e => setNewCustom({...newCustom, kcal_per_100g: e.target.value})} required />
                                    </div>
                                    <div className="input-group">
                                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Protein</label>
                                        <input type="number" step="0.1" value={newCustom.protein_per_100g} onChange={e => setNewCustom({...newCustom, protein_per_100g: e.target.value})} required />
                                    </div>
                                    <div className="input-group">
                                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Carbs</label>
                                        <input type="number" step="0.1" value={newCustom.carbs_per_100g} onChange={e => setNewCustom({...newCustom, carbs_per_100g: e.target.value})} required />
                                    </div>
                                    <div className="input-group">
                                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Fat</label>
                                        <input type="number" step="0.1" value={newCustom.fat_per_100g} onChange={e => setNewCustom({...newCustom, fat_per_100g: e.target.value})} required />
                                    </div>
                                </div>
                                <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: '1rem', fontWeight: 800, textTransform: 'uppercase' }}>Save to Library</button>
                            </form>
                        </div>
                    )}

                    <div style={{ marginTop: '2rem', display: 'grid', gap: '0.75rem' }}>
                        {customItems.filter(i => !i.is_whole_meal).map(i => (
                            <div key={i.id} className="card" style={{ padding: '1rem', marginBottom: 0, background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{i.label}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{Math.round(i.kcal_per_100g)} kcal / 100g</div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => handleEditItem(i)}><EditIcon size={14}/></button>
                                    <button className="btn btn-secondary" style={{ padding: '0.4rem', color: '#ff4d4d' }} onClick={() => handleDeleteCustom(i.id)}><TrashIcon size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {activeTab === 'meals' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><h2>My Whole Meals</h2><p className="text-muted">Your saved meal combinations.</p></div>
                        <button className="btn btn-primary" onClick={() => setIsBuildingMeal(!isBuildingMeal)}>{isBuildingMeal ? 'Cancel' : '+ Build Meal'}</button>
                    </div>

                    {isBuildingMeal && (
                        <div className="card animate-fade-in" style={{ marginTop: '2rem', border: '1px solid var(--primary)', background: 'rgba(251, 197, 49, 0.03)', overflow: 'visible', position: 'relative', zIndex: 100 }}>
                            <h3 style={{ marginBottom: '1.5rem' }}>Build New Meal</h3>
                            
                            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Meal Name</label>
                                <input type="text" placeholder="e.g. My Favorite Pasta" value={mealBuilderName} onChange={e => setMealBuilderName(e.target.value)} />
                            </div>

                            <div className="input-group" style={{ position: 'relative', zIndex: 110 }}>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Add Ingredients</label>
                                <div style={{ position: 'relative' }}>
                                    <SearchIcon size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                    <input type="text" placeholder="Search to add..." value={builderSearch} onChange={e => setBuilderSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                                </div>
                                
                                {builderResults.length > 0 && (
                                    <div className="card" style={{ 
                                        position: 'absolute', 
                                        top: '100%', 
                                        left: 0, 
                                        width: '100%', 
                                        zIndex: 120, 
                                        padding: '0.5rem', 
                                        background: '#000', 
                                        border: '1px solid var(--primary)', 
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.8), 0 0 10px rgba(251,197,49,0.2)',
                                        maxHeight: '200px', 
                                        overflowY: 'auto',
                                        marginTop: '0.25rem'
                                    }}>
                                        {builderResults.map((r, i) => (
                                            <div 
                                                key={i} 
                                                onClick={() => addToMeal(r)} 
                                                className="search-result-item"
                                                style={{ 
                                                    padding: '0.75rem', 
                                                    cursor: 'pointer', 
                                                    borderRadius: '0.4rem', 
                                                    background: 'rgba(255,255,255,0.03)', 
                                                    marginBottom: '0.25rem',
                                                    border: '1px solid transparent',
                                                    transition: 'all 0.2s ease',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.background = 'rgba(251,197,49,0.1)';
                                                    e.currentTarget.style.borderColor = 'rgba(251,197,49,0.3)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                                    e.currentTarget.style.borderColor = 'transparent';
                                                }}
                                            >
                                                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{r.label}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 800 }}>{r.kcal} kcal</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: '1.5rem', display: 'grid', gap: '0.5rem' }}>
                                {mealBuilderItems.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.label}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.kcal} kcal</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <input 
                                                type="number" 
                                                value={item.grams === 0 ? '' : item.grams} 
                                                onChange={e => updateBuilderItemGrams(idx, Number(e.target.value))}
                                                placeholder="0"
                                                style={{ width: '70px', padding: '0.3rem', fontSize: '0.8rem', textAlign: 'center' }} 
                                            />
                                            <button onClick={() => removeFromBuilder(idx)} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}>×</button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {mealBuilderItems.length > 0 && (
                                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(251,197,49,0.1)', borderRadius: '0.75rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Meal Stats</div>
                                    <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>
                                        {builderTotals.kcal} kcal <span style={{ opacity: 0.3, margin: '0 0.5rem' }}>•</span> 
                                        {builderTotals.p.toFixed(1)}P {builderTotals.c.toFixed(1)}C {builderTotals.f.toFixed(1)}F
                                    </div>
                                </div>
                            )}

                            <button 
                                className="btn btn-primary" 
                                disabled={!mealBuilderName || mealBuilderItems.length === 0} 
                                onClick={saveBuiltMeal}
                                style={{ width: '100%', marginTop: '1.5rem', padding: '1rem', fontWeight: 800, textTransform: 'uppercase' }}
                            >
                                Save Whole Meal
                            </button>
                        </div>
                    )}

                    <div style={{ marginTop: '2rem', display: 'grid', gap: '0.75rem' }}>
                        {customItems.filter(i => i.is_whole_meal).map(i => (
                            <div key={i.id} className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)', marginBottom: 0, background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{i.label}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{Math.round(i.kcal_per_100g)} kcal total</div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => handleEditItem(i)}><EditIcon size={14}/></button>
                                    <button className="btn btn-secondary" style={{ padding: '0.4rem', color: '#ff4d4d' }} onClick={() => handleDeleteCustom(i.id)}><TrashIcon size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {message && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '0.75rem', background: 'rgba(0,242,254,0.1)', color: 'var(--primary)', textAlign: 'center', fontWeight: 600 }}>{message}</div>
            )}
        </div>
      </div>

      {editingCustomItem && createPortal(
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000, padding: '1rem', backdropFilter: 'blur(10px)' }}>
            <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative', background: '#0a0a0a', border: '1px solid var(--card-border)', borderRadius: '1rem', maxHeight: '95vh', overflowY: 'auto' }}>
              <button onClick={() => setEditingCustomItem(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              <h2 style={{ marginBottom: '1.5rem' }}>Edit {editingCustomItem.is_whole_meal ? 'Meal' : 'Food'}</h2>
              
              <form onSubmit={handleUpdateCustomItem} style={{ display: 'grid', gap: '1.25rem' }}>
                  <div className="input-group">
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Label</label>
                      <input type="text" value={editForm.label} onChange={e => setEditForm({...editForm, label: e.target.value})} required />
                  </div>

                  {editingCustomItem.is_whole_meal ? (
                      <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <h4 style={{ fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '1rem', fontWeight: 800 }}>Composition</h4>
                          <div style={{ display: 'grid', gap: '1rem' }}>
                              {editForm.ingredients.map((ing: any, i: number) => (
                                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '0.75rem', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.85rem' }}>{ing.label}</span>
                                      <div className="input-group" style={{ marginBottom: 0 }}>
                                          <input 
                                            type="number" 
                                            value={ing.grams} 
                                            onChange={e => handleEditIngredientChange(i, 'grams', parseInt(e.target.value)||0)}
                                            style={{ padding: '0.4rem', fontSize: '0.8rem', textAlign: 'center' }} 
                                          />
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div className="input-group">
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Kcal / 100g</label>
                              <input type="number" value={editForm.kcal_per_100g} onChange={e => setEditForm({...editForm, kcal_per_100g: e.target.value})} required />
                          </div>
                          <div className="input-group">
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Protein</label>
                              <input type="number" step="0.1" value={editForm.protein_per_100g} onChange={e => setEditForm({...editForm, protein_per_100g: e.target.value})} required />
                          </div>
                          <div className="input-group">
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Carbs</label>
                              <input type="number" step="0.1" value={editForm.carbs_per_100g} onChange={e => setEditForm({...editForm, carbs_per_100g: e.target.value})} required />
                          </div>
                          <div className="input-group">
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Fat</label>
                              <input type="number" step="0.1" value={editForm.fat_per_100g} onChange={e => setEditForm({...editForm, fat_per_100g: e.target.value})} required />
                          </div>
                      </div>
                  )}

                  <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(251,197,49,0.05)', borderRadius: '0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Stats</div>
                      <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>
                          {editForm.kcal_per_100g} kcal <span style={{ opacity: 0.3, margin: '0 0.5rem' }}>•</span> 
                          {editForm.protein_per_100g}P {editForm.carbs_per_100g}C {editForm.fat_per_100g}F
                      </div>
                  </div>

                  <button className="btn btn-primary" type="submit" disabled={updating} style={{ width: '100%', padding: '1rem', fontWeight: 800 }}>
                      {updating ? 'Updating...' : 'Save Changes'}
                  </button>
              </form>
            </div>
          </div>,
          document.body
      )}

      {editingLogItem && createPortal(
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000, padding: '1rem', backdropFilter: 'blur(10px)' }}>
            <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '2rem', position: 'relative', background: '#0a0a0a', border: '1px solid var(--card-border)', borderRadius: '1rem', maxHeight: '95vh', overflowY: 'auto' }}>
              <button onClick={() => setEditingLogItem(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              <h2 style={{ marginBottom: '1.5rem' }}>Edit Historical Log</h2>
              <p style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1rem', marginBottom: '1.5rem', textTransform: 'uppercase' }}>{editingLogItem.item.label} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'none' }}>on {editingLogItem.date}</span></p>
              
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                  <div className="input-group">
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem', display: 'block' }}>Weight (Grams)</label>
                      <input 
                        type="number" 
                        value={editingLogItem.item.grams} 
                        onChange={e => {
                            const newG = parseInt(e.target.value)||0;
                            const item = { ...editingLogItem.item, grams: newG };
                            
                            // Recalculate if base rates exist
                            const kcal100 = Number(item.kcal_100g) || (item.ingredients ? null : (Number(item.kcal) / (Number(editingLogItem.item.grams)/100)));
                            if (kcal100 && !item.ingredients) {
                                const ratio = newG / 100;
                                item.kcal = Math.round(kcal100 * ratio);
                                if (item.protein_100g) item.protein = Number((Number(item.protein_100g) * ratio).toFixed(1));
                                if (item.carbs_100g) item.carbs = Number((Number(item.carbs_100g) * ratio).toFixed(1));
                                if (item.fat_100g) item.fat = Number((Number(item.fat_100g) * ratio).toFixed(1));
                            }
                            setEditingLogItem({ ...editingLogItem, item });
                        }} 
                        style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff', textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }}
                      />
                  </div>

                  <div className="input-group">
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem', display: 'block' }}>Total Calories</label>
                      <input 
                        type="number" 
                        value={editingLogItem.item.kcal} 
                        onChange={e => setEditingLogItem({...editingLogItem, item: {...editingLogItem.item, kcal: parseInt(e.target.value)||0}})} 
                        style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: 'var(--primary)', textAlign: 'center', fontSize: '1.1rem', fontWeight: 800 }}
                      />
                  </div>

                  {editingLogItem.item.ingredients && editingLogItem.item.ingredients.length > 0 && (
                      <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <h4 style={{ fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '1rem', fontWeight: 800 }}>Composition</h4>
                          <div style={{ display: 'grid', gap: '0.5rem' }}>
                              {editingLogItem.item.ingredients.map((ing: any, i: number) => (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>{ing.label}</span>
                                      <span style={{ fontWeight: 600 }}>{ing.grams}g • {ing.kcal} kcal</span>
                                  </div>
                              ))}
                          </div>
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center' }}>* Composition is currently read-only in historical view.</p>
                      </div>
                  )}

                  <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontWeight: 800, textTransform: 'uppercase' }} onClick={() => handleUpdateHistoricalItem(editingLogItem.item, editingLogItem.date, editingLogItem.item.logged_at)}>Save Changes</button>
              </div>
            </div>
          </div>,
          document.body
      )}
    </div>
  );
};
