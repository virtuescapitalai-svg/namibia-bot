
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';

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
    width: 380px; /* Slightly wider */
    height: 600px; /* Taller */
    background: white;
    border-radius: 16px; /* More rounded */
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slideUp 0.3s ease;
    border: 1px solid rgba(0,0,0,0.05); /* Subtle border */
    font-size: 16px; /* Base font size */
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .sn-header {
    background: #1a1a1a;
    color: #d4af37;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    font-size: 16px;
    letter-spacing: 0.5px;
  }
  .sn-messages {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    background: #f8f8f8; /* Softer background */
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .sn-message {
    max-width: 85%;
    padding: 12px 16px;
    border-radius: 16px;
    font-size: 15px; /* Larger font */
    line-height: 1.6; /* Better readability */
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  .sn-message.user {
    align-self: flex-end;
    background: #1a1a1a;
    color: white;
    border-bottom-right-radius: 4px;
  }
  .sn-message.assistant {
    align-self: flex-start;
    background: white;
    color: #333;
    border-bottom-left-radius: 4px;
    border: 1px solid #eee;
  }
  /* Markdown Styles */
  .sn-message p {
    margin: 0 0 8px 0;
  }
  .sn-message p:last-child {
    margin: 0;
  }
  .sn-message strong {
    font-weight: 700;
    color: inherit;
  }
  .sn-message ul, .sn-message ol {
    margin: 8px 0;
    padding-left: 20px;
  }
  .sn-message li {
    margin-bottom: 4px;
  }
  .sn-message a {
    color: #d4af37;
    text-decoration: underline;
  }
  .sn-input-area {
    padding: 16px;
    background: white;
    border-top: 1px solid #f0f0f0;
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .sn-input {
    flex: 1;
    padding: 12px 16px;
    background: #f5f5f5;
    border: 1px solid transparent;
    border-radius: 24px;
    outline: none;
    font-size: 15px;
    transition: all 0.2s;
  }
  .sn-input:focus {
    background: white;
    border-color: #d4af37;
    box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
  }
  .sn-send-btn {
    background: #d4af37;
    color: white;
    border: none;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s;
  }
  .sn-send-btn:hover:not(:disabled) {
    background: #b5952f;
  }
  .sn-send-btn:disabled {
    background: #eee;
    color: #aaa;
    cursor: not-allowed;
  }
  /* Contact Form Styles */
  .sn-contact-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
  }
  .sn-contact-input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
    outline: none;
  }
  .sn-contact-input:focus {
    border-color: #d4af37;
  }
  .sn-contact-btn {
    background: #d4af37;
    color: white;
    border: none;
    padding: 10px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
  }
  .sn-contact-btn:hover {
    background: #b5952f;
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

      if (data.error) {
        // Handle specific API errors cleanly
        setMessages(prev => [...prev, { role: 'assistant', content: "I apologize, but I'm slightly overwhelmed at the moment (Quota Limit). Please contact our team directly for immediate assistance." }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      }

    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting to the concierge service. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Optimistic UI
    setMessages(prev => [...prev, { role: 'assistant', content: "**Thank you.** \n\nA travel specialist will contact you shortly to plan your journey." }]);

    try {
      const apiUrl = (window as any).SN_API_URL || 'http://localhost:3000';
      await fetch(`${apiUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.error('Contact error', err);
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
            {messages.map((m, i) => {
              // Check for Contact Trigger
              if (m.role === 'assistant' && m.content.includes('[SHOW_CONTACT_FORM]')) {
                const cleanContent = m.content.replace('[SHOW_CONTACT_FORM]', '').trim();
                return (
                  <React.Fragment key={i}>
                    {cleanContent && (
                      <div className="sn-message assistant">
                        <ReactMarkdown>{cleanContent}</ReactMarkdown>
                      </div>
                    )}
                    <div className="sn-message assistant" style={{ background: '#fcfcfc', border: '1px solid #eee' }}>
                      <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#d4af37' }}>
                        Direct Enquiry
                      </div>
                      <form className="sn-contact-form" onSubmit={handleContactSubmit}>
                        <input className="sn-contact-input" name="name" placeholder="Your Name" required />
                        <input className="sn-contact-input" name="email" type="email" placeholder="Email Address" required />
                        <input className="sn-contact-input" name="details" placeholder="Any specific requirements?" />
                        <button className="sn-contact-btn" type="submit">
                          Request a Specialist
                        </button>
                      </form>
                    </div>
                  </React.Fragment>
                );
              }

              return (
                <div key={i} className={`sn-message ${m.role}`}>
                  {m.role === 'assistant' ? (
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  ) : (
                    m.content
                  )}
                </div>
              );
            })}
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
              <Send size={18} />
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
