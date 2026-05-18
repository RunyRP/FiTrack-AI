import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api, { API_URL } from '../api';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { DumbbellIcon, CameraIcon } from './Icons';

export const EquipmentManager = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [customMachinery, setCustomMachinery] = useState<any[]>([]);
  const [editingMachine, setEditingMachine] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editMuscle, setEditMuscle] = useState('Chest');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomMachinery();
  }, [user]);

  const fetchCustomMachinery = async () => {
    setLoading(true);
    try {
      const res = await api.get('/workout/machinery');
      setCustomMachinery(res.data.filter((m: any) => m.user_id !== null));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditMachine = (m: any) => {
    setEditingMachine(m);
    setEditName(m.name);
    setEditMuscle(m.exercises?.[0]?.muscles?.[0] || 'Chest');
    setEditFile(null);
  };

  const handleUpdateMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMachine) return;

    // Check for duplicates locally
    const isDuplicate = customMachinery.some(
      m => m.name.toLowerCase() === editName.trim().toLowerCase() && m.id !== editingMachine.id
    );
    if (isDuplicate) {
        alert(`A machine with the name "${editName}" already exists in your library.`);
        return;
    }

    setUpdating(true);
    const formData = new FormData();
    formData.append('name', editName);
    formData.append('muscle_group', editMuscle);
    if (editFile) formData.append('file', editFile);

    console.log("Sending update:", { id: editingMachine.id, name: editName, muscle: editMuscle });
    
    try {
      await api.put(`/workout/machinery/${editingMachine.id}`, formData);
      setEditingMachine(null);
      await fetchCustomMachinery();
      await refreshUser();
    } catch (err: any) {
      console.error("Update error details:", err.response?.data || err.message);
      alert('Error updating equipment. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteMachine = async (id: number) => {
    if (!confirm('Are you sure you want to delete this custom equipment?')) return;
    try {
      await api.delete(`/workout/machinery/${id}`);
      fetchCustomMachinery();
      await refreshUser();
    } catch (err) {
      console.error(err);
      alert('Error deleting equipment.');
    }
  };

  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                <DumbbellIcon size={28} color="var(--primary)" /> Manage My Equipment
            </h2>
            <button className="btn btn-secondary" onClick={() => navigate('/profile')}>Back to Profile</button>
        </div>

        {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p className="text-muted">Loading your equipment...</p>
            </div>
        ) : customMachinery.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <p className="text-muted" style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>You haven't added any custom equipment yet.</p>
                <button className="btn btn-primary" onClick={() => navigate('/workout')}>Add Equipment in Training</button>
            </div>
        ) : (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
                {customMachinery.map(m => (
                    <div key={m.id} className="card animate-fade-in" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                            <img 
                                src={getImageUrl(m.image_url)} 
                                alt={m.name} 
                                style={{ width: '100px', height: '100px', borderRadius: '1rem', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} 
                            />
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>{m.name}</h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {m.exercises?.[0]?.muscles?.map((muscle: string) => (
                                        <span key={muscle} style={{ background: 'rgba(0,242,254,0.1)', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 700 }}>
                                            {muscle}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button 
                                    className="btn btn-secondary" 
                                    style={{ padding: '0.6rem 1.2rem' }}
                                    onClick={() => handleEditMachine(m)}
                                >
                                    Edit
                                </button>
                                <button 
                                    className="btn btn-secondary" 
                                    style={{ padding: '0.6rem 1.2rem', color: '#ff4d4d', borderColor: 'rgba(255,77,77,0.2)' }}
                                    onClick={() => handleDeleteMachine(m.id)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {editingMachine && createPortal(
            <div style={{ 
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
                background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', zIndex: 9999, padding: '1.5rem',
                backdropFilter: 'blur(4px)'
            }}>
                <div className="card animate-fade-in" style={{ 
                    maxWidth: '500px', width: '100%', position: 'relative', 
                    border: '1px solid var(--primary)', boxShadow: '0 0 40px rgba(0,242,254,0.15)'
                }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Edit Equipment</h3>
                    <form onSubmit={handleUpdateMachine} style={{ display: 'grid', gap: '1.5rem' }}>
                        <div className="input-group">
                            <label>Equipment Name</label>
                            <input 
                                type="text" 
                                value={editName} 
                                onChange={e => setEditName(e.target.value)}
                                required
                                style={{ padding: '0.8rem' }}
                            />
                        </div>
                        <div className="input-group">
                            <label>Muscle Group</label>
                            <select value={editMuscle} onChange={e => setEditMuscle(e.target.value)} style={{ padding: '0.8rem' }}>
                                <option value="Chest">Chest</option>
                                <option value="Back">Back</option>
                                <option value="Shoulders">Shoulders</option>
                                <option value="Legs">Legs</option>
                                <option value="Arms">Arms</option>
                                <option value="Core">Core</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Photo (Optional)</label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="file" 
                                    id="edit-file-input"
                                    accept="image/*"
                                    onChange={e => setEditFile(e.target.files?.[0] || null)}
                                    style={{ 
                                        position: 'absolute',
                                        width: '1px',
                                        height: '1px',
                                        padding: '0',
                                        margin: '-1px',
                                        overflow: 'hidden',
                                        clip: 'rect(0,0,0,0)',
                                        border: '0'
                                    }}
                                />
                                <label 
                                    htmlFor="edit-file-input"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.75rem',
                                        padding: '1.25rem',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px dashed var(--card-border)',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        textAlign: 'center',
                                        textTransform: 'none',
                                        fontWeight: 400,
                                        fontSize: '0.9rem',
                                        color: editFile ? 'var(--primary)' : 'var(--text-muted)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--primary)';
                                        e.currentTarget.style.background = 'rgba(251, 197, 49, 0.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--card-border)';
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                    }}
                                >
                                    <CameraIcon size={20} color={editFile ? 'var(--primary)' : 'var(--text-muted)'} />
                                    {editFile ? `Selected: ${editFile.name}` : 'Click to upload a new photo'}
                                </label>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                style={{ flex: 1 }}
                                onClick={() => setEditingMachine(null)}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="btn btn-primary" 
                                style={{ flex: 2 }}
                                disabled={updating}
                            >
                                {updating ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>,
            document.body
        )}
    </div>
  );
};
