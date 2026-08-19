/**
 * Finding out whether anyone at a given mandi is reachable through KrushiFlow.
 *
 * The Agmarknet feed names markets its own way ("Mumbai APMC", "Pune(Moshi)
 * APMC", "Nasik APMC"); a buyer signing up types their mandi's name however
 * they say it ("Vashi Wholesale APMC", "Nashik Main APMC"). Those refer to the
 * same yards and must match, so both sides are reduced to their distinguishing
 * words before comparison.
 */

/** Words that appear on nearly every mandi name and so distinguish nothing. */
const NOISE = new Set([
  'apmc', 'market', 'markets', 'wholesale', 'main', 'central', 'committee',
  'produce', 'agricultural', 'agriculture', 'krushi', 'krishi', 'utpanna',
  'utpann', 'bazar', 'bajar', 'samiti', 'samati', 'yard', 'mandi', 'hub',
  'pvt', 'ltd', 'limited', 'private', 'co', 'op', 'dist', 'tal', 'the', 'and',
]);

/** "Pune(Moshi) APMC" -> ['pune', 'moshi'] */
const significantWords = (name = '') =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z\s]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !NOISE.has(word));

/*
 * Yards that two names can both legitimately refer to without sharing a word.
 * Vashi is where the Mumbai APMC complex physically is, so a buyer who says
 * "Vashi" and a feed row that says "Mumbai APMC" are the same place.
 */
const ALIASES = [
  ['mumbai', 'vashi', 'turbhe', 'navi'],
  ['nasik', 'nashik'],
  ['sambhajinagar', 'aurangabad'],
  ['ahilyanagar', 'ahmednagar'],
  ['dharashiv', 'osmanabad'],
  ['pune', 'gultekdi'],
];

const expand = (words) => {
  const out = new Set(words);
  for (const group of ALIASES) {
    if (words.some((word) => group.includes(word))) group.forEach((alias) => out.add(alias));
  }
  return out;
};

/** True when two market names plausibly name the same yard. */
export const sameMandi = (a, b) => {
  const left = expand(significantWords(a));
  const right = significantWords(b);
  if (!left.size || !right.length) return false;
  return right.some((word) => left.has(word));
};

/**
 * The trader to contact about this mandi, if one is on the platform.
 *
 * A posting for the same crop wins over one for a different crop: a buyer
 * already advertising for tomatoes is the right person to ask about tomatoes,
 * and their posted rate is a real number to open the conversation with. Failing
 * that, any trader at that mandi is still a better answer than none.
 */
export const findTraderForMandi = (postings = [], mandiName, cropType) => {
  const atMandi = postings.filter((posting) => sameMandi(mandiName, posting.mandiName));
  if (!atMandi.length) return null;

  const posting = atMandi.find((p) => p.cropType === cropType) || atMandi[0];
  const [, name = posting.traderName, company = ''] =
    /^(.*?)\s*\((.*)\)\s*$/.exec(posting.traderName) || [];

  return {
    name: name.trim(),
    company: company.trim(),
    phone: posting.traderPhone,
    onPlatform: true,
    postingId: posting.id,
    // Only meaningful when the posting is for this crop — otherwise it is a
    // rate for something else and quoting it back would be misleading.
    postedRatePerKg: posting.cropType === cropType ? posting.offeredPricePerKg : null,
    postedGrade: posting.cropType === cropType ? posting.grade : null,
  };
};

/**
 * Government farmer helpline — the honest fallback when no trader at this mandi
 * has signed up.
 *
 * We do not hold phone numbers for the ~290 APMC yards in the feed and will not
 * invent them: a wrong number on a screen a farmer is about to act on is worse
 * than no number. The Kisan Call Centre is a real, free, national line that can
 * connect a farmer to their local APMC, and the farmer can record their own
 * agent's number instead.
 */
export const KISAN_CALL_CENTRE = '1800-180-1551';
