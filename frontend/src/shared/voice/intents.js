/**
 * Voice intent matching across the three languages.
 *
 * Deliberately keyword matching, not an LLM call: it runs offline, answers in
 * about a millisecond, and costs nothing per query. For an audience on patchy
 * rural data, a voice assistant that needs a round trip to answer "what is the
 * rate" is a voice assistant that does not work.
 *
 * Matching is on the transcript in ALL languages at once, regardless of the UI
 * language — farmers code-switch mid-sentence ("tomato cha bhav kay आहे"), and
 * the speech recogniser often returns a romanised transcript even for Marathi
 * speech. The reply is always in the UI language.
 */

/** Each intent lists trigger words across en / hi / mr, including romanisations. */
const INTENTS = [
  {
    id: 'rate',
    keywords: [
      'rate', 'price', 'bhav', 'bhaav', 'daam', 'kimat', 'cost',
      'भाव', 'दाम', 'कीमत', 'दर', 'किंमत',
    ],
  },
  {
    id: 'book',
    keywords: [
      'book', 'vehicle', 'truck', 'gaadi', 'gadi', 'transport', 'tempo',
      'गाडी', 'बुक', 'ट्रक', 'वाहन', 'टेम्पो',
    ],
  },
  {
    id: 'verdict',
    keywords: [
      'sell', 'wait', 'hold', 'bech', 'becho', 'ruk', 'thamb', 'vika', 'viku',
      'बेच', 'बेचूँ', 'रुक', 'रुकूँ', 'होल्ड',
      'विक', 'विकू', 'थांब', 'साठव',
    ],
  },
  {
    id: 'crop',
    keywords: [
      'crop', 'my crop', 'fasal', 'peek', 'pik',
      'फसल', 'पीक', 'शेतमाल',
    ],
  },
  {
    id: 'bookings',
    keywords: [
      'booking', 'bookings', 'my booking', 'status', 'kahan', 'kuthe',
      'बुकिंग', 'कहाँ', 'कुठे', 'स्थिती',
    ],
  },
];

/**
 * Returns the best-matching intent id, or null.
 *
 * Longer keywords win, so "my crop" beats a bare "crop" and "booking" is not
 * swallowed by "book" — without that, "meri booking kahan hai" would be
 * matched as a request to book a new vehicle.
 */
export const matchIntent = (transcript) => {
  const text = String(transcript || '').toLowerCase().trim();
  if (!text) return null;

  let best = null;
  let bestLength = 0;

  for (const intent of INTENTS) {
    for (const keyword of intent.keywords) {
      if (text.includes(keyword.toLowerCase()) && keyword.length > bestLength) {
        best = intent.id;
        bestLength = keyword.length;
      }
    }
  }

  return best;
};

/** BCP-47 tags for SpeechRecognition and SpeechSynthesis. */
export const SPEECH_LOCALES = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };
