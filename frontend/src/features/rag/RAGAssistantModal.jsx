import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { sendRagQuestion } from '../../services/api';

export default function RAGAssistantModal({ isOpen, onClose }) {
  const user = useAppStore((state) => state.user);
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: `Hello ${user?.name || 'Farmer'}! I am KrishiFlow AI Sahayak 🌾, your verified agricultural knowledge assistant. Ask me anything about crop profit calculations, mandi deals, VRP fleet dispatch, or platform features.`,
      sources: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const quickQuestions = [
    "How does KrishiFlow calculate net profit?",
    "How does VRP vehicle insertion work?",
    "What is the difference between board rate and agreed rate?",
    "KrishiFlow मध्ये शेतकरी नफा कसा मोजतो?",
    "KrishiFlow profit की गणना कैसे करता है?"
  ];

  const handleSend = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setLoading(true);
    setError(null);

    try {
      const response = await sendRagQuestion(textToSend);

      const assistantMsg = {
        sender: 'assistant',
        text: response.answer,
        sources: response.sources || [],
        retrieval: response.retrieval,
        language: response.language,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err.message || 'Failed to retrieve grounded answer.');
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `⚠️ Error: ${err.message || 'Could not connect to KrishiFlow AI Sahayak.'}`,
          sources: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        sender: 'assistant',
        text: `Chat history cleared. How can I help you with KrishiFlow today?`,
        sources: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-emerald-950/95 text-emerald-50 border-l border-emerald-800/60 shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-emerald-800/80 bg-emerald-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-xl">
              🌾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-wide text-white">KrishiFlow AI Sahayak</h3>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
                  RAG Agent
                </span>
              </div>
              <p className="text-xs text-emerald-300/80 font-mono">
                Authenticated Role: <span className="font-semibold text-amber-300">{user?.role || 'Farmer'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleClearHistory}
              title="Clear Chat History"
              className="p-1.5 text-xs text-emerald-300/70 hover:text-white hover:bg-emerald-800/60 rounded transition"
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-emerald-300 hover:text-white text-lg font-bold transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 bg-emerald-900/40 border-b border-emerald-800/40 overflow-x-auto flex gap-2 no-scrollbar">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={loading}
              className="whitespace-nowrap text-xs px-2.5 py-1 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60 rounded transition text-left"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 font-sans text-sm">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] p-3.5 rounded-lg text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-amber-600 text-amber-50 rounded-br-none font-medium'
                    : 'bg-emerald-900/80 border border-emerald-700/60 text-emerald-100 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>

                {/* Sources Section */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-emerald-700/50">
                    <p className="text-xs uppercase tracking-wider font-semibold text-amber-300 mb-1.5">
                      Verified Sources ({msg.sources.length}):
                    </p>
                    <div className="space-y-1.5">
                      {msg.sources.map((src, sIdx) => (
                        <div
                          key={sIdx}
                          className="text-xs bg-emerald-950/70 p-2 rounded border border-emerald-800/80 text-emerald-200"
                        >
                          <div className="font-semibold text-emerald-300">
                            {src.title} — <span className="text-emerald-400 font-normal">{src.section}</span>
                          </div>
                          {src.snippet && (
                            <p className="text-[11px] text-emerald-400/80 mt-0.5 line-clamp-2">
                              "{src.snippet}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-1 text-[10px] opacity-60 text-right">
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-emerald-400 text-xs py-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></div>
              <span>Searching KrishiFlow Knowledge Base & Generating Grounded Answer...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-emerald-800/80 bg-emerald-900/90 flex items-center gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask AI Sahayak (English, Hindi, Marathi)..."
            disabled={loading}
            className="flex-1 px-3.5 py-2.5 bg-emerald-950 text-emerald-100 placeholder-emerald-500/70 text-sm border border-emerald-700/60 rounded focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !inputQuery.trim()}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-amber-950 font-bold text-sm rounded transition tracking-wide flex items-center gap-1"
          >
            <span>Ask</span>
            <span>➔</span>
          </button>
        </div>
      </div>
    </div>
  );
}
