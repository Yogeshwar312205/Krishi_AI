import React from 'react';

/**
 * Opens a section with a furrow, a title, and a heavy rule beneath — the
 * header line of a ledger page.
 *
 * Three levels, because two were not enough and every screen was papering over
 * the gap by picking sizes by hand. A screen that opens with its title, then
 * heads a section, then heads a group inside that section, needs three
 * distinct weights of "this is a heading" — otherwise the eye reads a flat
 * list of equally loud rows and the structure has to be worked out rather than
 * seen.
 *
 *   screen   the page's own title. One per screen, and the furrow is its badge.
 *   section  a block within the page. Ruled, no furrow.
 *   group    a run of rows inside a section. Rule only, set small.
 *
 * The furrow is the one recurring ornament in the system, so it belongs to the
 * top level alone — repeat it at every level and it stops meaning anything.
 */
const LEVELS = {
  screen: { title: 'font-display text-3xl sm:text-4xl text-ink', furrow: true, rule: 'rule-strong pb-2' },
  section: { title: 'font-display text-2xl sm:text-3xl text-ink', furrow: false, rule: 'rule-strong pb-1.5' },
  group: { title: 'font-display text-xl sm:text-2xl text-ink-soft', furrow: false, rule: 'rule-hair pb-1.5' },
};

export const SectionHead = ({ title, note, action, level = 'section', className = '' }) => {
  const style = LEVELS[level] || LEVELS.section;

  return (
    <header className={`space-y-2 ${className}`}>
      {style.furrow && <div className="furrow w-16" aria-hidden="true" />}

      <div className={`flex items-end justify-between gap-4 ${style.rule}`}>
        {/*
          Deliberately NOT `leading-none`. A one-line Latin heading looks a
          touch tighter with it, and a two-line Devanagari one loses the matras
          off the top of the first line — which is the trade this whole scale
          exists to stop making.
        */}
        <h2 className={style.title}>{title}</h2>
        {action}
      </div>

      {note && <p className="max-w-prose text-base text-ink-soft">{note}</p>}
    </header>
  );
};

export default SectionHead;
