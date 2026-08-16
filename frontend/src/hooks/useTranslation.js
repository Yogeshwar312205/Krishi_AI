import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getTranslation } from '../utils/translations';

/**
 * Subscribes a component to the active language and returns a `t(key)` lookup.
 *
 * Selecting only `language` from the store keeps the component from re-rendering
 * on unrelated state changes, and the shared hook means adding a language never
 * requires touching call sites.
 */
export const useTranslation = () => {
  const language = useAppStore((state) => state.language);

  const t = useCallback((key) => getTranslation(language, key), [language]);

  return { t, language };
};

export default useTranslation;
