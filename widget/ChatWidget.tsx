
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { createRoot } from 'react-dom/client';

const STYLES = `
  #sn-widget-container {
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    z-index: 2147483647 !important; /* Max z-index to stay on top */
    font-family: 'Inter', sans-serif;
    isolation: isolate; /* Create new stacking context */
  }
  .sn-launcher {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #d4af37; /* Gold */
    color: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s;
  }
  .sn-launcher:hover {
    transform: scale(1.05);
  }
  .sn-window {
    position: absolute;
    bottom: 80px;
    right: 0;
    width: 350px;
    height: 500px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slideUp 0.3s ease;
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .sn-header {
    background: #1a1a1a;
    color: #d4af37;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }
  .sn-messages {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    background: #f9f9f9;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .sn-message {
    max-width: 80%;
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.4;
  }
  .sn-message.user {
    align-self: flex-end;
    background: #1a1a1a;
    color: white;
    border-bottom-right-radius: 2px;
  }
  .sn-message.assistant {
    align-self: flex-start;
    background: #e5e5e5;
    color: #1a1a1a;
    border-bottom-left-radius: 2px;
  }
  .sn-input-area {
    padding: 12px;
    background: white;
    border-top: 1px solid #eee;
    display: flex;
    gap: 8px;
  }
  .sn-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 20px;
    outline: none;
    font-size: 14px;
  }
  .sn-input:focus {
    border-color: #d4af37;
  }
  .sn-send-btn {
    background: #d4af37;
    color: white;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .sn-send-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

type Message = { role: 'user' | 'assistant'; content: string };

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Welcome to Secret Namibia. How can I assist you with your journey today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const apiUrl = (window as any).SN_API_URL || 'http://localhost:3000/api/chat';

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: userMsg }] }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting to the concierge service. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="sn-launcher" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </div>

      {isOpen && (
        <div className="sn-window">
          <div className="sn-header">
            <span>Secret Namibia Concierge</span>
            <X size={18} style={{ cursor: 'pointer' }} onClick={() => setIsOpen(false)} />
          </div>
          <div className="sn-messages">
            {messages.map((m, i) => (
              <div key={i} className={`sn-message ${m.role}`}>
                {m.content}
              </div>
            ))}
            {isLoading && (
              <div className="sn-message assistant">
                <Loader2 className="animate-spin" size={16} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form className="sn-input-area" onSubmit={handleSubmit}>
            <input
              className="sn-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about safaris..."
            />
            <button className="sn-send-btn" type="submit" disabled={isLoading}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

// Mount function
export function mount(options: any = {}) {
  // Check if widget is already mounted
  if (document.getElementById('sn-widget-container')) return;

  const el = document.createElement('div');
  el.id = 'sn-widget-container';
  document.body.appendChild(el);

  // Set global options if provided
  if (options.apiUrl) {
    (window as any).SN_API_URL = options.apiUrl;
  }

  const root = createRoot(el);
  root.render(<ChatWidget />);
}

// Auto-mount
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    mount();
  } else {
    document.addEventListener('DOMContentLoaded', () => mount());
  }
}
