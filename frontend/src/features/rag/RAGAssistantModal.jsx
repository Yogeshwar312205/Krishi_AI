import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Mic, MicOff, Volume2, Send, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/useT';
import { translate } from '../../i18n';
import { sendRagQuestion } from '../../services/api';
import { useSpeech } from '../../shared/voice/useSpeech';
import { normaliseRole, ROLES } from '../../app/routes';
import { Markdown } from './Markdown';

/**
 * AI Sahayak — the one assistant.
 *
 * Rate-board language: square corners, ruled rows, ink on paper, no shadows or
 * gradients, motion through the shared keyframe classes only.
 *
 * The in-drawer language toggle is the single language control for the
 * assistant: it pins the reply language on the backend, drives speech in/out,
 * AND localises the assistant's own copy (greeting, chips, placeholders) —
 * independent of the app-wide language picker.
 *
 * Backend answers come as markdown; `<Markdown>` renders the subset Gemini
 * emits (headings, bold, lists, rules).
 */

const ROLE_KEYS = {
  [ROLES.FARMER]: 'roles.farmer',
  [ROLES.BUYER]: 'roles.buyer',
  [ROLES.LOGISTICS]: 'roles.logistics',
};

const LANGS = [
  { code: 'en', key: 'lang.en' },
  { code: 'hi', key: 'lang.hi' },
  { code: 'mr', key: 'lang.mr' },
];

const QUICK_KEYS = ['assistant.q.rate', 'assistant.q.spoil', 'assistant.q.sell', 'assistant.q.vehicles'];

export default function RAGAssistantModal({ isOpen, onClose }) {
  const user = useAppStore((state) => state.user);
  const globalLang = useAppStore((state) => state.language) || 'en';
  const { t } = useT();

  // The assistant's language. Starts from the app language; the toggle overrides
  // it for everything below without touching the app-wide picker.
  const [lang, setLang] = useState(globalLang);
  const { isSupported, isListening, isSpeaking, listen, speak, stopSpeaking } = useSpeech(lang);

  /** Assistant-scoped translate — always in the drawer's chosen language. */
  const at = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  const roleLabel = t(ROLE_KEYS[normaliseRole(user?.role)] || 'roles.farmer');

  const greetingMsg = useCallback((textKey = 'assistant.greeting') => ({
    sender: 'assistant',
    text: translate(lang, textKey),
    sources: [],
    greeting: true,
    at: new Date(),
  }), [lang]);

  const [messages, setMessages] = useState(() => [greetingMsg()]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const feedRef = useRef(null);

  // Follow the app language until the user picks inside the drawer.
  useEffect(() => { setLang(globalLang); }, [globalLang]);

  // Re-render the opening line in the newly chosen language (only while the feed
  // is still just that line — never rewrite a real conversation).
  useEffect(() => {
    setMessages((prev) => (
      prev.length === 1 && prev[0].greeting ? [greetingMsg()] : prev
    ));
  }, [lang, greetingMsg]);

  useEffect(() => {
    if (isOpen) feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { stopSpeaking(); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, stopSpeaking]);

  const time = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { sender: 'user', text: q, at: new Date() }]);
    if (text === undefined) setInput('');
    setLoading(true);

    try {
      const res = await sendRagQuestion(q, null, lang);
      const answerLang = res.language || lang;
      setMessages((prev) => [...prev, {
        sender: 'assistant',
        text: res.answer,
        sources: res.sources || [],
        lang: answerLang,
        at: new Date(),
      }]);
      speak(res.answer, answerLang);
    } catch (err) {
      setMessages((prev) => [...prev, {
        sender: 'assistant',
        text: err.message || at('assistant.error'),
        sources: [],
        isError: true,
        at: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleMic = () => {
    if (isListening) { listen(() => {}); return; }
    listen((transcript) => { if (transcript) { setInput(transcript); send(transcript); } });
  };

  const clear = () => {
    stopSpeaking();
    setMessages([greetingMsg('assistant.cleared')]);
  };

  const quick = useMemo(() => QUICK_KEYS.map((k) => translate(lang, k)), [lang]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/40"
      onClick={() => { stopSpeaking(); onClose(); }}
    >
      <div
        role="dialog"
        aria-label={at('assistant.title')}
        lang={lang}
        className="detail-enter flex h-full w-full max-w-md flex-col border-l-2 border-ink bg-paper"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ---- Header ---- */}
        <div className="border-b-2 border-ink bg-white px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-xl leading-none text-ink">{at('assistant.title')}</p>
              <p className="mt-1 text-sm text-ink-faint">{at('assistant.role', { role: roleLabel })}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={clear}
                className="border-2 border-rule px-2 py-1 text-xs font-bold text-ink-soft hover:border-ink hover:text-ink"
              >
                {at('assistant.clear')}
              </button>
              <button
                type="button"
                onClick={() => { stopSpeaking(); onClose(); }}
                aria-label={at('assistant.close')}
                className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-white text-ink hover:bg-forest-50"
              >
                <X className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Language — controls replies, speech, and this drawer's own copy */}
          <div className="mt-3 flex items-center gap-2 border-t-2 border-rule pt-2.5">
            <span className="eyebrow shrink-0">{at('assistant.lang')}</span>
            <div className="flex gap-1.5">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  aria-pressed={lang === l.code}
                  className={`border-2 px-2 py-0.5 text-xs font-bold transition-colors ${
                    lang === l.code
                      ? 'border-forest-700 bg-forest-700 text-white'
                      : 'border-rule text-ink-soft hover:border-ink'
                  }`}
                >
                  {translate(l.code, l.key)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ---- Quick questions ---- */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-b-2 border-rule bg-white px-4 py-2">
          {quick.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => send(q)}
              disabled={loading}
              className="shrink-0 border-2 border-rule px-2.5 py-1 text-xs font-semibold text-ink-soft hover:border-ink hover:text-ink disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* ---- Feed ---- */}
        <div ref={feedRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[92%] border-2 px-3 py-2.5 text-sm ${
                  m.sender === 'user'
                    ? 'border-forest-700 bg-forest-700 text-white'
                    : m.isError
                      ? 'border-terracotta-700 bg-terracotta-50 text-ink'
                      : 'border-ink bg-white text-ink'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    {m.sender === 'assistant' && !m.isError
                      ? <Markdown text={m.text} />
                      : <p className="whitespace-pre-line leading-relaxed">{m.text}</p>}
                  </div>
                  {m.sender === 'assistant' && !m.isError && (
                    <button
                      type="button"
                      onClick={() => speak(m.text, m.lang || lang)}
                      aria-label={at('assistant.replay')}
                      className="shrink-0 border-2 border-rule p-1 text-ink-soft hover:border-ink hover:text-ink"
                    >
                      <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                {m.sources?.length > 0 && (
                  <div className="mt-2.5 border-t-2 border-rule pt-2">
                    <p className="eyebrow mb-1.5">{at('assistant.sources', { count: m.sources.length })}</p>
                    <ul className="space-y-1.5">
                      {m.sources.map((s, si) => (
                        <li key={si} className="border-l-4 border-forest-700 bg-paper px-2 py-1 text-xs text-ink-soft">
                          <span className="font-bold text-ink">{s.title}</span>
                          {s.section ? ` — ${s.section}` : ''}
                          {s.snippet && <span className="mt-0.5 block text-ink-faint">{s.snippet}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className={`mt-1 text-right text-[10px] ${m.sender === 'user' ? 'text-forest-100' : 'text-ink-faint'}`}>
                  {time(m.at)}
                </p>
              </div>
            </div>
          ))}

          {loading && <p className="text-sm text-ink-faint">{at('assistant.thinking')}</p>}
        </div>

        {/* ---- Input ---- */}
        <div className="border-t-2 border-ink bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {isSpeaking && (
            <div className="mb-2 flex items-center justify-between border-2 border-turmeric-300 bg-turmeric-50 px-2.5 py-1.5 text-xs font-semibold text-ink">
              <span className="flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                {at('assistant.speaking')}
              </span>
              <button type="button" onClick={stopSpeaking} className="border-2 border-ink bg-white px-2 py-0.5 font-bold">
                {at('assistant.stop')}
              </button>
            </div>
          )}

          {!isSupported && <p className="mb-2 text-xs text-ink-faint">{at('assistant.micUnsupported')}</p>}

          <div className="flex items-center gap-2">
            {isSupported && (
              <button
                type="button"
                onClick={toggleMic}
                aria-label={isListening ? at('assistant.stop') : at('assistant.mic')}
                className={`flex h-11 w-11 shrink-0 items-center justify-center border-2 transition-colors ${
                  isListening
                    ? 'border-terracotta-700 bg-terracotta-600 text-white'
                    : 'border-ink bg-white text-ink hover:bg-forest-50'
                }`}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            )}

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={isListening ? at('assistant.listening') : at('assistant.placeholder')}
              disabled={loading}
              className="h-11 flex-1 border-2 border-ink bg-white px-3 text-sm text-ink placeholder:text-ink-faint disabled:opacity-60"
            />

            <button
              type="button"
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="flex h-11 shrink-0 items-center gap-1.5 border-2 border-ink bg-forest-700 px-3 text-sm font-bold text-white hover:bg-forest-800 disabled:opacity-50"
            >
              <span>{at('assistant.send')}</span>
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
