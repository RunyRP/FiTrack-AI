import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { TrashIcon } from './Icons';

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
  const [threads, setThreads] = useState<Thread[]>([
      { id: '1', title: 'Session 1' },
      { id: '2', title: 'Session 2' },
      { id: '3', title: 'Session 3' }
  ]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchThreads = async () => {
    try {
      const res = await api.get('/chat/threads');
      const fetchedThreads = Array.isArray(res.data) ? res.data : [];
      
      const newThreads = [ '1', '2', '3' ].map(id => {
          const found = fetchedThreads.find((t: any) => String(t.id) === String(id));
          return found || { id, title: `Session ${id}` };
      });
      setThreads(newThreads);
    } catch (err) {
      console.error('Error fetching threads:', err);
    }
  };

  const fetchHistory = async (threadId: string) => {
    try {
      const res = await api.get(`/chat/history?thread_id=${threadId}`);
      setMessages(res.data);
    } catch (err) {
      console.error('Error fetching chat history:', err);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    fetchHistory(activeThread);
  }, [activeThread]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/chat/message', { 
          message: input,
          thread_id: activeThread 
      });
      const assistantMessage: Message = { role: 'assistant', content: res.data.content };
      setMessages((prev) => [...prev, assistantMessage]);
      
      // If a title was generated, refresh thread list
      if (res.data.thread_title) {
          fetchThreads();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteThread = async (threadId: string) => {
      const thread = threads.find(t => t.id === threadId);
      if (window.confirm(`Are you sure you want to clear "${thread?.title || 'this session'}"?`)) {
          try {
              await api.delete(`/chat/thread/${threadId}`);
              if (activeThread === threadId) {
                  setMessages([]);
              }
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
              <h1 style={{ margin: 0, fontSize: '2rem' }}>AI <span style={{ color: 'var(--primary)' }}>Coach</span></h1>
              <p className="text-muted" style={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.2em', fontWeight: 800 }}>Performance Coaching</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {threads.map(t => (
                  <button 
                    key={t.id}
                    onClick={() => setActiveThread(t.id)}
                    className={`btn ${activeThread === t.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ 
                        padding: '0.5rem 1rem', 
                        fontSize: '0.75rem', 
                        minWidth: '120px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '200px'
                    }}
                    title={t.title}
                  >
                      {t.title}
                  </button>
              ))}
              <button 
                onClick={() => deleteThread(activeThread)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem', background: 'rgba(255,0,0,0.1)', borderColor: 'rgba(255,0,0,0.2)' }}
                title="Clear Session"
              >
                  <TrashIcon size={18} />
              </button>
          </div>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden', borderBottom: '4px solid var(--primary)' }}>
        
        <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
            background: 'linear-gradient(to bottom, #121212 0%, #080808 100%)'
        }}>
          {messages.length === 0 && !loading && (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <div className="animate-fade-in" style={{ maxWidth: '400px' }}>
                      <div style={{ fontSize: '4rem', marginBottom: '1.5rem', filter: 'drop-shadow(0 0 20px var(--primary))' }}>💪</div>
                      <h3>Ready to Work?</h3>
                      <p className="text-muted">I'm here to help you crush your goals. Ask me about your routine, nutrition, or just tell me how you're feeling today.</p>
                      <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                          <button onClick={() => setInput("How can I stay motivated today?")} className="insight-chip" style={{ cursor: 'pointer' }}>Motivation</button>
                          <button onClick={() => setInput("What should I eat post-workout?")} className="insight-chip" style={{ cursor: 'pointer' }}>Nutrition</button>
                          <button onClick={() => setInput("Review my last workout.")} className="insight-chip" style={{ cursor: 'pointer' }}>Last Session</button>
                      </div>
                  </div>
              </div>
          )}
          
          {messages.map((m, idx) => (
            <div 
              key={idx} 
              className="animate-fade-in"
              style={{ 
                display: 'flex', 
                gap: '1rem',
                flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  background: m.role === 'user' ? '#333' : 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  fontWeight: 900,
                  color: m.role === 'user' ? '#fff' : '#000',
                  border: '1px solid var(--card-border)'
              }}>
                  {m.role === 'user' ? 'U' : 'AI'}
              </div>
              <div 
                style={{ 
                  maxWidth: '70%', 
                  padding: '1.25rem 1.5rem', 
                  background: m.role === 'user' ? 'rgba(255,255,255,0.05)' : 'rgba(251, 197, 49, 0.05)',
                  color: '#fff',
                  border: `1px solid ${m.role === 'user' ? 'var(--card-border)' : 'rgba(251, 197, 49, 0.2)'}`,
                  lineHeight: 1.6,
                  position: 'relative',
                  fontSize: '1.05rem'
                }}
              >
                {m.content}
                <div style={{ 
                    position: 'absolute', 
                    top: '0.5rem', 
                    [m.role === 'user' ? 'right' : 'left']: '-5px',
                    width: '10px',
                    height: '10px',
                    background: 'inherit',
                    borderLeft: m.role === 'assistant' ? '1px solid rgba(251, 197, 49, 0.2)' : 'none',
                    borderBottom: m.role === 'assistant' ? '1px solid rgba(251, 197, 49, 0.2)' : 'none',
                    borderRight: m.role === 'user' ? '1px solid var(--card-border)' : 'none',
                    borderTop: m.role === 'user' ? '1px solid var(--card-border)' : 'none',
                    transform: 'rotate(45deg)',
                    zIndex: 0
                }}></div>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000' }}>AI</div>
              <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(251, 197, 49, 0.05)', border: '1px solid rgba(251, 197, 49, 0.2)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div className="animate-pulse" style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%' }}></div>
                <div className="animate-pulse" style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animationDelay: '0.2s' }}></div>
                <div className="animate-pulse" style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ background: '#000', padding: '1.5rem 2rem', borderTop: '1px solid var(--card-border)' }}>
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message AI Coach..."
                style={{ 
                    flex: 1, 
                    padding: '0.75rem 1rem', 
                    background: '#111', 
                    color: 'white', 
                    border: '1px solid var(--card-border)',
                    fontSize: '1rem',
                }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }} disabled={loading || !input.trim()}>
                SEND
              </button>
            </form>
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em' }}>
                <span>Active Session: {activeThread}</span>
                <span>AI-Powered Discipline</span>
            </div>
        </div>
      </div>
    </div>
  );
};
