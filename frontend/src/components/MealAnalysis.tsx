import React, { useState, useEffect } from 'react';
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
        kcal: editItem.kcal
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
    <div className="container">
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <button 
                onClick={() => { setActiveTab('photo'); setResults([]); setEditItem(null); }}
                style={{ 
                    flex: 1, padding: '1rem', background: activeTab === 'photo' ? 'rgba(0,255,127,0.1)' : 'transparent', 
                    color: activeTab === 'photo' ? 'var(--primary)' : 'white', border: 'none', borderBottom: activeTab === 'photo' ? '2px solid var(--primary)' : 'none',
                    cursor: 'pointer', fontWeight: 600
                }}
            >
                AI Photo Analysis
            </button>
            <button 
                onClick={() => { setActiveTab('search'); setResults([]); setEditItem(null); }}
                style={{ 
                    flex: 1, padding: '1rem', background: activeTab === 'search' ? 'rgba(0,255,127,0.1)' : 'transparent', 
                    color: activeTab === 'search' ? 'var(--primary)' : 'white', border: 'none', borderBottom: activeTab === 'search' ? '2px solid var(--primary)' : 'none',
                    cursor: 'pointer', fontWeight: 600
                }}
            >
                Manual Search
            </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
            {activeTab === 'photo' ? (
                <>
                    <h2>AI Meal Analysis</h2>
                    <p className="text-muted">Take a photo of your meal to estimate calories</p>
                    <div className="input-group" style={{ marginTop: '1.5rem' }}>
                        <input type="file" accept="image/*" onChange={handleFileChange} />
                    </div>
                    <button className="btn btn-primary" onClick={handleUpload} disabled={!file || loading} style={{ width: '100%' }}>
                        {loading ? 'Analyzing...' : 'Analyze Photo'}
                    </button>
                </>
            ) : (
                <>
                    <h2>Search Food</h2>
                    <p className="text-muted">Type the name of the food you ate</p>
                    <div className="input-group" style={{ marginTop: '1.5rem' }}>
                        <input 
                            type="text" 
                            placeholder="Search (e.g. chicken, apple, pizza...)" 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                        />
                    </div>
                    {loading && <p className="text-muted">Searching database...</p>}
                </>
            )}
            {message && <p style={{ marginTop: '1rem', color: message.includes('success') ? 'var(--primary)' : 'var(--accent)' }}>{message}</p>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: results.length > 0 ? '1fr 1fr' : '1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        {results.length > 0 && (
          <div className="card">
            <h3>{activeTab === 'photo' ? 'AI Guesses' : 'Search Results'}</h3>
            <p className="text-muted" style={{ marginBottom: '1rem' }}>Select an item:</p>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {results.map((item, idx) => (
                <div 
                    key={idx} 
                    className={`meal-item ${selectedIdx === idx ? 'active-machine' : ''}`}
                    onClick={() => handleSelect(idx, item)}
                    style={{ 
                    cursor: 'pointer', 
                    border: selectedIdx === idx ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    background: selectedIdx === idx ? 'rgba(0, 255, 127, 0.05)' : 'rgba(255,255,255,0.02)'
                    }}
                >
                    <div>
                    <strong>{item.label}</strong>
                    {activeTab === 'photo' && <p className="text-muted" style={{ fontSize: '0.8rem' }}>{(item.confidence * 100).toFixed(1)}% match</p>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                    <div>{item.kcal} kcal</div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>{item.grams}g</div>
                    </div>
                </div>
                ))}
            </div>
          </div>
        )}

        {editItem && (
          <div className="card">
            <h3>Confirm & Log</h3>
            <div className="input-group" style={{ marginTop: '1rem' }}>
              <label>Food Name</label>
              <input 
                type="text" 
                value={editItem.label} 
                onChange={(e) => setEditItem({ ...editItem, label: e.target.value })} 
              />
            </div>
            <div className="input-group">
              <label>Portion (grams)</label>
              <input 
                type="number" 
                value={editItem.grams} 
                onChange={(e) => {
                  const newGrams = parseInt(e.target.value) || 0;
                  const newKcal = Math.round((newGrams * editItem.base_kcal) / 100);
                  setEditItem({ 
                    ...editItem, 
                    grams: newGrams,
                    kcal: newKcal 
                  });
                }} 
              />
            </div>
            <div className="input-group">
              <label>Total Calories (kcal)</label>
              <input 
                type="number" 
                value={editItem.kcal} 
                onChange={(e) => setEditItem({ ...editItem, kcal: parseInt(e.target.value) || 0 })} 
              />
            </div>
            
            <button 
              className="btn btn-primary" 
              onClick={handleLogMeal} 
              disabled={logging}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {logging ? 'Saving...' : 'Confirm & Add to Log'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
