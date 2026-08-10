import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  X, 
  Bot, 
  Send, 
  ArrowRight,
  TrendingUp,
  Truck
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const KisanVoiceBot = () => {
  const { cropDetails, setActiveTab, language } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'bot',
      text: 'Namaste Farmer! I am KisanVoice AI. Ask me market rates in Hindi, Marathi, or English!',
      time: 'Just Now'
    }
  ]);

  // Handle Speech Recognition setup
  useEffect(() => {
    let recognition = null;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQueryText(transcript);
        handleSendQuery(transcript);
      };
    }
  }, [language]);

  const toggleListen = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is supported in Chrome & Edge browsers. You can also type your question below!');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQueryText(transcript);
      handleSendQuery(transcript);
    };
    recognition.start();
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop prior speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendQuery = (textToProcess) => {
    const text = textToProcess || queryText;
    if (!text.trim()) return;

    const userMsg = { sender: 'user', text, time: 'Just Now' };
    setChatHistory((prev) => [...prev, userMsg]);
    setQueryText('');

    // AI Intent Parsing Logic
    setTimeout(() => {
      const lower = text.toLowerCase();
      let botReply = '';

      if (lower.includes('rate') || lower.includes('price') || lower.includes('भाव') || lower.includes('दाम')) {
        botReply = `Today's ${cropDetails.cropType || 'Tomato'} rate at Vashi Wholesale APMC is ₹48 per kg, which is ₹10 higher than Nashik local mandi!`;
      } else if (lower.includes('truck') || lower.includes('book') || lower.includes('वाहन') || lower.includes('गाडी')) {
        botReply = 'I am opening the Cold-Chain Truck Dispatching menu for you right now.';
        setActiveTab('bookings');
      } else if (lower.includes('hold') || lower.includes('sell') || lower.includes('साठवणूक')) {
        botReply = 'Agmarknet AI advises holding your harvest for 4 days. Prices in Vashi are expected to peak at ₹52/kg!';
      } else {
        botReply = `According to KrishiFlow AI, selling your harvest in Vashi APMC yields an extra net profit of ₹25,000 after transport costs!`;
      }

      setChatHistory((prev) => [...prev, { sender: 'bot', text: botReply, time: 'Just Now' }]);
      speakText(botReply);
    }, 600);
  };

  return (
    <>
      {/* Floating Trigger Mic Button at bottom-right */}
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
                <p className="text-[10px] text-emerald-300 font-semibold">Voice Assistant • EN / HI / MR</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
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
                  className={`max-w-[85%] p-3 rounded-2xl shadow-2xs ${
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
          </div>

          {/* Controls & Input */}
          <div className="p-3 bg-white border-t border-slate-100 space-y-2">
            {/* Quick Speech Trigger */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleListen}
                className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md'
                    : 'bg-forest-50 hover:bg-forest-100 text-forest-900 border border-forest-200'
                }`}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-emerald-600" />}
                <span>{isListening ? 'Listening...' : 'Tap & Speak Voice Query'}</span>
              </button>

              {isSpeaking && (
                <button
                  onClick={() => window.speechSynthesis.cancel()}
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
                placeholder="Or type here (e.g. Tomato price in Vashi)..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-forest-500"
              />
              <button
                onClick={() => handleSendQuery()}
                className="h-9 w-9 rounded-xl bg-forest-700 hover:bg-forest-800 text-white flex items-center justify-center shrink-0 shadow-md"
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
