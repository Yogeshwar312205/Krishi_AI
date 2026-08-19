import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, X, Send, MessageCircleQuestion } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/useT';
import { buildVerdict } from '../../data/demoMarket';
import { matchIntent } from './intents';
import { useSpeech } from './useSpeech';
import { DemoStamp } from '../../design/primitives/DemoStamp';

/**
 * Voice command layer.
 *
 * This is the single most farmer-appropriate feature in the product: for a user
 * with variable literacy, speech beats every icon we could design. So it does
 * not just chat — it drives the interface. An intent can navigate, and the
 * answer is both shown and spoken, so a farmer who cannot read the reply still
 * receives it.
 *
 * Two things it deliberately does not do:
 *   - It does not call an LLM. Matching is local keyword matching, so it
 *     answers instantly and works with no signal. See intents.js.
 *   - It does not invent numbers. Every figure it speaks comes from the same
 *     demo module the screens read, so the assistant can never quote a rate
 *     that contradicts what is on screen — which is exactly what the previous
 *     version did, with "₹48" and "₹25,000" hardcoded into its replies.
 */
export const VoiceAssistant = () => {
  const cropDetails = useAppStore((state) => state.cropDetails);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const { t, lang, rate } = useT();
  const { isSupported, isListening, isSpeaking, listen, speak, stopSpeaking } = useSpeech(lang);

  const [isOpen, setIsOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [turns, setTurns] = useState([]);
  const logRef = useRef(null);
  const panelRef = useRef(null);

  // Keep the newest turn in view without scrolling the page behind the panel.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [turns]);

  // Escape closes, and focus moves into the panel when it opens.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  /** Resolves a transcript to a spoken answer, and performs any navigation. */
  const respond = (transcript) => {
    const intent = matchIntent(transcript);
    const { best, action } = buildVerdict(cropDetails.cropType, cropDetails.quantityKg);
    const cropName = t(`crops.${cropDetails.cropType}`);

    let reply;

    switch (intent) {
      case 'rate':
        reply = t('voice.answer.rate', {
          crop: cropName,
          rate: rate(best.ratePerKg),
          mandi: best.name,
        });
        setActiveTab('price');
        break;

      case 'verdict':
        // Speak the decision and the reason, the same pairing the slab shows.
        reply = action === 'wait'
          ? `${t('today.hold')}. ${t('today.holdWhy')}`
          : `${t('today.sell')}. ${t('today.sellWhy')}`;
        setActiveTab('today');
        break;

      case 'book':
        reply = t('voice.answer.opening', { screen: t('nav.farmer.transport') });
        setActiveTab('transport');
        break;

      case 'bookings':
        reply = t('voice.answer.opening', { screen: t('transport.bookings.title') });
        setActiveTab('transport');
        break;

      case 'crop':
        reply = t('voice.answer.opening', { screen: t('nav.farmer.crop') });
        setActiveTab('crop');
        break;

      default:
        reply = t('voice.notUnderstood');
    }

    setTurns((prev) => [...prev, { from: 'user', text: transcript }, { from: 'bot', text: reply }]);
    speak(reply);
  };

  const submitTyped = () => {
    const text = typed.trim();
    if (!text) return;
    setTyped('');
    respond(text);
  };

  return (
    <>
      {/*
        Trigger. Square like everything else, and labelled — an unlabelled mic
        icon is exactly the kind of thing a first-time user does not tap.
        Sits above the bottom nav on phones.
      */}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="
          lift fixed bottom-[5.5rem] right-4 z-50 flex items-center gap-2
          border-2 border-ink bg-turmeric-300 px-4 py-3 text-ink
          md:bottom-6 md:right-6
        "
      >
        <Mic className="h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
        <span className="text-sm font-bold">{t('voice.open')}</span>
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="false"
          aria-label={t('voice.title')}
          className="
            slab-enter fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col
            border-t-2 border-ink bg-white
            sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-h-[32rem] sm:w-[24rem] sm:border-2
          "
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b-2 border-ink bg-forest-700 px-4 py-3 text-white">
            <div className="min-w-0">
              <h2 className="font-display text-xl leading-none">{t('voice.title')}</h2>
              <p className="mt-1 text-xs text-forest-100">{t('voice.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => { stopSpeaking(); setIsOpen(false); }}
              aria-label={t('voice.close')}
              className="shrink-0 border-2 border-white/40 p-1.5 hover:bg-white/15"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* Conversation, or the prompts that teach what to say */}
          <div ref={logRef} className="flex-1 space-y-3 overflow-y-auto bg-paper p-4">
            {turns.length === 0 ? (
              <div className="space-y-2">
                <p className="eyebrow">{t('voice.tryAsking')}</p>
                {['voice.example1', 'voice.example2', 'voice.example3'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => respond(t(key))}
                    className="lift flex w-full items-center gap-2 border border-rule bg-white px-3 py-2.5 text-left text-sm font-semibold text-ink"
                  >
                    <MessageCircleQuestion className="h-4 w-4 shrink-0 text-forest-600" aria-hidden="true" />
                    {t(key)}
                  </button>
                ))}
              </div>
            ) : (
              turns.map((turn, index) => (
                <div key={index} className={turn.from === 'user' ? 'flex justify-end' : ''}>
                  <p
                    className={`max-w-[85%] px-3 py-2 text-sm leading-snug ${
                      turn.from === 'user'
                        ? 'bg-forest-700 font-semibold text-white'
                        : 'border border-rule bg-white text-ink'
                    }`}
                  >
                    {turn.text}
                  </p>
                </div>
              ))
            )}

            {turns.length > 0 && <DemoStamp />}
          </div>

          {/* Controls */}
          <div className="space-y-2 border-t-2 border-ink bg-white p-3">
            {isSupported ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => listen(respond)}
                  className={`btn flex-1 ${isListening ? 'btn-accent' : 'btn-primary'}`}
                >
                  {isListening
                    ? <MicOff className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                    : <Mic className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />}
                  <span>{isListening ? t('voice.listening') : t('voice.tap')}</span>
                </button>

                {isSpeaking && (
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    aria-label={t('voice.stopSpeaking')}
                    className="btn btn-secondary w-14 shrink-0 px-0"
                  >
                    <Volume2 className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                  </button>
                )}
              </div>
            ) : (
              <p className="border border-terracotta-300 bg-terracotta-50 px-3 py-2 text-xs font-semibold text-terracotta-700">
                {t('voice.unsupported')}
              </p>
            )}

            {/* Typing always stays available — speech recognition is unreliable in a noisy mandi. */}
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="voice-input">{t('voice.typeInstead')}</label>
              <input
                id="voice-input"
                type="text"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && submitTyped()}
                placeholder={t('voice.typeInstead')}
                className="min-w-0 flex-1 border-2 border-ink px-3 py-2 text-sm font-medium outline-none focus:border-forest-700"
              />
              <button
                type="button"
                onClick={submitTyped}
                aria-label={t('voice.send')}
                className="shrink-0 border-2 border-ink bg-forest-700 px-3 text-white hover:bg-forest-800"
              >
                <Send className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceAssistant;
