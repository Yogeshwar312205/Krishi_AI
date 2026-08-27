import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  X, 
  Bot, 
  Send
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { sendRagQuestion } from '../services/api';
import { useSpeech } from '../shared/voice/useSpeech';

export const KisanVoiceBot = () => {
  const language = useAppStore((state) => state.language) || 'en';
  const [isOpen, setIsOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [loading, setLoading] = useState(false);

  const { isSupported, isListening, isSpeaking, listen, speak, stopSpeaking } = useSpeech(language);

  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'bot',
      text: 'Namaste Farmer! I am KisanVoice AI 🌾. Ask me market rates, trips, or vehicle availability in Hindi, Marathi, or English!',
      time: 'Just Now'
    }
  ]);

  const toggleListen = () => {
    if (isListening) {
      listen(() => {});
      return;
    }
    listen((transcript) => {
      if (transcript) {
        setQueryText(transcript);
        handleSendQuery(transcript);
      }
    });
  };

  const handleSendQuery = async (textToProcess) => {
    const text = textToProcess || queryText;
    if (!text.trim() || loading) return;

    const userMsg = { sender: 'user', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatHistory((prev) => [...prev, userMsg]);
    setQueryText('');
    setLoading(true);

    try {
      const response = await sendRagQuestion(text);
      const botReply = response.answer || "I'm sorry, I couldn't find an answer to your query.";
      const detectedLang = response.language || language;

      setChatHistory((prev) => [...prev, { 
        sender: 'bot', 
        text: botReply, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);

      // Speak response aloud in detected language (Marathi / Hindi / English)
      speak(botReply, detectedLang);
    } catch (err) {
      setChatHistory((prev) => [...prev, { 
        sender: 'bot', 
        text: `⚠️ Could not reach KrishiFlow AI: ${err.message}`, 
        time: 'Just Now' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Bot Button at bottom-right */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative group h-14 w-14 rounded-full bg-gradient-to-r from-forest-700 via-forest-800 to-emerald-700 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-emerald-400"
        >
          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 animate-ping" />
          <Bot className="h-7 w-7 text-white" />
        </button>
      </div>

      {/* Voice Assistant Modal Popup */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-full max-w-sm bg-white rounded-3xl border border-forest-100 shadow-2xl overflow-hidden flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-forest-900 via-forest-800 to-emerald-950 p-4 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-black tracking-tight">Kisan Voice AI Bot</h4>
                <p className="text-[10px] text-emerald-300 font-semibold">Voice Input & Output • EN / HI / MR</p>
              </div>
            </div>

            <button
              onClick={() => { stopSpeaking(); setIsOpen(false); }}
              className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat Messages Log */}
          <div className="p-4 h-72 overflow-y-auto space-y-3 bg-slate-50 text-xs font-semibold">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl shadow-2xs whitespace-pre-line ${
                    msg.sender === 'user'
                      ? 'bg-forest-700 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.time}</span>
              </div>
            ))}
            {loading && (
              <div className="text-[11px] text-emerald-600 font-medium animate-pulse flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 animate-spin text-amber-500" />
                <span>Generating voice answer...</span>
              </div>
            )}
          </div>

          {/* Controls & Input */}
          <div className="p-3 bg-white border-t border-slate-100 space-y-2">
            {/* Quick Speech Trigger */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleListen}
                disabled={loading}
                className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md'
                    : 'bg-forest-50 hover:bg-forest-100 text-forest-900 border border-forest-200'
                }`}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-emerald-600" />}
                <span>{isListening ? 'Listening (Speak now)...' : 'Tap & Speak Voice Query'}</span>
              </button>

              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0"
                  title="Stop speaking"
                >
                  <Volume2 className="h-4 w-4 animate-bounce" />
                </button>
              )}
            </div>

            {/* Manual Text Input Fallback */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
                placeholder="Or type query in Hindi, Marathi, English..."
                disabled={loading}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-forest-500"
              />
              <button
                onClick={() => handleSendQuery()}
                disabled={loading || !queryText.trim()}
                className="h-9 w-9 rounded-xl bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-white flex items-center justify-center shrink-0 shadow-md"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>
      )}
    </>
  );
};

export default KisanVoiceBot;
