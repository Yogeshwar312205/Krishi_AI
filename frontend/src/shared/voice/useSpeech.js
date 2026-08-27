import { useCallback, useEffect, useRef, useState } from 'react';
import { SPEECH_LOCALES } from './intents';

const getRecognitionCtor = () =>
  typeof window === 'undefined'
    ? null
    : window.SpeechRecognition || window.webkitSpeechRecognition || null;

/**
 * Wraps the Web Speech APIs for listening and speaking.
 *
 * Fixes three real bugs in the previous implementation:
 *
 *   1. It built a SpeechRecognition instance inside an effect, wired handlers
 *      to it, and then never started it or tore it down — so every language
 *      change leaked another live recogniser while the button silently built a
 *      second one.
 *   2. Utterances were spoken with no `lang` set, so the browser read Hindi and
 *      Marathi replies with an English voice. That is not a cosmetic problem:
 *      Devanagari through an en-US voice is unintelligible.
 *   3. `isListening` was set optimistically and could stick on when recognition
 *      aborted, leaving a permanent "Listening…" state and no way back.
 */
export const useSpeech = (lang) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);

  const isSupported = Boolean(getRecognitionCtor());
  const locale = SPEECH_LOCALES[lang] || SPEECH_LOCALES.en;

  // One recogniser, torn down on unmount and rebuilt when the language changes.
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
    // Both end and error must clear the flag, or the UI sticks on "Listening…".
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      // start() throws if called while already running; treat as a no-op.
      setIsListening(false);
    }
  }, [isListening]);

  const speak = useCallback((text, langOverride) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;

    const targetLang = langOverride || lang || 'en';
    const targetLocale = SPEECH_LOCALES[targetLang] || targetLang || 'en-IN';

    window.speechSynthesis.cancel();

    // Clean markdown characters before sending to SpeechSynthesisUtterance
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/###?\s*/g, '')
      .replace(/[-•]\s*/g, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Clean links
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = targetLocale;
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();

    let selectedVoice = null;
    if (targetLang === 'en' || targetLocale === 'en-IN') {
      // Prioritize Indian English Accent voices (en-IN)
      selectedVoice =
        voices.find((v) => v.lang === 'en-IN') ||
        voices.find((v) => v.lang.startsWith('en') && (v.name.toLowerCase().includes('india') || v.name.includes('Heera') || v.name.includes('Ravi') || v.name.includes('Rishi') || v.name.includes('Neerja'))) ||
        voices.find((v) => v.lang.startsWith('en'));
    } else if (targetLang === 'hi' || targetLocale === 'hi-IN') {
      selectedVoice =
        voices.find((v) => v.lang === 'hi-IN') ||
        voices.find((v) => v.lang.startsWith('hi')) ||
        voices.find((v) => v.lang === 'en-IN');
    } else if (targetLang === 'mr' || targetLocale === 'mr-IN') {
      selectedVoice =
        voices.find((v) => v.lang === 'mr-IN' || v.lang.startsWith('mr')) ||
        voices.find((v) => v.lang === 'hi-IN' || v.lang.startsWith('hi')) ||
        voices.find((v) => v.lang === 'en-IN');
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang || targetLocale;
    } else {
      utterance.lang = targetLocale;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [lang]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // Never leave speech running after the component goes away.
  useEffect(() => () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { isSupported, isListening, isSpeaking, listen, speak, stopSpeaking };
};

export default useSpeech;
