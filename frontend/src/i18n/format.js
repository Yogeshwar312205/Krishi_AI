import { intlLocale } from './index';

/*
 * Number presentation for farmers.
 *
 * Two deliberate choices, both of which Intl gets wrong by default:
 *
 * 1. Latin digits everywhere (1,11,500 — not १,११,५००). Devanagari numerals are
 *    correct but far less familiar on a phone keypad and in SMS, where farmers
 *    read Latin digits daily. `mr-IN` defaults to the `deva` numbering system,
 *    so this needs an explicit override.
 *
 * 2. Indian lakh/crore grouping in all three languages. This is the subtle one:
 *    `mr-IN` produces Western grouping (₹111,500) even after forcing Latin
 *    digits, because CLDR ties Marathi's grouping to its numbering system. So
 *    every NUMBER formats through en-IN regardless of UI language — currency
 *    and quantity presentation should be identical across the three anyway,
 *    since ₹ and lakh grouping are not language-specific.
 *
 *    DATES still use the real language locale, so weekday and month names get
 *    translated ("मंगळ, 18 ऑग") while the digits stay Latin.
 */

/** All numeric output is Indian-English formatted: ₹1,11,500 — never ₹111,500 or ₹१,११,५००. */
const NUMBER_LOCALE = 'en-IN';

const cache = new Map();

const numberFormatter = (options) => {
  const key = JSON.stringify(options);
  let existing = cache.get(key);
  if (!existing) {
    existing = new Intl.NumberFormat(NUMBER_LOCALE, options);
    cache.set(key, existing);
  }
  return existing;
};

/** 111500 -> "₹1,11,500". Whole rupees: farmers do not price in paise. */
export const money = (_lang, value) =>
  numberFormatter({
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

/** 46.5 -> "₹46.50" — used for per-kg rates, where paise do matter. */
export const rate = (_lang, value) =>
  numberFormatter({
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

/** 2500 -> "2,500" */
export const number = (_lang, value) =>
  numberFormatter({ maximumFractionDigits: 0 }).format(Number(value) || 0);

/** 0.94 -> "94%" */
export const percent = (_lang, value) =>
  numberFormatter({ style: 'percent', maximumFractionDigits: 0 }).format(Number(value) || 0);

/**
 * Localised weekday + date: "Tue, 18 Aug" / "मंगल, 18 अग॰" / "मंगळ, 18 ऑग".
 * Language locale for the names, Latin numbering for the day number.
 */
const dateCache = new Map();

export const shortDate = (lang, value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  let formatter = dateCache.get(lang);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(intlLocale(lang), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      numberingSystem: 'latn',
    });
    dateCache.set(lang, formatter);
  }
  return formatter.format(date);
};
