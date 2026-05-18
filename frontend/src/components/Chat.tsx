import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../api';
import { TrashIcon, PlusIcon } from './Icons';

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
}

interface Thread {
  id: string;
  title: string;
}

export const Chat = () => {
  const [activeThread, setActiveThread] = useState('1');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState('');
  const [loadingThreads, setLoadingThreads] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeMessages = messages[activeThread] || [];

  const fetchThreads = async (switchToLast = false) => {
    try {
      const res = await api.get('/chat/threads');
      const fetchedThreads = Array.isArray(res.data) ? res.data : [];
      
      if (fetchedThreads.length === 0) {
          const defaultThread = { id: '1', title: 'New Training' };
          setThreads([defaultThread]);
          setActiveThread('1');
      } else {
          const sorted = [...fetchedThreads].sort((a: any, b: any) => parseInt(a.id) - parseInt(b.id));
          setThreads(sorted);
          
          if (switchToLast) {
              setActiveThread(sorted[sorted.length - 1].id);
          } else if (!sorted.find(t => t.id === activeThread)) {
              setActiveThread(sorted[0].id);
          }
      }
    } catch (err) {
      console.error('Error fetching threads:', err);
      if (threads.length === 0) setThreads([{ id: '1', title: 'New Training' }]);
    }
  };

  const addThread = () => {
      if (threads.length >= 3) return;
      const usedIds = threads.map(t => parseInt(t.id));
      let nextId = 1;
      while (usedIds.includes(nextId)) nextId++;
      
      const newThreadId = String(nextId);
      const newThread = { id: newThreadId, title: `New Training` };
      setThreads(prev => [...prev, newThread].sort((a, b) => parseInt(a.id) - parseInt(b.id)));
      setActiveThread(newThreadId);
      setMessages(prev => ({ ...prev, [newThreadId]: [] })); // Clear messages for the new thread locally
  };

  const fetchHistory = async (threadId: string) => {
    if (!threadId) return;
    try {
      // Add timestamp to bust browser cache
      const res = await api.get(`/chat/history?thread_id=${threadId}&t=${Date.now()}`);
      setMessages(prev => ({ ...prev, [threadId]: res.data }));
    } catch (err) {
      console.error('Error fetching chat history:', err);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    if (activeThread) {
        fetchHistory(activeThread);
    }
  }, [activeThread]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeThread, loadingThreads]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loadingThreads[activeThread]) return;

    const currentThreadId = activeThread;
    const userMessage: Message = { role: 'user', content: input };
    
    setMessages((prev) => ({
        ...prev,
        [currentThreadId]: [...(prev[currentThreadId] || []), userMessage]
    }));
    setInput('');
    setLoadingThreads(prev => ({ ...prev, [currentThreadId]: true }));

    try {
      const res = await api.post('/chat/message', { 
          message: input,
          thread_id: currentThreadId 
      });
      
      const assistantMessage: Message = { role: 'assistant', content: res.data.content };
      setMessages((prev) => ({
          ...prev,
          [currentThreadId]: [...(prev[currentThreadId] || []), assistantMessage]
      }));
      
      if (res.data.thread_title) {
          fetchThreads();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setLoadingThreads(prev => ({ ...prev, [currentThreadId]: false }));
    }
  };

  const deleteThread = async (threadId: string) => {
      const thread = threads.find(t => t.id === threadId);
      if (window.confirm(`Are you sure you want to clear "${thread?.title || 'this session'}"?`)) {
          try {
              await api.delete(`/chat/thread/${threadId}`);
              
              const remaining = threads.filter(t => t.id !== threadId);
              if (remaining.length > 0) {
                  const nextThread = remaining[0].id;
                  setThreads(remaining);
                  setActiveThread(nextThread);
                  fetchHistory(nextThread);
              } else {
                  // If it was the last one, reset to default state immediately
                  setThreads([{ id: '1', title: 'New Training' }]);
                  setActiveThread('1');
                  setMessages(prev => { const newM = {...prev}; delete newM['1']; return newM; });
              }
              
              // Refresh from server to be sure
              fetchThreads();
          } catch (err) {
              console.error('Error deleting thread:', err);
          }
      }
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '1100px', height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
              <h1 style={{ margin: 0, fontSize: '2rem', letterSpacing: '-0.02em' }}>AI <span style={{ color: 'var(--primary)', fontWeight: 800 }}>COACH</span></h1>
              <p className="text-muted" style={{ textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.3em', fontWeight: 800, opacity: 0.8 }}>Professional Performance</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {threads.map(t => (
                      <button 
                        key={t.id}
                        onClick={() => setActiveThread(t.id)}
                        className={`btn ${activeThread === t.id ? 'btn-primary' : ''}`}
                        style={{ 
                            padding: '0.5rem 0.75rem', 
                            fontSize: '0.7rem', 
                            width: '100px', // Fixed width to prevent overflow
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            background: activeThread === t.id ? 'var(--primary)' : 'transparent',
                            color: activeThread === t.id ? '#000' : 'rgba(255,255,255,0.6)',
                            border: 'none',
                            fontWeight: 700,
                            borderRadius: '2px',
                            transition: 'all 0.2s ease',
                            textAlign: 'center'
                        }}
                        title={t.title}
                      >
                          {t.title}
                      </button>
                  ))}
                  {threads.length < 3 && (
                      <button 
                        onClick={addThread}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem', minWidth: 'auto', background: 'rgba(255,255,255,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="New Session"
                      >
                          <PlusIcon size={14} />
                      </button>
                  )}
              </div>
              <button 
                onClick={() => deleteThread(activeThread)}
                className="btn btn-secondary"
                style={{ 
                    padding: '0.6rem', 
                    background: 'rgba(255,50,50,0.1)', 
                    borderColor: 'rgba(255,50,50,0.2)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderRadius: '4px'
                }}
                title="Clear Session"
              >
                  <TrashIcon size={16} color="#ff4d4d" />
              </button>
          </div>
      </div>

      <div className="card" style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '0', 
          overflow: 'hidden', 
          borderBottom: '4px solid var(--primary)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          background: '#0a0a0a'
      }}>
        
        <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2.5rem',
            background: 'radial-gradient(circle at top right, rgba(251, 197, 49, 0.03) 0%, transparent 40%), linear-gradient(to bottom, #0d0d0d 0%, #050505 100%)'
        }}>
          {activeMessages.length === 0 && !loadingThreads[activeThread] && (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <div className="animate-fade-in" style={{ maxWidth: '450px' }}>
                      <div style={{ 
                          fontSize: '5rem', 
                          marginBottom: '2rem', 
                          filter: 'drop-shadow(0 0 30px rgba(251, 197, 49, 0.3))',
                          animation: 'pulse 3s infinite ease-in-out'
                      }}>⚡</div>
                      <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', fontWeight: 800 }}>READY TO LEVEL UP?</h2>
                      <p className="text-muted" style={{ fontSize: '1rem', lineHeight: 1.6 }}>I'm your Gemini-powered elite coach. Tell me your goals, your struggles, or your last workout. We don't accept excuses here.</p>
                      <div style={{ marginTop: '2.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                          <button onClick={() => setInput("Give me a high-intensity finisher for chest day.")} className="insight-chip" style={{ cursor: 'pointer', padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>Chest Finisher</button>
                          <button onClick={() => setInput("Optimize my protein intake for muscle growth.")} className="insight-chip" style={{ cursor: 'pointer', padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>Protein Optimization</button>
                          <button onClick={() => setInput("I'm feeling unmotivated today. Discipline me.")} className="insight-chip" style={{ cursor: 'pointer', padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>Hard Truth</button>
                      </div>
                  </div>
              </div>
          )}
          
          {activeMessages.map((m, idx) => (
            <div 
              key={idx} 
              className="animate-fade-in"
              style={{ 
                display: 'flex', 
                gap: '1.25rem',
                flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ 
                  width: '45px', 
                  height: '45px', 
                  background: m.role === 'user' ? '#1a1a1a' : 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  color: m.role === 'user' ? '#888' : '#000',
                  border: m.role === 'user' ? '1px solid #333' : 'none',
                  boxShadow: m.role === 'assistant' ? '0 0 15px rgba(251, 197, 49, 0.2)' : 'none',
                  borderRadius: '2px'
              }}>
                  {m.role === 'user' ? 'YOU' : 'AI'}
              </div>
              <div 
                className="chat-message-content"
                style={{ 
                  maxWidth: '75%', 
                  padding: '1.5rem 1.75rem', 
                  background: m.role === 'user' ? 'rgba(255,255,255,0.02)' : 'rgba(251, 197, 49, 0.03)',
                  color: m.role === 'user' ? '#ccc' : '#fff',
                  border: `1px solid ${m.role === 'user' ? 'rgba(255,255,255,0.05)' : 'rgba(251, 197, 49, 0.15)'}`,
                  lineHeight: 1.7,
                  position: 'relative',
                  fontSize: '1.05rem',
                  borderRadius: '4px'
                }}
              >
                <ReactMarkdown>{m.content}</ReactMarkdown>
                <div style={{ 
                    position: 'absolute', 
                    top: '15px', 
                    [m.role === 'user' ? 'right' : 'left']: '-6px',
                    width: '12px',
                    height: '12px',
                    background: m.role === 'user' ? '#0d0d0d' : '#0d0d0d',
                    borderLeft: m.role === 'assistant' ? '1px solid rgba(251, 197, 49, 0.15)' : 'none',
                    borderBottom: m.role === 'assistant' ? '1px solid rgba(251, 197, 49, 0.15)' : 'none',
                    borderRight: m.role === 'user' ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    borderTop: m.role === 'user' ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    transform: 'rotate(45deg)',
                    zIndex: 0
                }}></div>
              </div>
            </div>
          ))}
          {loadingThreads[activeThread] && (
            <div style={{ display: 'flex', gap: '1.25rem' }}>
              <div style={{ width: '45px', height: '45px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000', borderRadius: '2px' }}>AI</div>
              <div style={{ padding: '1.5rem 1.75rem', background: 'rgba(251, 197, 49, 0.03)', border: '1px solid rgba(251, 197, 49, 0.15)', borderRadius: '4px', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <div className="animate-pulse" style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }}></div>
                <div className="animate-pulse" style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%', animationDelay: '0.2s' }}></div>
                <div className="animate-pulse" style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%', animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ background: '#000', padding: '2rem 2.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)}
                placeholder="Talk to your Coach..."
                style={{ 
                    flex: 1, 
                    padding: '1rem 1.5rem', 
                    background: '#0d0d0d', 
                    color: 'white', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '1rem',
                    borderRadius: '4px',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontWeight: 800, letterSpacing: '0.1em' }} disabled={loadingThreads[activeThread] || !input.trim()}>
                SEND
              </button>
            </form>
            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.2em' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Session ID: {activeThread}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '6px', height: '6px', background: '#00ff00', borderRadius: '50%', boxShadow: '0 0 10px #00ff00' }}></div>
                    Gemini Flash powered coach
                </span>
            </div>
        </div>
      </div>
    </div>
  );
};
