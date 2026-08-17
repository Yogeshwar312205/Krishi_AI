#!/usr/bin/env node
/**
 * Guards the three dictionaries against drift.
 *
 * Checks, using en.json as the reference:
 *   1. every English key exists in Hindi and Marathi
 *   2. no stray keys exist in hi/mr that English does not have
 *   3. {{placeholders}} match across all three (a dropped {{name}} ships a
 *      greeting with no name in it)
 *   4. no value is left as untranslated English in hi/mr
 *
 * Run: npm run check:i18n
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const localeDir = resolve(here, '../src/i18n/locales');

const load = (lang) => JSON.parse(readFileSync(resolve(localeDir, `${lang}.json`), 'utf8'));

/** { "price.mandis.title": "Compare mandis", ... } */
const flatten = (node, prefix = '', out = {}) => {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(value, path, out);
    else out[path] = value;
  }
  return out;
};

const placeholders = (str) =>
  [...String(str).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join(',');

/*
 * Values that are correctly identical to English. Proper nouns, script-native
 * language names, and loanwords we deliberately kept in Latin script because
 * that is how they appear on the farmer's phone (OTP, SMS, Maps).
 */
const ALLOWED_IDENTICAL = new Set([
  'lang.en', 'lang.hi', 'lang.mr',
  'auth.otp', 'auth.sendOtp',
  'driver.route.openMaps',
]);

const reference = flatten(load('en'));
const problems = [];

for (const lang of ['hi', 'mr']) {
  const dictionary = flatten(load(lang));

  for (const [key, englishValue] of Object.entries(reference)) {
    const value = dictionary[key];

    if (value === undefined) {
      problems.push(`${lang}: missing key  ${key}`);
      continue;
    }
    if (placeholders(value) !== placeholders(englishValue)) {
      problems.push(
        `${lang}: placeholder mismatch in ${key}  ` +
        `(en has {{${placeholders(englishValue) || '—'}}}, ${lang} has {{${placeholders(value) || '—'}}})`
      );
    }
    if (value === englishValue && !ALLOWED_IDENTICAL.has(key)) {
      problems.push(`${lang}: still English  ${key}  "${value}"`);
    }
  }

  for (const key of Object.keys(dictionary)) {
    if (!(key in reference)) problems.push(`${lang}: extra key not in en.json  ${key}`);
  }
}

const keyCount = Object.keys(reference).length;

if (problems.length) {
  console.error(`\n✗ i18n check failed — ${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error('');
  process.exit(1);
}

console.log(`✓ i18n check passed — ${keyCount} keys × 3 languages, all present and consistent.`);
