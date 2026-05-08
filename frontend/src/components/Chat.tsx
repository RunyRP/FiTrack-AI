import { useState, useEffect, useRef } from 'react';
import api from '../api';

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
}

export const Chat = () => {
  const [activeThread, setActiveThread] = useState('1');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    fetchHistory(activeThread);
  }, [activeThread]);

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
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteThread = async (threadId: string) => {
      if (window.confirm(`Are you sure you want to clear Chat ${threadId}?`)) {
          try {
              await api.delete(`/chat/thread/${threadId}`);
              if (activeThread === threadId) {
                  setMessages([]);
              }
          } catch (err) {
              console.error('Error deleting thread:', err);
          }
      }
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '1000px', height: 'calc(100vh - 160px)', display: 'flex', gap: '2rem' }}>
      
      {/* Thread Sidebar */}
      <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Conversations</h3>
          {[ '1', '2', '3' ].map(num => (
              <div key={num} style={{ position: 'relative' }}>
                  <button 
                    onClick={() => setActiveThread(num)}
                    className={`btn ${activeThread === num ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ width: '100%', justifyContent: 'flex-start', padding: '1.25rem' }}
                  >
                      <span>💬</span> Chat {num}
                  </button>
                  <button 
                    onClick={() => deleteThread(num)}
                    style={{ 
                        position: 'absolute', 
                        right: '1rem', 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: activeThread === num ? '#000' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                    title="Clear Chat"
                  >
                      🗑️
                  </button>
              </div>
          ))}
          <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(251, 197, 49, 0.05)', border: '1px solid var(--card-border)', fontSize: '0.75rem' }}>
              <p>Each chat is a separate thread with its own AI context. Max 3 chats.</p>
          </div>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem', overflow: 'hidden', marginBottom: 0 }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
                <h2 style={{ margin: 0 }}>Fitness AI Chat {activeThread}</h2>
                <p className="text-muted">Direct coaching and advice.</p>
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 900, background: 'var(--primary)', color: '#000', padding: '0.2rem 0.5rem' }}>
                LIVE COACHING
            </div>
        </div>
        
        <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            margin: '0 -1rem 1.5rem 0', 
            paddingRight: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
        }}>
          {messages.length === 0 && !loading && (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👋</div>
                      <p>Start a new conversation with your AI Coach.<br/>Ask about your workouts, meals, or goals.</p>
                  </div>
              </div>
          )}
          {messages.map((m, idx) => (
            <div 
              key={idx} 
              className="animate-fade-in"
              style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: m.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                  {m.role === 'user' ? 'You' : 'Coach'}
              </div>
              <div 
                style={{ 
                  maxWidth: '85%', 
                  padding: '1.5rem', 
                  background: m.role === 'user' ? 'var(--primary)' : '#1a1a1a',
                  color: m.role === 'user' ? '#000' : 'white',
                  fontWeight: m.role === 'user' ? 800 : 400,
                  border: m.role === 'assistant' ? '1px solid var(--card-border)' : 'none',
                  lineHeight: 1.6,
                  position: 'relative'
                }}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ 
                padding: '1.5rem', 
                background: '#1a1a1a', 
                color: 'var(--text-muted)',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                border: '1px solid var(--card-border)'
              }}>
                <div className="animate-pulse" style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }}></div>
                <div className="animate-pulse" style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%', animationDelay: '0.2s' }}></div>
                <div className="animate-pulse" style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%', animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} style={{ 
            display: 'flex', 
            gap: '1rem', 
            background: '#000', 
            padding: '1rem', 
            border: '1px solid var(--card-border)'
        }}>
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            placeholder="ASK YOUR COACH..."
            style={{ 
                flex: 1, 
                padding: '0.75rem 0', 
                background: 'transparent', 
                color: 'white', 
                border: 'none',
                fontSize: '1rem',
                fontWeight: 700,
                textTransform: 'uppercase'
            }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
            SEND
          </button>
        </form>
      </div>
    </div>
  );
};
