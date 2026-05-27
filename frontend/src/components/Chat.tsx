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
    <div className="container animate-fade-in" style={{ maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '100px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2rem)', letterSpacing: '-0.02em' }}>AI <span style={{ color: 'var(--primary)', fontWeight: 800 }}>COACH</span></h1>
              <p className="text-muted" style={{ textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.2em', fontWeight: 800, opacity: 0.8 }}>Professional Performance</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
              <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(255,255,255,0.03)', padding: '0.3rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto', maxWidth: '100%' }}>
                  {threads.map(t => (
                      <button 
                        key={t.id}
                        onClick={() => setActiveThread(t.id)}
                        className={`btn ${activeThread === t.id ? 'btn-primary' : ''}`}
                        style={{ 
                            padding: '0.4rem 0.6rem', 
                            fontSize: '0.65rem', 
                            minWidth: '80px',
                            maxWidth: '120px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            background: activeThread === t.id ? 'var(--primary)' : 'transparent',
                            color: activeThread === t.id ? '#000' : 'rgba(255,255,255,0.6)',
                            border: 'none',
                            fontWeight: 700,
                            borderRadius: '2px',
                            transition: 'all 0.2s ease',
                            textAlign: 'center',
                            flexShrink: 0
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
                        style={{ padding: '0.4rem', minWidth: 'auto', background: 'rgba(255,255,255,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        title="New Session"
                      >
                          <PlusIcon size={12} />
                      </button>
                  )}
              </div>
              <button 
                onClick={() => deleteThread(activeThread)}
                className="btn btn-secondary"
                style={{ 
                    padding: '0.5rem', 
                    background: 'rgba(255,50,50,0.1)', 
                    borderColor: 'rgba(255,50,50,0.2)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderRadius: '4px',
                    flexShrink: 0
                }}
                title="Clear Session"
              >
                  <TrashIcon size={14} color="#ff4d4d" />
              </button>
          </div>
      </div>

      <div className="card" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '0', 
          borderBottom: '4px solid var(--primary)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          background: '#0a0a0a'
      }}>
        
        <div style={{ 
            padding: 'clamp(1rem, 5vw, 2.5rem)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            background: 'radial-gradient(circle at top right, rgba(251, 197, 49, 0.03) 0%, transparent 40%), linear-gradient(to bottom, #0d0d0d 0%, #050505 100%)'
        }}>
          {activeMessages.length === 0 && !loadingThreads[activeThread] && (
              <div style={{ padding: '4rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <div className="animate-fade-in" style={{ maxWidth: '450px', padding: '1rem' }}>
                      <div style={{ 
                          fontSize: 'clamp(3rem, 10vw, 5rem)', 
                          marginBottom: '1.5rem', 
                          filter: 'drop-shadow(0 0 30px rgba(251, 197, 49, 0.3))',
                          animation: 'pulse 3s infinite ease-in-out'
                      }}>⚡</div>
                      <h2 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', marginBottom: '1rem', fontWeight: 800 }}>READY TO LEVEL UP?</h2>
                      <p className="text-muted" style={{ fontSize: 'clamp(0.85rem, 3vw, 1rem)', lineHeight: 1.6 }}>I'm your Gemini-powered elite coach. Tell me your goals, your struggles, or your last workout. We don't accept excuses here.</p>
                      <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                          <button onClick={() => setInput("Give me a high-intensity finisher for chest day.")} className="insight-chip" style={{ cursor: 'pointer', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem' }}>Chest Finisher</button>
                          <button onClick={() => setInput("Optimize my protein intake for muscle growth.")} className="insight-chip" style={{ cursor: 'pointer', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem' }}>Protein Optimization</button>
                          <button onClick={() => setInput("I'm feeling unmotivated today. Discipline me.")} className="insight-chip" style={{ cursor: 'pointer', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem' }}>Hard Truth</button>
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
                gap: 'clamp(0.5rem, 3vw, 1.25rem)',
                flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ 
                  width: '35px', 
                  height: '35px', 
                  background: m.role === 'user' ? '#1a1a1a' : 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  color: m.role === 'user' ? '#888' : '#000',
                  border: m.role === 'user' ? '1px solid #333' : 'none',
                  boxShadow: m.role === 'assistant' ? '0 0 15px rgba(251, 197, 49, 0.2)' : 'none',
                  borderRadius: '2px',
                  flexShrink: 0
              }}>
                  {m.role === 'user' ? 'YOU' : 'AI'}
              </div>
              <div 
                className="chat-message-content"
                style={{ 
                  maxWidth: m.role === 'user' ? '85%' : 'calc(100% - 70px)', 
                  padding: 'clamp(1rem, 4vw, 1.5rem) clamp(1rem, 4vw, 1.75rem)', 
                  background: m.role === 'user' ? 'rgba(255,255,255,0.02)' : 'rgba(251, 197, 49, 0.03)',
                  color: m.role === 'user' ? '#ccc' : '#fff',
                  border: `1px solid ${m.role === 'user' ? 'rgba(255,255,255,0.05)' : 'rgba(251, 197, 49, 0.15)'}`,
                  lineHeight: 1.6,
                  position: 'relative',
                  fontSize: '0.95rem',
                  borderRadius: '4px',
                  marginRight: m.role === 'assistant' ? 'clamp(1rem, 5vw, 2.5rem)' : '0',
                  marginLeft: m.role === 'user' ? 'clamp(1rem, 5vw, 2.5rem)' : '0'
                }}
              >
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          {loadingThreads[activeThread] && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ width: '35px', height: '35px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000', borderRadius: '2px', flexShrink: 0 }}>AI</div>
              <div style={{ padding: '1rem 1.5rem', background: 'rgba(251, 197, 49, 0.03)', border: '1px solid rgba(251, 197, 49, 0.15)', borderRadius: '4px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div className="animate-pulse" style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%' }}></div>
                <div className="animate-pulse" style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animationDelay: '0.2s' }}></div>
                <div className="animate-pulse" style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#000', padding: 'clamp(1rem, 4vw, 2rem) clamp(1rem, 5vw, 2.5rem)', borderTop: '1px solid rgba(255,255,255,0.05)', zIndex: 100 }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Talk to your Coach..."
                    style={{ 
                        flex: 1, 
                        padding: '0.8rem 1.25rem', 
                        background: '#0d0d0d', 
                        color: 'white', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        fontSize: '0.95rem',
                        borderRadius: '4px',
                        outline: 'none',
                        transition: 'border-color 0.3s ease',
                        minWidth: 0
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.8rem 1.5rem', fontWeight: 800, fontSize: '0.9rem' }} disabled={loadingThreads[activeThread] || !input.trim()}>
                    SEND
                  </button>
                </form>
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span>ID: {activeThread}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: '5px', height: '5px', background: '#00ff00', borderRadius: '50%', boxShadow: '0 0 10px #00ff00' }}></div>
                        Gemini FLASH coach
                    </span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
