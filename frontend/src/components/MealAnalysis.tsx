import { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export const MealAnalysis = () => {
  const [activeTab, setActiveTab] = useState<'photo' | 'search'>('photo');
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [logging, setLogging] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [mealType, setMealType] = useState('Lunch');
  const navigate = useNavigate();

  // Handle Search
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
        headers: { 
          'Content-Type': 'multipart/form-data',
        }
      });
      const analysisResults = res.data.results;
      setResults(analysisResults);
      if (analysisResults.length === 0) {
        setMessage('No food detected. Please try another photo.');
      } else {
        handleSelect(0, analysisResults[0]);
      }
    } catch (err) {
      setMessage('Error analyzing image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (idx: number, item: any) => {
    setSelectedIdx(idx);
    setEditItem({ ...item });
  };

  const handleLogMeal = async () => {
    if (!editItem) return;
    setLogging(true);
    try {
      await api.post('/meal/log', {
        label: editItem.label,
        grams: editItem.grams,
        kcal: editItem.kcal,
        protein: editItem.protein,
        carbs: editItem.carbs,
        fat: editItem.fat,
        type: mealType
      });
      setMessage('Meal logged successfully!');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setMessage('Error logging meal. Please try again.');
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="container animate-fade-in">
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="nav-links" style={{ display: 'flex', borderRadius: 0, border: 'none', background: 'rgba(255,255,255,0.03)', padding: '0.5rem' }}>
            <button 
                onClick={() => { setActiveTab('photo'); setResults([]); setEditItem(null); }}
                className={`btn ${activeTab === 'photo' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, borderRadius: '0.75rem' }}
            >
                AI Photo Analysis
            </button>
            <button 
                onClick={() => { setActiveTab('search'); setResults([]); setEditItem(null); }}
                className={`btn ${activeTab === 'search' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, borderRadius: '0.75rem' }}
            >
                Manual Search
            </button>
        </div>

        <div style={{ padding: '2.5rem' }}>
            {activeTab === 'photo' ? (
                <>
                    <h2>AI Meal Analysis</h2>
                    <p className="text-muted">Take a photo of your meal to estimate calories and macros.</p>
                    <div className="input-group" style={{ marginTop: '2rem' }}>
                        <div style={{ 
                            border: '2px dashed rgba(255,255,255,0.1)', 
                            borderRadius: '1rem', 
                            padding: '3rem', 
                            textAlign: 'center',
                            background: 'rgba(255,255,255,0.01)',
                            position: 'relative'
                        }}>
                            {file ? (
                                <div style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                    ✓ {file.name} selected
                                </div>
                            ) : (
                                <div className="text-muted">Click to upload or drag and drop a meal photo</div>
                            )}
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleFileChange} 
                                style={{ 
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                                    opacity: 0, cursor: 'pointer' 
                                }} 
                            />
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleUpload} disabled={!file || loading} style={{ width: '100%' }}>
                        {loading ? 'Analyzing with CLIP AI...' : 'Analyze Meal'}
                    </button>
                </>
            ) : (
                <>
                    <h2>Search Food</h2>
                    <p className="text-muted">Type the name of the food you ate.</p>
                    <div className="input-group" style={{ marginTop: '2rem' }}>
                        <input 
                            type="text" 
                            placeholder="Search (e.g. Grilled Chicken, Avocado, Pasta...)" 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                        />
                    </div>
                    {loading && <p className="text-muted animate-fade-in">Searching database...</p>}
                </>
            )}
            {message && (
                <div style={{ 
                    marginTop: '1.5rem', 
                    padding: '1rem', 
                    borderRadius: '0.75rem', 
                    background: message.includes('success') ? 'rgba(0,255,175,0.1)' : 'rgba(255,0,127,0.1)',
                    color: message.includes('success') ? 'var(--success)' : 'var(--accent)',
                    textAlign: 'center',
                    fontWeight: 600
                }}>
                    {message}
                </div>
            )}
        </div>
      </div>

      {(results.length > 0 || editItem) && (
        <div style={{ display: 'grid', gridTemplateColumns: results.length > 0 ? '1fr 1fr' : '1fr', gap: '2rem', marginTop: '2rem' }}>
            {results.length > 0 && (
            <div className="card">
                <h3>{activeTab === 'photo' ? 'AI Predictions' : 'Search Results'}</h3>
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
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    {activeTab === 'photo' && (
                                        <div style={{ 
                                            fontSize: '0.6rem', 
                                            fontWeight: 800, 
                                            color: item.confidence > 0.4 ? 'var(--success)' : 'var(--warning)',
                                            textTransform: 'uppercase'
                                        }}>
                                            {(item.confidence * 100).toFixed(0)}% Match
                                        </div>
                                    )}
                                    {item.portion_note && (
                                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', background: 'rgba(0, 242, 254, 0.1)', padding: '0.1rem 0.3rem', borderRadius: '0.2rem' }}>
                                            {item.portion_note}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="meal-kcal">{item.kcal} kcal</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                            <span>P: {Math.round(item.protein)}g</span>
                            <span>C: {Math.round(item.carbs)}g</span>
                            <span>F: {Math.round(item.fat)}g</span>
                        </div>
                    </div>
                    ))}
                </div>
            </div>
            )}

            {editItem && (
            <div className="card animate-fade-in">
                <h3>Refine & Log</h3>
                <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Categorize and adjust macros.</p>
                
                <div className="input-group">
                    <label>Meal Type</label>
                    <select value={mealType} onChange={e => setMealType(e.target.value)}>
                        <option>Breakfast</option>
                        <option>Lunch</option>
                        <option>Dinner</option>
                        <option>Snack</option>
                    </select>
                </div>

                <div className="input-group">
                    <label>Food Name</label>
                    <input 
                        type="text" 
                        value={editItem.label} 
                        onChange={(e) => setEditItem({ ...editItem, label: e.target.value })} 
                    />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                        <label>Weight (g)</label>
                        <input 
                            type="number" 
                            value={editItem.grams} 
                            onChange={(e) => {
                                const newGrams = parseInt(e.target.value) || 0;
                                const ratio = newGrams / (editItem.grams || 1);
                                setEditItem({ 
                                    ...editItem, 
                                    grams: newGrams,
                                    kcal: Math.round(editItem.kcal * ratio),
                                    protein: editItem.protein * ratio,
                                    carbs: editItem.carbs * ratio,
                                    fat: editItem.fat * ratio
                                });
                            }} 
                        />
                    </div>
                    <div className="input-group">
                        <label>Calories</label>
                        <input 
                            type="number" 
                            value={editItem.kcal} 
                            onChange={(e) => setEditItem({ ...editItem, kcal: parseInt(e.target.value) || 0 })} 
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                        <label>Protein (g)</label>
                        <input type="number" step="0.1" value={editItem.protein} onChange={e => setEditItem({...editItem, protein: parseFloat(e.target.value)||0})}/>
                    </div>
                    <div className="input-group">
                        <label>Carbs (g)</label>
                        <input type="number" step="0.1" value={editItem.carbs} onChange={e => setEditItem({...editItem, carbs: parseFloat(e.target.value)||0})}/>
                    </div>
                    <div className="input-group">
                        <label>Fat (g)</label>
                        <input type="number" step="0.1" value={editItem.fat} onChange={e => setEditItem({...editItem, fat: parseFloat(e.target.value)||0})}/>
                    </div>
                </div>
                
                <button 
                className="btn btn-primary" 
                onClick={handleLogMeal} 
                disabled={logging}
                style={{ width: '100%', marginTop: '1rem' }}
                >
                {logging ? 'Saving to log...' : 'Confirm & Log Meal'}
                </button>
            </div>
            )}
        </div>
      )}
    </div>
  );
};
