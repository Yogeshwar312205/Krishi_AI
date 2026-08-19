import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';

/**
 * All three dictionaries are bundled rather than lazily fetched.
 *
 * They are ~8KB each before gzip, and the users we care about are on patchy
 * rural connections — paying one extra round trip at the moment someone taps
 * "मराठी" is exactly the wrong place to spend a network request. Switching
 * language must feel instant even with no signal.
 */
export const DICTIONARIES = { en, hi, mr };

export const SUPPORTED_LANGUAGES = ['en', 'hi', 'mr'];
export const DEFAULT_LANGUAGE = 'en';

/** BCP-47 tags for Intl. All three resolve to Indian conventions (lakh/crore grouping). */
const INTL_LOCALES = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };

export const intlLocale = (lang) => INTL_LOCALES[lang] || INTL_LOCALES.en;

/** Walks "price.mandis.title" through a nested dictionary. */
const lookup = (dictionary, path) => {
  let node = dictionary;
  for (const segment of path.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[segment];
  }
  return typeof node === 'string' ? node : undefined;
};

/** Replaces {{name}} placeholders. Values are inserted as text, never as markup. */
const interpolate = (template, vars) => {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
};

/**
 * Resolves a key, falling back to English and finally to the key itself.
 *
 * A missing key is a bug, not a runtime error — the farmer still gets a usable
 * (if English) label rather than a blank button. In development we make the gap
 * loud so it gets fixed before the demo.
 */
export const translate = (lang, key, vars) => {
  const dictionary = DICTIONARIES[lang] || DICTIONARIES[DEFAULT_LANGUAGE];

  const hit = lookup(dictionary, key);
  if (hit !== undefined) return interpolate(hit, vars);

  const fallback = lookup(DICTIONARIES[DEFAULT_LANGUAGE], key);
  if (fallback !== undefined) {
    if (import.meta.env.DEV && lang !== DEFAULT_LANGUAGE) {
      console.warn(`[i18n] Missing "${key}" in ${lang} — falling back to English.`);
    }
    return interpolate(fallback, vars);
  }

  /*
   * Crop names are the one namespace with a legitimate open set.
   *
   * The picker offers nineteen translated crops plus every other commodity the
   * Agmarknet feed reports — around 119 in Maharashtra, and the list changes
   * with the season. Translating all of them is not the fix: they are real,
   * published commodity names ("Bengal Gram(Gram)(Whole)"), and inventing
   * Devanagari for each would guess at register the GLOSSARY exists to settle.
   * So an untranslated crop shows the government's own name rather than the
   * literal string "crops.Drumstick".
   */
  if (key.startsWith('crops.')) return key.slice('crops.'.length);

  if (import.meta.env.DEV) {
    console.error(`[i18n] Unknown key "${key}" in every language.`);
  }
  return key;
};

/**
 * Picks a plural form. Hindi and Marathi both use the same two-category system
 * as English (one / other), so Intl.PluralRules covers all three without a
 * plural-forms library.
 *
 *   tPlural('transport.vehicle.found', 3) -> looks up ".other", then ".one"
 */
export const pluralCategory = (lang, count) =>
  new Intl.PluralRules(intlLocale(lang)).select(count);
