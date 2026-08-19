# KrishiFlow translation glossary

Decisions behind the Hindi and Marathi wording, so the team stays consistent
and nobody "corrects" a deliberate choice back into textbook register.

## The register rule

Write the word a farmer **says out loud**, not the word a government form
prints. When the natural spoken word is an English loanword, keep the loanword
in Devanagari. A Sanskritised coinage that is technically correct but never
spoken is a worse translation than a loanword everybody already uses.

## Loanwords we deliberately kept

These are in daily rural speech across Maharashtra. Translating them would make
the UI *harder* to read.

| Loanword | Hindi | Marathi | Why not the "pure" word |
|---|---|---|---|
| booking | बुकिंग | बुकिंग | आरक्षण reads as a railway/quota word |
| driver | ड्राइवर | ड्रायव्हर | चालक is signage register, not speech |
| mobile number | मोबाइल नंबर | मोबाइल नंबर | दूरध्वनी क्रमांक is unusable |
| SMS / OTP | SMS / OTP | SMS / OTP | Left in Latin — that is how they appear on the handset |
| km / kg | किमी / किलो | किमी / किलो | Universal |
| save, log in, log out | सेव, लॉग इन | सेव, लॉग आउट | App verbs everyone knows from other apps |

## Words we translated rather than borrowed

| English | Hindi | Marathi | Reasoning |
|---|---|---|---|
| rate / price | **भाव** | **भाव** | The actual mandi word. Not मूल्य or दर. |
| forecast | **अंदाज़** | **अंदाज** | Plain "estimate". पूर्वानुमान is weather-bulletin register. |
| vehicle / truck | **गाडी** | **गाडी** | वाहन is RTO language. |
| route | **रास्ता** | **रस्ता** | मार्ग is formal. |
| cold chain | **ठंडी गाडी** | **थंड गाडी** | See below — the biggest single change. |
| profit / earning | **कमाई / फायदा** | **कमाई / नफा** | शुद्ध लाभ is an accounting term. |
| demand | **माँग** | **मागणी** | Fine as-is. |
| crop | **फसल** | **पीक** | Note the two languages genuinely differ here. |
| harvest | **कटाई** | **कापणी** | |
| alert | **खबर** | **खबर** | Warmer than अलर्ट and just as short. |

## Terms that needed a real decision

**"Cold chain" → ठंडी गाडी / थंड गाडी ("cold vehicle")**
The English term describes an unbroken temperature-controlled *supply chain* —
a concept, not an object. A farmer books a vehicle, not a chain. We name the
thing they interact with and explain the benefit in the sub-label
(`transport.vehicle.coldWhy`: "keeps your crop cool so it does not spoil")
rather than teaching the industry term.

**"VRP" / "route optimization" → never shown**
Vehicle Routing Problem is a solver name. It is meaningless in all three
languages and appeared in the old UI as `लॉजिस्टिक्स VRP`. Farmers see
**तुमचा रस्ता / आपका रास्ता** ("your route") plus a "why this route?" expander
(`transport.route.whyExplain`) that states the actual reason in money terms.
Keep VRP for the judges' demo overlay and the pitch deck.

**"APMC" → मंडी (hi) / बाजार (mr)**
The old dictionary used एपीएमसी क्रेता डेस्क and बाजार समिती खरेदीदार कक्ष.
Nobody says APMC. Hindi speakers say मंडी; Marathi speakers say बाजार (or
मार्केट). "बाजार समिती" is correct but is the institution's name, not where you
go to sell onions.

**Greeting → राम राम**
Used as an everyday greeting in rural Maharashtra and much of North India,
across communities, and warmer than नमस्ते. Swap to a neutral
`today.greetingAnon` if you demo outside that region.

**Digits stay Latin (1,11,500 — not १,११,५००)**
Devanagari numerals are correct but far less familiar on phone keypads and in
SMS. Indian lakh/crore grouping is preserved.

Both parts need explicit handling — do not "simplify" `format.js` back to
`new Intl.NumberFormat(mr-IN)`. Marathi defaults to Devanagari digits, and even
after forcing `numberingSystem: 'latn'` it still emits *Western* grouping
(`₹111,500`), because CLDR ties Marathi's grouping to its numbering system.
So all numbers format through `en-IN` regardless of UI language; only dates use
the language locale, for weekday and month names.

## Fixed from the previous dictionary

| Key | Was | Problem |
|---|---|---|
| `platformTitle` (hi) | बाजार खुफिया प्लेटफॉर्म | Calque of "market intelligence". खुफिया = *espionage*. Read as "market spy platform". |
| `farmerProfile` (mr) | बळीराजा प्रोफाइल | बळीराजा is honorific/poetic — speeches and posters, not a settings label. Now शेतकरी. |
| `optimalStrategy` (hi) | सर्वोत्तम रणनीति | रणनीति is military/boardroom. |
| `netProfitDelta` (hi) | शुद्ध लाभ वृद्धि | Three formal words. Now "आपके हाथ में" (in your hand). |
| `logistics` (all) | लॉजिस्टिक्स VRP | Untranslated solver jargon in the primary nav. |
| `demandAnalysis` (mr) | मागणी व कल | कल is literary for "trend". |

## Still worth a native-speaker pass

Flagging honestly rather than claiming certainty. All three are usable as
written — these are polish calls, not errors:

1. **`price.forecast.confidence`** — "किती खात्री" / "कितना पक्का". Conveys
   model confidence without the statistics, but a farmer may read it as a
   promise. Consider dropping the number and showing only high/medium/low.
2. **`price.mandis.explain`** — the net-vs-gross distinction is the single most
   important idea in the app and the hardest to say briefly. Worth testing on a
   real farmer.
3. **`crop.spoils`** — "जल्दी खराब होती है". Fine, but regional words for
   perishability vary; Nashik onion vs. Konkan mango growers may differ.

## Adding a string

1. Add to `en.json` first — it is the reference for the checker.
2. Add to `hi.json` and `mr.json` with matching `{{placeholders}}`.
3. `npm run check:i18n` — also runs on `npm run build`.
4. Never write a bare string in a component. `useT()` or nothing.
