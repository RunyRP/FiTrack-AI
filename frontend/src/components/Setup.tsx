import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api, { API_URL } from '../api';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks';
import { CameraIcon, EditIcon } from './Icons';

export const Setup = () => {
  const location = useLocation();
  const isEquipmentOnly = location.state?.equipmentOnly;
  
  const [step, setStep] = useState<0 | 1 | 2 | 3>(isEquipmentOnly ? 3 : 0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState('male');
  const [objective, setObjective] = useState('maintain');
  const [machinery, setMachinery] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState('Chest');
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Edit State
  const [editingMachine, setEditingMachine] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editMuscle, setEditMuscle] = useState('Chest');
  const [editFile, setEditFile] = useState<File | null>(null);

  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();

  useEffect(() => {
      if (step === 3) {
          fetchMachinery();
      }
  }, [step]);

  useEffect(() => {
      if (user?.profile) {
          setName(user.profile.name || '');
          setAge(user.profile.age ? String(user.profile.age) : '');
          setWeight(user.profile.weight ? String(user.profile.weight) : '');
          setHeight(user.profile.height ? String(user.profile.height) : '');
          setGender(user.profile.gender || 'male');
          setObjective(user.profile.objective || 'maintain');
      }
  }, []); // Only initialize from profile once on mount

  const fetchMachinery = async () => {
    try {
      const res = await api.get('/workout/machinery');
      setMachinery(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditMachine = (m: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMachine(m);
    setEditName(m.name);
    setEditMuscle(m.exercises?.[0]?.muscles?.[0] || 'Chest');
    setEditFile(null);
  };

  const handleUpdateMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMachine) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('name', editName);
    formData.append('muscle_group', editMuscle);
    if (editFile) formData.append('file', editFile);

    try {
      await api.put(`/workout/machinery/${editingMachine.id}`, formData);
      setEditingMachine(null);
      fetchMachinery();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const categorizeMachine = (m: any) => {
    if (!m || !m.exercises || !m.exercises[0] || !m.exercises[0].muscles) return 'Other';
    const primaryMuscle = m.exercises[0].muscles[0] || 'Other';
    const muscle = primaryMuscle.toLowerCase();
    
    if (muscle.includes('quad') || muscle.includes('leg') || muscle.includes('glute') || muscle.includes('hamstring') || muscle.includes('calf')) return 'Legs';
    if (muscle.includes('chest') || muscle.includes('pectoral')) return 'Chest';
    if (muscle.includes('back') || muscle.includes('lat') || muscle.includes('row')) return 'Back';
    if (muscle.includes('shoulder') || muscle.includes('delt')) return 'Shoulders';
    if (muscle.includes('bicep') || muscle.includes('tricep') || muscle.includes('arm')) return 'Arms';
    if (muscle.includes('core') || muscle.includes('ab') || muscle.includes('stomach')) return 'Core';
    return 'Other';
  };

  const groupMachinery = () => {
    const groups: Record<string, any[]> = {
        'Chest': [], 'Back': [], 'Shoulders': [], 'Legs': [], 'Arms': [], 'Core': [], 'Other': []
    };
    
    machinery.forEach(m => {
        const cat = categorizeMachine(m);
        if (groups[cat]) groups[cat].push(m);
        else groups['Other'].push(m);
    });
    
    return groups;
  };

  const toggleMachine = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
  };

  const handleCompleteSetup = async () => {
    setLoading(true);
    try {
      await api.put('/user/profile', { 
        name,
        age: parseInt(age),
        weight: parseFloat(weight),
        height: parseFloat(height),
        gender,
        objective, 
        selected_machinery: selectedIds,
        setup_complete: true 
      });
      
      await refreshUser();
      navigate('/workout');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customFile) return;

    // Check for duplicates locally
    const isDuplicate = machinery.some(m => m.name.toLowerCase() === customName.trim().toLowerCase());
    if (isDuplicate) {
        alert(`A machine with the name "${customName}" already exists in your library.`);
        return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('name', customName);
    formData.append('muscle_group', customMuscle);
    formData.append('file', customFile);

    try {
      const res = await api.post('/workout/machinery', formData);
      setMachinery(prev => [...prev, res.data]);
      setSelectedIds(prev => [...prev, res.data.id]);
      setShowCustomForm(false);
      setCustomName('');
      setCustomFile(null);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const isStep2Valid = age && weight && height && gender;

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '800px' }}>
      <div className="card">
        {step === 0 && (
            <div className="animate-fade-in">
                <h2>Step 1: Introduction</h2>
                <p className="text-muted">Let's start with the basics. How should we call you?</p>
                <div className="input-group" style={{ marginTop: '2rem' }}>
                    <label>Your Name</label>
                    <input 
                        type="text" 
                        placeholder="Enter your name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        style={{ fontSize: '1.2rem', padding: '1.25rem' }}
                    />
                </div>
                <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '1rem', padding: '1.25rem' }}
                    onClick={() => setStep(1)}
                    disabled={!name.trim()}
                >
                    Next: Your Vitals
                </button>
            </div>
        )}

        {step === 1 && (
            <div className="animate-fade-in">
                <h2>Step 2: Your Vitals</h2>
                <p className="text-muted">We need these to calculate your calorie targets.</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '2rem' }}>
                    <div className="input-group">
                        <label>Age</label>
                        <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="Years" />
                    </div>
                    <div className="input-group">
                        <label>Gender</label>
                        <select value={gender} onChange={e => setGender(e.target.value)}>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="input-group">
                        <label>Current Weight (kg)</label>
                        <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="0.0" />
                    </div>
                    <div className="input-group">
                        <label>Height (cm)</label>
                        <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="170" />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(0)}>Back</button>
                    <button 
                        className="btn btn-primary" 
                        style={{ flex: 2 }} 
                        onClick={() => setStep(2)}
                        disabled={!isStep2Valid}
                    >
                        Next: Choose Goal
                    </button>
                </div>
            </div>
        )}

        {step === 2 && (
            <div className="animate-fade-in">
                <h2>Step 3: Your Goal</h2>
                <p className="text-muted">Hi {name}, what's your primary fitness objective?</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '2rem' }}>
                    {[
                        { id: 'lose_weight', label: 'Weight Loss', desc: 'Burn fat and improve health.', icon: '📉' },
                        { id: 'body_recomposition', label: 'Body Recomposition', desc: 'Lose fat and build muscle simultaneously.', icon: '🔄' },
                        { id: 'gain_muscle', label: 'Muscle Gain', desc: 'Build strength and mass.', icon: '💪' },
                        { id: 'maintain', label: 'Maintenance', desc: 'Keep current weight and tone.', icon: '⚖️' }
                    ].map(opt => (
                        <div 
                            key={opt.id}
                            className="card"
                            onClick={() => setObjective(opt.id)}
                            style={{ 
                                cursor: 'pointer', padding: '1.25rem', marginBottom: 0,
                                border: objective === opt.id ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                                background: objective === opt.id ? 'rgba(251, 197, 49, 0.05)' : undefined,
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                <span style={{ fontSize: '1.5rem' }}>{opt.icon}</span>
                                <div>
                                    <strong style={{ color: objective === opt.id ? 'var(--primary)' : 'white' }}>{opt.label}</strong>
                                    <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>{opt.desc}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>Back</button>
                    <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => setStep(3)}>Next: Equipment</button>
                </div>
            </div>
        )}

        {step === 3 && (
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2>Step 4: Equipment (Optional)</h2>
                        <p className="text-muted">Select the machines you have. Skip to use only bodyweight.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                            className="btn btn-primary" 
                            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                            onClick={() => setShowCustomForm(!showCustomForm)}
                        >
                            {showCustomForm ? 'Cancel Custom' : '+ Add Custom'}
                        </button>
                        <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                            onClick={handleCompleteSetup}
                        >
                            Skip & Finish
                        </button>
                    </div>
                </div>

                {showCustomForm && (
                    <div className="card" style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--primary)' }}>
                        <h3>Add Custom Equipment</h3>
                        <form onSubmit={handleAddCustomEquipment} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <div className="input-group">
                                <label>Equipment/Exercise Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Kettlebell Swing" 
                                    value={customName} 
                                    onChange={e => setCustomName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Primary Muscle Group</label>
                                <select value={customMuscle} onChange={e => setCustomMuscle(e.target.value)}>
                                    <option value="Chest">Chest</option>
                                    <option value="Back">Back</option>
                                    <option value="Shoulders">Shoulders</option>
                                    <option value="Legs">Legs</option>
                                    <option value="Arms">Arms</option>
                                    <option value="Core">Core</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="input-group" style={{ gridColumn: 'span 2' }}>
                                <label>Photo</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="file" 
                                        id="custom-file-input"
                                        accept="image/*"
                                        onChange={e => setCustomFile(e.target.files?.[0] || null)}
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
                                        required
                                    />
                                    <label 
                                        htmlFor="custom-file-input"
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
                                            color: customFile ? 'var(--primary)' : 'var(--text-muted)'
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
                                        <CameraIcon size={20} color={customFile ? 'var(--primary)' : 'var(--text-muted)'} />
                                        {customFile ? `Selected: ${customFile.name}` : 'Click to upload equipment photo'}
                                    </label>
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                className="btn btn-primary" 
                                style={{ gridColumn: 'span 2' }}
                                disabled={uploading}
                            >
                                {uploading ? 'Uploading...' : 'Add Equipment'}
                            </button>
                        </form>
                    </div>
                )}
                
                <div style={{ 
                    marginTop: '2rem', 
                    marginBottom: '2rem',
                    maxHeight: '450px',
                    overflowY: 'auto',
                    paddingRight: '0.5rem'
                }}>
                    {Object.entries(groupMachinery()).map(([groupName, machines]) => (
                        machines.length > 0 && (
                            <div key={groupName} style={{ marginBottom: '2rem' }}>
                                <h3 style={{ 
                                    fontSize: '0.8rem', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.1em', 
                                    color: 'var(--primary)',
                                    marginBottom: '1rem',
                                    paddingBottom: '0.5rem',
                                    borderBottom: '1px solid rgba(251, 197, 49, 0.2)'
                                }}>{groupName}</h3>
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                                    gap: '1rem' 
                                }}>
                                    {machines.map(m => (
                                        <div 
                                            key={m.id} 
                                            onClick={() => toggleMachine(m.id)}
                                            className={`equipment-card ${selectedIds.includes(m.id) ? 'selected' : ''}`}
                                            style={{ position: 'relative' }}
                                        >
                                            {m.user_id !== null && (
                                                <button 
                                                    onClick={(e) => handleEditMachine(m, e)}
                                                    style={{
                                                        position: 'absolute', top: '0.5rem', right: '0.5rem',
                                                        background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                                                        width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                                                        justifyContent: 'center', cursor: 'pointer', zIndex: 10
                                                    }}
                                                >
                                                    <EditIcon size={16} color="var(--primary)" />
                                                </button>
                                            )}
                                            <img src={getImageUrl(m.image_url)} alt={m.name} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                                            <div style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <strong style={{ fontSize: '0.85rem', color: selectedIds.includes(m.id) ? 'var(--primary)' : 'white' }}>{m.name}</strong>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    {isEquipmentOnly ? (
                        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate(-1)}>Cancel</button>
                    ) : (
                        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>Back</button>
                    )}
                    <button 
                        className="btn btn-primary" 
                        style={{ flex: 2 }} 
                        onClick={handleCompleteSetup}
                        disabled={loading}
                    >
                        {loading ? 'Finalizing...' : (selectedIds.length > 0 ? 'Save & Start Training' : 'Use Bodyweight Only')}
                    </button>
                </div>
            </div>
        )}
      </div>

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
                              disabled={uploading}
                          >
                              {uploading ? 'Saving...' : 'Save Changes'}
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
