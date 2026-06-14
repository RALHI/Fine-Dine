import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, MessageSquare, Send, ChevronDown } from 'lucide-react';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hello! I'm your virtual customer support guide. Ask me about refund rules, delivery guidelines, or restaurant recommendations!",
      citations: []
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const sessionIdRef = useRef("session-" + Math.random().toString(36).substring(2, 11));
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSend = async (textToSend) => {
    const text = textToSend || inputVal.trim();
    if (!text) return;

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text }]);
    setInputVal('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionIdRef.current })
      });
      const data = await response.json();
      setIsTyping(false);

      if (response.ok) {
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: data.response,
          citations: data.citations || []
        }]);
      } else {
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: 'Sorry, I encountered an issue fetching answers. Please try again.'
        }]);
      }
    } catch (err) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: 'Network error. Support system is offline.'
      }]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      {isOpen && (
        <div className="chat-window-react" style={{
          width: '380px',
          height: '500px',
          backgroundColor: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          marginBottom: '16px',
        }}>
          {/* Header */}
          <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={20} />
              <h4 style={{ fontSize: '16px', fontWeight: 600 }}>FineDine Support</h4>
            </div>
            <button onClick={toggleChat} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          {/* Messages Board */}
          <div style={{ flexGrow: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--surface)' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: 'var(--radius)',
                fontSize: '14px',
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.sender === 'user' ? 'var(--primary)' : 'var(--bg)',
                color: msg.sender === 'user' ? 'white' : 'var(--text)',
                border: msg.sender === 'bot' ? '1px solid var(--border)' : 'none',
                borderBottomRightRadius: msg.sender === 'user' ? '4px' : 'var(--radius)',
                borderBottomLeftRadius: msg.sender === 'bot' ? '4px' : 'var(--radius)',
              }}>
                {msg.text.split('\n').map((line, idx) => (
                  <p key={idx} style={{ marginBottom: line.startsWith('•') ? '4px' : '8px' }}>{line}</p>
                ))}
                {msg.citations && msg.citations.length > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px dashed var(--border)', paddingTop: '4px' }}>
                    Sources: {msg.citations.join(', ')}
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div style={{
                alignSelf: 'flex-start',
                backgroundColor: 'var(--bg)',
                padding: '10px 14px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                display: 'flex',
                gap: '4px',
                alignItems: 'center'
              }}>
                <span className="dot" style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-muted)', borderRadius: '50%', display: 'inline-block', animation: 'blink 1.4s infinite' }}></span>
                <span className="dot" style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-muted)', borderRadius: '50%', display: 'inline-block', animation: 'blink 1.4s infinite 0.2s' }}></span>
                <span className="dot" style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-muted)', borderRadius: '50%', display: 'inline-block', animation: 'blink 1.4s infinite 0.4s' }}></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '12px', backgroundColor: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
            <button className="quick-action-btn" onClick={() => handleSend('What is the refund policy?')} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: '12px', cursor: 'pointer' }}>Refund Rules</button>
            <button className="quick-action-btn" onClick={() => handleSend('How do I track my order?')} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: '12px', cursor: 'pointer' }}>Order Tracking</button>
            <button className="quick-action-btn" onClick={() => handleSend('Can you recommend a restaurant?')} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: '12px', cursor: 'pointer' }}>Recommendations</button>
          </div>

          {/* Input field */}
          <div style={{ display: 'flex', padding: '12px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg)', gap: '8px' }}>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask support a question..."
              style={{ flexGrow: 1, border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px' }}
            />
            <button className="btn btn-primary btn-sm" onClick={() => handleSend()} style={{ padding: '8px 12px', borderRadius: '8px' }}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <div className="chatbot-btn" onClick={toggleChat} style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.4)' }}>
        {isOpen ? <ChevronDown size={24} /> : <MessageSquare size={24} />}
      </div>
      
      <style>{`
        @keyframes blink {
          0% { opacity: .2; }
          20% { opacity: 1; }
          100% { opacity: .2; }
        }
      `}</style>
    </div>
  );
}
