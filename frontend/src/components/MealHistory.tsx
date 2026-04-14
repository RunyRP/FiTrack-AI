import { useState, useEffect } from 'react';
import api from '../api';

export const MealHistory = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/log/history?days=30');
        // Filter out days with no food items
        const withFood = res.data.filter((h: any) => h.food_items && h.food_items.length > 0);
        // Sort by date descending
        setHistory(withFood.reverse());
      } catch (err) {
        console.error('Error fetching meal history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div className="container">Loading history...</div>;

  return (
    <div className="container">
      <div className="card">
        <h2>Meal History</h2>
        <p className="text-muted">Review your logged meals from the last 30 days</p>
      </div>

      {history.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="text-muted">No meals logged yet in the last 30 days.</p>
        </div>
      ) : (
        history.map((day, idx) => (
          <div key={idx} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <h3 style={{ color: 'var(--primary)', margin: 0 }}>
                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ fontSize: '1.2rem' }}>{day.total_kcal}</strong>
                <span className="text-muted" style={{ marginLeft: '0.5rem' }}>kcal total</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {day.food_items.map((item: any, fIdx: number) => (
                <div key={fIdx} className="meal-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '4px' }}>
                  <div>
                    <strong>{item.label}</strong>
                    <span className="text-muted" style={{ marginLeft: '1rem', fontSize: '0.9rem' }}>{item.grams}g</span>
                  </div>
                  <div style={{ fontWeight: 600 }}>{item.kcal} kcal</div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
