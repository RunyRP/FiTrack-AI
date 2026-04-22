import { useState, useEffect, useRef } from 'react';
import api from '../api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/chat/history');
        setMessages(res.data);
      } catch (err) {
        console.error('Error fetching chat history:', err);
      }
    };
    fetchHistory();
  }, []);

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
      const res = await api.post('/chat/message', { message: input });
      const assistantMessage: Message = { role: 'assistant', content: res.data.content };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '900px', height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem', overflow: 'hidden', marginBottom: 0 }}>
        <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>Fitness AI Chat</h2>
            <p className="text-muted">Personalized advice based on your profile and goals.</p>
        </div>
        
        <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            margin: '0 -0.5rem 1.5rem 0', 
            paddingRight: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
        }}>
          {messages.map((m, idx) => (
            <div 
              key={idx} 
              className="animate-fade-in"
              style={{ 
                display: 'flex', 
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div 
                style={{ 
                  maxWidth: '75%', 
                  padding: '1.25rem', 
                  borderRadius: m.role === 'user' ? '1.5rem 1.5rem 0.25rem 1.5rem' : '1.5rem 1.5rem 1.5rem 0.25rem',
                  background: m.role === 'user' ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'rgba(255,255,255,0.05)',
                  color: m.role === 'user' ? '#001219' : 'white',
                  fontWeight: m.role === 'user' ? 700 : 400,
                  boxShadow: m.role === 'user' ? '0 4px 15px rgba(79, 172, 254, 0.2)' : 'none',
                  border: m.role === 'assistant' ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  lineHeight: 1.5
                }}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ 
                padding: '1.25rem', 
                borderRadius: '1.5rem 1.5rem 1.5rem 0.25rem', 
                background: 'rgba(255,255,255,0.05)', 
                color: 'var(--text-muted)',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center'
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
            background: 'rgba(255,255,255,0.03)', 
            padding: '0.75rem', 
            borderRadius: '1.25rem',
            border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            style={{ 
                flex: 1, 
                padding: '0.75rem 1rem', 
                background: 'transparent', 
                color: 'white', 
                border: 'none',
                fontSize: '1rem'
            }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
