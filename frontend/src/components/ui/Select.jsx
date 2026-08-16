import React from 'react';
import { ChevronDown } from 'lucide-react';

const TONES = {
  forest: 'bg-forest-50 border-forest-200 text-forest-900 hover:border-forest-400 focus:ring-forest-500/30 focus:border-forest-500',
  slate: 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-400 focus:ring-slate-500/30 focus:border-slate-500',
  terracotta: 'bg-terracotta-50 border-terracotta-200 text-terracotta-800 hover:border-terracotta-400 focus:ring-terracotta-500/30 focus:border-terracotta-500',
  dark: 'bg-slate-800 border-slate-700 text-white hover:border-slate-500 focus:ring-emerald-500/30 focus:border-emerald-500',
};

/**
 * Native <select> restyled as a pill-shaped control with a leading icon and
 * a consistent chevron — keeps built-in keyboard/a11y behavior instead of
 * reimplementing a listbox.
 */
export const Select = ({ icon: Icon, value, onChange, options, tone = 'forest', className = '', compact = false }) => {
  const toneClasses = TONES[tone] || TONES.forest;

  return (
    <div className={`relative flex items-center rounded-xl border font-bold transition-colors ${toneClasses} ${compact ? 'text-[11px]' : 'text-xs'} ${className}`}>
      {Icon && <Icon className={`pointer-events-none absolute left-2.5 h-3.5 w-3.5 opacity-70`} />}
      <select
        value={value}
        onChange={onChange}
        className={`appearance-none bg-transparent outline-none cursor-pointer rounded-xl w-full py-1.5 pr-7 focus:ring-2 ${Icon ? 'pl-8' : 'pl-3'}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 opacity-60" />
    </div>
  );
};

export default Select;
