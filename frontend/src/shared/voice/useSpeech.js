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

  const speak = useCallback((text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;   // the fix that makes Hindi and Marathi audible
    utterance.rate = 0.95;     // a touch slower than default — this is advice, not chatter

    /*
     * Marathi TTS voices are not installed on many devices. Falling back to a
     * Hindi voice is the right failure: the two share Devanagari and enough
     * phonology to stay understandable, whereas an English voice reading
     * Devanagari is noise.
     */
    const voices = window.speechSynthesis.getVoices();
    const exact = voices.find((v) => v.lang === locale);
    const fallback = locale === 'mr-IN' ? voices.find((v) => v.lang === 'hi-IN') : null;
    if (exact || fallback) utterance.voice = exact || fallback;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [locale]);

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
