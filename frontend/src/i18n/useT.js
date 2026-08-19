import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { translate, pluralCategory } from './index';
import * as fmt from './format';

/**
 * The one hook every component uses for user-facing text.
 *
 * There is deliberately no I18nProvider: the active language already lives in
 * the zustand store (persisted to localStorage, mirrored onto <html lang>), and
 * wrapping a React context around state that is already global would add a
 * layer that only re-broadcasts what the store broadcasts. Selecting just
 * `language` also means a component re-renders on a language switch and on
 * nothing else.
 *
 *   const { t, money, lang } = useT();
 *   t('today.greeting', { name: user.name })
 *   money(111500)                              // "₹1,11,500"
 */
export const useT = () => {
  const lang = useAppStore((state) => state.language);
  const setLang = useAppStore((state) => state.setLanguage);

  return useMemo(
    () => ({
      lang,
      setLang,

      t: (key, vars) => translate(lang, key, vars),

      /**
       * Count-aware lookup. Expects sibling keys `<key>.one` / `<key>.other`
       * and always passes `count` through for interpolation.
       */
      tCount: (key, count, vars) =>
        translate(lang, `${key}.${pluralCategory(lang, count)}`, { count, ...vars }),

      money: (value) => fmt.money(lang, value),
      rate: (value) => fmt.rate(lang, value),
      number: (value) => fmt.number(lang, value),
      percent: (value) => fmt.percent(lang, value),
      shortDate: (value) => fmt.shortDate(lang, value),
    }),
    [lang, setLang]
  );
};

export default useT;
