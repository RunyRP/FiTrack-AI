import React, { useState, useEffect, useRef } from 'react';
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
    <div className="container" style={{ maxWidth: '800px', height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column' }}>
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', overflow: 'hidden' }}>
        <h2>Fitness AI Chat</h2>
        <p className="text-muted">Ask me anything about your training or nutrition</p>
        
        <div style={{ flex: 1, overflowY: 'auto', margin: '1.5rem 0', paddingRight: '0.5rem' }}>
          {messages.map((m, idx) => (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', 
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '1rem' 
              }}
            >
              <div 
                style={{ 
                  maxWidth: '80%', 
                  padding: '1rem', 
                  borderRadius: '12px',
                  background: m.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                  color: m.role === 'user' ? 'black' : 'white',
                  fontWeight: m.role === 'user' ? 600 : 400,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', fontStyle: 'italic', opacity: 0.7 }}>
                AI is thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your workout or diet..."
            style={{ flex: 1, padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0 1.5rem' }}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
