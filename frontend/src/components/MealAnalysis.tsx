import React, { useState } from 'react';
import api from '../api';

export const MealAnalysis = () => {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setMessage('');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/meal/analyze', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
        }
      });
      setResults(res.data.results);
      if (res.data.results.length === 0) {
        setMessage('No food detected. Please try another photo.');
      }
    } catch (err) {
      setMessage('Error analyzing image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>AI Meal Analysis</h2>
        <p className="text-muted">Take a photo of your meal to estimate calories</p>
        
        <div className="input-group" style={{ marginTop: '2rem' }}>
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </div>
        
        <button 
          className="btn btn-primary" 
          onClick={handleUpload} 
          disabled={!file || loading}
        >
          {loading ? 'Analyzing...' : 'Analyze Photo'}
        </button>

        {message && <p style={{ marginTop: '1rem', color: 'var(--accent)' }}>{message}</p>}
      </div>

      {results.length > 0 && (
        <div className="card">
          <h3>Analysis Results</h3>
          {results.map((item, idx) => (
            <div key={idx} className="meal-item">
              <div>
                <strong>{item.label}</strong>
                <p className="text-muted">Confidence: {(item.confidence * 100).toFixed(1)}%</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="stat-value" style={{ fontSize: '1.5rem' }}>{item.kcal}</div>
                <p>est. kcal</p>
              </div>
            </div>
          ))}
          <p className="text-muted" style={{ marginTop: '1rem' }}>
            Note: The top result has been automatically added to your daily log.
          </p>
        </div>
      )}
    </div>
  );
};
