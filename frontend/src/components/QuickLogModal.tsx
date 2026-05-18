import { useState, useEffect } from 'react';
import api from '../api';
import { SearchIcon, AppleIcon, FireIcon, PlusIcon } from './Icons';

interface QuickLogModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickLogModal = ({ onClose, onSuccess }: QuickLogModalProps) => {
  const [recentFoods, setRecentFoods] = useState<any[]>([]);
  const [customMeals, setCustomMeals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [logging, setLogging] = useState(false);
  const [mealType, setMealType] = useState('Lunch');

  const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recentRes, customRes] = await Promise.all([
        api.get('/log/recent-items'),
        api.get('/meal/custom')
      ]);
      setRecentFoods(recentRes.data.slice(0, 3));
      setCustomMeals(customRes.data.slice(0, 3));
    } catch (err) {
      console.error('Error fetching quick log data:', err);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/meal/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data.results.slice(0, 5));
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLog = async (item: any) => {
    setLogging(true);
    try {
      let logPayload;
      
      // Standardized format (search results or recent items)
      if (item.kcal !== undefined && item.grams !== undefined) {
        logPayload = {
          label: item.label,
          grams: Math.round(item.grams),
          kcal: Math.round(item.kcal),
          protein: item.protein || 0,
          carbs: item.carbs || 0,
          fat: item.fat || 0,
          type: mealType
        };
      } else {
        // Raw CustomMeal format (from /meal/custom)
        const grams = item.default_grams || 100;
        const ratio = grams / 100;
        logPayload = {
          label: item.label,
          grams: Math.round(grams),
          kcal: Math.round((item.kcal_per_100g || 0) * ratio),
          protein: (item.protein_per_100g || 0) * ratio,
          carbs: (item.carbs_per_100g || 0) * ratio,
          fat: (item.fat_per_100g || 0) * ratio,
          type: mealType
        };
      }
      
      await api.post('/meal/log', logPayload);
      onSuccess();
    } catch (err) {
      console.error('Logging error:', err);
    } finally {
      setLogging(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem', backdropFilter: 'blur(10px)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative', background: '#0a0a0a', border: '1px solid var(--card-border)' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
        >
          ×
        </button>

        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AppleIcon size={24} color="var(--primary)" /> Quick Log
        </h2>

        {/* Meal Type Selection */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {mealTypes.map(t => (
                <button
                    key={t}
                    onClick={() => setMealType(t)}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '2rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: mealType === t ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                        border: '1px solid',
                        borderColor: mealType === t ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                        color: mealType === t ? '#000' : 'var(--text-muted)'
                    }}
                >
                    {t}
                </button>
            ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '2rem' }}>
          <SearchIcon size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            placeholder="Search foods or meals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff' }}
          />
        </div>

        {/* Search Results */}
        {loading ? (
          <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '2rem' }}>Searching...</div>
        ) : searchResults.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h4 className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '1rem' }}>Search Results</h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {searchResults.map((item, i) => (
                <button 
                  key={i} 
                  disabled={logging}
                  onClick={() => handleQuickLog(item)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', background: 'rgba(251, 197, 49, 0.05)', border: '1px solid rgba(251, 197, 49, 0.1)', borderRadius: '0.5rem', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{item.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.kcal} kcal • {item.grams}g</div>
                  </div>
                  <PlusIcon size={18} color="var(--primary)" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Foods */}
        {!searchQuery && (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <h4 className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FireIcon size={14} /> Recent Foods
              </h4>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {recentFoods.length > 0 ? recentFoods.map((item, i) => (
                  <button 
                    key={i}
                    disabled={logging}
                    onClick={() => handleQuickLog(item)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.5rem', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{item.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.kcal} kcal • {item.grams}g</div>
                    </div>
                    <PlusIcon size={18} color="var(--primary)" />
                  </button>
                )) : <div className="text-muted" style={{ fontSize: '0.8rem' }}>No recent foods found.</div>}
              </div>
            </div>

            {/* Custom Meals */}
            <div>
              <h4 className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AppleIcon size={14} /> My Meals
              </h4>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {customMeals.length > 0 ? customMeals.map((item, i) => (
                  <button 
                    key={i}
                    disabled={logging}
                    onClick={() => handleQuickLog(item)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.5rem', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{item.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{Math.round(item.kcal_per_100g * (item.default_grams/100))} kcal</div>
                    </div>
                    <PlusIcon size={18} color="var(--primary)" />
                  </button>
                )) : <div className="text-muted" style={{ fontSize: '0.8rem' }}>No custom meals found.</div>}
              </div>
            </div>
          </>
        )}

        <button 
          className="btn btn-secondary" 
          onClick={() => window.location.href='/meal'}
          style={{ width: '100%', marginTop: '2rem' }}
        >
          Advanced Logging (AI/Photo)
        </button>
      </div>
    </div>
  );
};
