import React from 'react';
import { Languages } from 'lucide-react';
import { useT } from '../i18n/useT';
import { SUPPORTED_LANGUAGES } from '../i18n';

/**
 * Three always-visible buttons, not a dropdown.
 *
 * A <select> hides two of the three options behind a tap and labels itself in
 * whatever language is currently active — so a Marathi speaker who has landed
 * on the English build has to read English to escape it. Showing all three at
 * once, each in its own script, means the way out is always legible: you look
 * for the shape you recognise, not the word you can read.
 *
 * Three options is exactly the case where a segmented control beats a menu.
 */
const NATIVE_NAMES = { en: 'ENG', hi: 'हिं', mr: 'मरा' };
const FULL_NAMES = { en: 'English', hi: 'हिन्दी', mr: 'मराठी' };

export const LanguagePicker = ({ compact = false }) => {
  const { lang, setLang, t } = useT();

  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className="flex items-stretch border-2 border-ink"
    >
      {!compact && (
        <span className="flex items-center px-2 bg-ink text-paper" aria-hidden="true">
          <Languages className="h-4 w-4" strokeWidth={2.5} />
        </span>
      )}

      {SUPPORTED_LANGUAGES.map((code) => {
        const isActive = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={isActive}
            aria-label={FULL_NAMES[code]}
            className={`
              min-w-[2.75rem] px-2 py-1.5 text-sm font-bold leading-none
              border-l-2 border-ink first:border-l-0
              ${isActive ? 'bg-forest-700 text-white' : 'bg-white text-ink hover:bg-forest-50'}
            `}
          >
            {NATIVE_NAMES[code]}
          </button>
        );
      })}
    </div>
  );
};

export default LanguagePicker;
