import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, X, Send, Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

const ChatWidget = () => {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hi! I'm your AI assistant. How can I help you with your schedule today?", sender: 'bot' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const quickChips = [
    "Plan my courses",
    "Find empty labs on Wednesday",
    "How do I book a room?",
    "Show my schedule"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async (text) => {
    const messageText = text || inputText;
    if (!messageText.trim()) return;

    // Add user message
    const userMsg = { id: Date.now(), text: messageText, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:8000/chat/message', 
        { query: messageText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const botMsg = { 
        id: Date.now() + 1, 
        text: response.data.response, 
        sender: 'bot' 
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg = { 
        id: Date.now() + 1, 
        text: "Sorry, I'm having trouble connecting right now. Please try again later.", 
        sender: 'bot',
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[380px] h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          {/* Header */}
          <div className="bg-indigo-600 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Sparkles className="h-5 w-5 text-yellow-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm">AI Assistant</h3>
                <p className="text-xs text-indigo-100 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm overflow-hidden ${
                    msg.sender === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : msg.isError 
                        ? 'bg-red-50 text-red-600 border border-red-100 rounded-bl-none'
                        : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  {msg.sender === 'bot' ? (
                    <div className="prose prose-sm max-w-none prose-indigo prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({node, ...props}) => (
                            <div className="overflow-x-auto my-2 rounded-lg border border-slate-200">
                              <table className="min-w-full divide-y divide-slate-200" {...props} />
                            </div>
                          ),
                          thead: ({node, ...props}) => <thead className="bg-slate-50" {...props} />,
                          th: ({node, ...props}) => <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider" {...props} />,
                          td: ({node, ...props}) => <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 border-t border-slate-100" {...props} />,
                          p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                          li: ({node, ...props}) => <li className="pl-1" {...props} />,
                          a: ({node, ...props}) => <a className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-slate-200 shadow-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  <span className="text-xs text-slate-500">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Chips */}
          {messages.length < 3 && (
            <div className="px-4 py-2 bg-slate-50 flex gap-2 overflow-x-auto no-scrollbar">
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  className="whitespace-nowrap px-3 py-1.5 bg-white border border-indigo-100 text-indigo-600 text-xs font-medium rounded-full hover:bg-indigo-50 transition-colors shadow-sm"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-700 placeholder-slate-400 outline-none"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105 ${
          isOpen 
            ? 'bg-slate-800 text-white rotate-90' 
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>
    </div>
  );
};

export default ChatWidget;
