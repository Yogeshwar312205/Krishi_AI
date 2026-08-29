import { useCallback, useEffect, useRef, useState } from 'react';
import { SPEECH_LOCALES } from './intents';

const getRecognitionCtor = () =>
  typeof window === 'undefined'
    ? null
    : window.SpeechRecognition || window.webkitSpeechRecognition || null;

const hasSynth = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * The voice list loads asynchronously in Chrome — the first `getVoices()` after
 * a page load is usually empty, and speaking then falls back to a default en-US
 * voice that reads Devanagari as gibberish. Resolve once voices are actually
 * available (event, or a short poll for the browsers that never fire it).
 */
const voicesReady = () => new Promise((resolve) => {
  if (!hasSynth()) return resolve([]);
  const now = window.speechSynthesis.getVoices();
  if (now.length) return resolve(now);

  let settled = false;
  const done = () => {
    if (settled) return;
    settled = true;
    window.speechSynthesis.onvoiceschanged = null;
    clearInterval(poll);
    resolve(window.speechSynthesis.getVoices());
  };
  window.speechSynthesis.onvoiceschanged = done;
  const poll = setInterval(() => {
    if (window.speechSynthesis.getVoices().length) done();
  }, 200);
  setTimeout(done, 2000); // give up and use whatever we have
});

/** Strip markdown and emoji so TTS doesn't read "hash hash", "asterisk" or "seedling". */
const forSpeech = (text) => String(text || '')
  .replace(/`{1,3}[^`]*`{1,3}/g, ' ')          // code spans
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')        // images
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')      // links -> label
  .replace(/^\s{0,3}#{1,6}\s+/gm, '')           // headings
  .replace(/^\s{0,3}([-*_])\1{2,}\s*$/gm, '')   // hr
  .replace(/^\s*[-*•]\s+/gm, '')                // bullet markers
  .replace(/^\s*\d+[.)]\s+/gm, '')              // ordered markers
  .replace(/(\*\*|__)(.*?)\1/g, '$2')           // bold
  .replace(/(\*|_)(?=\S)(.*?)(?<=\S)\1/g, '$2') // italic
  .replace(/^\s*>\s?/gm, '')                    // blockquote
  .replace(/\|/g, ' ')                          // table pipes
  .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/gu, '') // emoji/symbols
  .replace(/[ \t]{2,}/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

/** Break a long answer into speakable chunks — Chrome cuts an utterance off
 *  after ~15 s, and per-sentence utterances also let "Stop" feel instant. */
const chunkForSpeech = (text) => {
  const out = [];
  for (const para of text.split(/\n{2,}/)) {
    const sentences = para.split(/(?<=[.!?।])\s+|\n/);
    let buf = '';
    for (const s of sentences) {
      if ((buf + ' ' + s).trim().length > 220 && buf) { out.push(buf.trim()); buf = s; }
      else buf = buf ? `${buf} ${s}` : s;
    }
    if (buf.trim()) out.push(buf.trim());
  }
  return out.filter(Boolean);
};

const pickVoice = (voices, targetLang, targetLocale) => {
  if (!voices.length) return null;
  const byExact = (lc) => voices.find((v) => v.lang === lc);
  const byPrefix = (p) => voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(p));
  if (targetLang === 'mr') {
    return byExact('mr-IN') || byPrefix('mr') || byExact('hi-IN') || byPrefix('hi') || byExact('en-IN') || byPrefix('en');
  }
  if (targetLang === 'hi') {
    return byExact('hi-IN') || byPrefix('hi') || byExact('en-IN') || byPrefix('en');
  }
  // English — prefer an Indian-English voice
  return byExact('en-IN')
    || voices.find((v) => v.lang && v.lang.startsWith('en') && /india|heera|ravi|rishi|neerja|prabhat/i.test(v.name))
    || byPrefix('en')
    || voices[0];
};

/**
 * Wraps the Web Speech APIs for listening and speaking.
 *
 * Speaking is now: markdown/emoji stripped, split into sentence-sized chunks and
 * queued (Chrome truncates a single long utterance), with the right Indian voice
 * chosen once the async voice list has actually loaded, and a keep-alive so the
 * queue doesn't stall mid-answer.
 */
export const useSpeech = (lang) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const keepAliveRef = useRef(null);
  const speakSeq = useRef(0); // bumped on every new speak()/stop() to cancel a queue in flight

  const isSupported = Boolean(getRecognitionCtor());
  const locale = SPEECH_LOCALES[lang] || SPEECH_LOCALES.en;

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return undefined;

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = locale;
    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      try { recognition.abort(); } catch { /* already stopped */ }
      recognitionRef.current = null;
    };
  }, [locale]);

  const listen = useCallback((onTranscript) => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      try { recognition.stop(); } catch { /* not running */ }
      setIsListening(false);
      return;
    }

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      if (transcript) onTranscript(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, [isListening]);

  const clearKeepAlive = () => {
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
  };

  const stopSpeaking = useCallback(() => {
    speakSeq.current += 1;
    clearKeepAlive();
    if (hasSynth()) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text, langOverride) => {
    if (!hasSynth()) return;

    const targetLang = langOverride || lang || 'en';
    const targetLocale = SPEECH_LOCALES[targetLang] || targetLang || 'en-IN';

    const clean = forSpeech(text);
    if (!clean) return;

    // Cancel anything already queued and mark this call as the current one.
    const seq = (speakSeq.current += 1);
    window.speechSynthesis.cancel();
    clearKeepAlive();

    const voices = await voicesReady();
    if (seq !== speakSeq.current) return; // a newer speak()/stop() won while we waited
    const voice = pickVoice(voices, targetLang, targetLocale);

    const chunks = chunkForSpeech(clean);
    if (!chunks.length) return;

    setIsSpeaking(true);
    // Chrome pauses the queue after ~15 s of speech; nudge it.
    keepAliveRef.current = setInterval(() => {
      if (hasSynth() && window.speechSynthesis.speaking) window.speechSynthesis.resume();
    }, 8000);

    chunks.forEach((part, idx) => {
      const u = new SpeechSynthesisUtterance(part);
      u.lang = voice?.lang || targetLocale;
      if (voice) u.voice = voice;
      u.rate = 0.95;
      u.pitch = 1;
      if (idx === chunks.length - 1) {
        u.onend = () => { if (seq === speakSeq.current) { clearKeepAlive(); setIsSpeaking(false); } };
        u.onerror = u.onend;
      }
      window.speechSynthesis.speak(u);
    });
  }, [lang]);

  useEffect(() => () => {
    clearKeepAlive();
    if (hasSynth()) window.speechSynthesis.cancel();
  }, []);

  return { isSupported, isListening, isSpeaking, listen, speak, stopSpeaking };
};

export default useSpeech;
