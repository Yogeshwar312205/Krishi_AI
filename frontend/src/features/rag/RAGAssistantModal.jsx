import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Send, Sparkles, X, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { sendRagQuestion } from '../../services/api';
import { useSpeech } from '../../shared/voice/useSpeech';

export default function RAGAssistantModal({ isOpen, onClose }) {
  const user = useAppStore((state) => state.user);
  const globalLang = useAppStore((state) => state.language) || 'en';
  const [currentLang, setCurrentLang] = useState(globalLang);

  const { isSupported, isListening, isSpeaking, listen, speak, stopSpeaking } = useSpeech(currentLang);

  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: `Hello ${user?.name || 'Farmer'}! I am KrishiFlow AI Sahayak 🌾. Ask me anything in English, Hindi (हिंदी), or Marathi (मराठी) via text or voice!`,
      sources: [],
      language: currentLang,
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
    "Give me list of previous trip details that i completed",
    "Which vehicles are available and their rates",
    "KrishiFlow मध्ये शेतकरी नफा कसा मोजतो?",
    "Pune APMC Onion Market Price"
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

      const detectedLang = response.language || currentLang;

      const assistantMsg = {
        sender: 'assistant',
        text: response.answer,
        sources: response.sources || [],
        retrieval: response.retrieval,
        language: detectedLang,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Automatically speak out response in the detected language (Marathi / Hindi / English)
      speak(response.answer, detectedLang);
    } catch (err) {
      setError(err.message || 'Failed to retrieve grounded answer.');
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `⚠️ Error: ${err.message || 'Could not connect to KrishiFlow AI Sahayak.'}`,
          sources: [],
          language: 'en',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleMic = () => {
    if (isListening) {
      listen(() => {});
      return;
    }
    listen((transcript) => {
      if (transcript) {
        setInputQuery(transcript);
        handleSend(transcript);
      }
    });
  };

  const handleClearHistory = () => {
    stopSpeaking();
    setMessages([
      {
        sender: 'assistant',
        text: `Chat history cleared. How can I help you with KrishiFlow today?`,
        sources: [],
        language: currentLang,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-emerald-950/95 text-emerald-50 border-l border-emerald-800/60 shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-emerald-800/80 bg-emerald-900/90 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-xl">
                🌾
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base tracking-wide text-white">KrishiFlow AI Sahayak</h3>
                  <span className="px-2 py-0.5 text-xs font-semibold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                    Voice + RAG
                  </span>
                </div>
                <p className="text-xs text-emerald-300/80 font-mono">
                  Role: <span className="font-semibold text-amber-300">{user?.role || 'Farmer'}</span>
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
                onClick={() => { stopSpeaking(); onClose(); }}
                className="p-1.5 text-emerald-300 hover:text-white text-lg font-bold transition"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Voice Language Selector */}
          <div className="flex items-center justify-between pt-1 border-t border-emerald-800/50 text-xs">
            <span className="text-emerald-300/80 font-semibold">Voice Language:</span>
            <div className="flex items-center space-x-1.5">
              {[
                { code: 'en', label: 'English' },
                { code: 'hi', label: 'हिंदी (Hindi)' },
                { code: 'mr', label: 'मराठी (Marathi)' }
              ].map((langObj) => (
                <button
                  key={langObj.code}
                  onClick={() => setCurrentLang(langObj.code)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                    currentLang === langObj.code
                      ? 'bg-amber-500 text-amber-950 font-bold shadow'
                      : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-800/60 border border-emerald-800'
                  }`}
                >
                  {langObj.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-2.5 bg-emerald-900/40 border-b border-emerald-800/40 overflow-x-auto flex gap-2 no-scrollbar">
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
                className={`max-w-[88%] p-3.5 rounded-lg text-sm leading-relaxed relative ${
                  msg.sender === 'user'
                    ? 'bg-amber-600 text-amber-50 rounded-br-none font-medium'
                    : 'bg-emerald-900/80 border border-emerald-700/60 text-emerald-100 rounded-bl-none'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="whitespace-pre-line flex-1">{msg.text}</p>
                  
                  {/* TTS Voice Replay Button for Assistant Messages */}
                  {msg.sender === 'assistant' && (
                    <button
                      onClick={() => speak(msg.text, msg.language || currentLang)}
                      title="Listen Voice Output"
                      className="p-1 rounded bg-emerald-800/80 hover:bg-emerald-700 text-amber-300 shrink-0 transition"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

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
              <span>Analyzing database & generating voice-ready response...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input & Voice Controls */}
        <div className="p-3 border-t border-emerald-800/80 bg-emerald-900/90 flex flex-col gap-2">
          {/* Active Speaking Indicator */}
          {isSpeaking && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-amber-400 animate-bounce" />
                <span>Speaking in <strong>{currentLang === 'mr' ? 'मराठी' : currentLang === 'hi' ? 'हिंदी' : 'English'}</strong>...</span>
              </div>
              <button
                onClick={stopSpeaking}
                className="px-2 py-0.5 bg-amber-500 text-amber-950 font-bold rounded text-[11px]"
              >
                Stop
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Multilingual Voice Input Mic Button */}
            {isSupported && (
              <button
                onClick={toggleMic}
                title={isListening ? "Listening... click to stop" : "Speak Voice Question"}
                className={`p-2.5 rounded border transition shrink-0 flex items-center justify-center ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse border-rose-400 shadow-lg'
                    : 'bg-emerald-800 hover:bg-emerald-700 text-amber-300 border-emerald-600'
                }`}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            )}

            {/* Text Input */}
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={
                isListening
                  ? "Listening in " + (currentLang === 'mr' ? 'मराठी...' : currentLang === 'hi' ? 'हिंदी...' : 'English...')
                  : "Ask or speak (English, Hindi, Marathi)..."
              }
              disabled={loading}
              className="flex-1 px-3.5 py-2.5 bg-emerald-950 text-emerald-100 placeholder-emerald-500/70 text-sm border border-emerald-700/60 rounded focus:outline-none focus:border-amber-400"
            />

            <button
              onClick={() => handleSend()}
              disabled={loading || !inputQuery.trim()}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-amber-950 font-bold text-sm rounded transition tracking-wide flex items-center gap-1 shrink-0"
            >
              <span>Ask</span>
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
