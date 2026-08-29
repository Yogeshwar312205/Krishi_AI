import React from 'react';

/**
 * A very small Markdown renderer for assistant answers.
 *
 * The RAG backend returns Gemini's markdown — `### headings`, `**bold**`,
 * `* bullets`, numbered lists, `---` rules, the odd emoji. Rendered as plain
 * pre-wrapped text those symbols show up literally. This handles the subset the
 * model actually emits, styled in the rate-board language (no external
 * dependency, no `dangerouslySetInnerHTML`).
 */

/** Inline: **bold** / __bold__ → <strong>, with stray single `*` stripped. */
const renderInline = (text, keyBase) => {
  const out = [];
  const re = /(\*\*|__)(.+?)\1/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<strong key={`${keyBase}-b${i}`} className="font-bold">{m[2]}</strong>);
    last = m.index + m[0].length;
    i += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  // Strip any leftover lone markdown asterisks / underscores.
  return out.map((node) =>
    typeof node === 'string' ? node.replace(/\*/g, '').replace(/(?<!\w)_(?!\w)/g, '') : node,
  );
};

export const Markdown = ({ text, className = '' }) => {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let list = null; // { ordered: bool, items: [] }

  const flushList = () => {
    if (!list) return;
    const isOrdered = list.ordered;
    blocks.push(
      <div key={`l${blocks.length}`} className="my-1.5 space-y-1">
        {list.items.map((it, k) => (
          <div key={k} className="flex gap-2">
            <span className="shrink-0 font-bold text-forest-700 tnum">
              {isOrdered ? `${k + 1}.` : '·'}
            </span>
            <span className="min-w-0 flex-1 leading-relaxed">
              {renderInline(it, `li${blocks.length}-${k}`)}
            </span>
          </div>
        ))}
      </div>,
    );
    list = null;
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const key = `b${idx}`;

    if (!line.trim()) { flushList(); return; }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushList();
      blocks.push(<hr key={key} className="my-2 border-t-2 border-rule" />);
      return;
    }

    // Headings ###### … #
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushList();
      const depth = h[1].length;
      blocks.push(
        depth <= 2
          ? <p key={key} className="mt-2 font-display text-base leading-tight text-ink">{renderInline(h[2], key)}</p>
          : <p key={key} className="eyebrow mt-2">{renderInline(h[2], key)}</p>,
      );
      return;
    }

    // Ordered list item: "1. text"
    const ol = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (ol) {
      if (!list || !list.ordered) { flushList(); list = { ordered: true, items: [] }; }
      list.items.push(ol[2]);
      return;
    }

    // Unordered list item: "* text" / "- text" / "• text"
    const ul = line.match(/^\s*[-*•]\s+(.*)$/);
    if (ul) {
      if (!list || list.ordered) { flushList(); list = { ordered: false, items: [] }; }
      list.items.push(ul[1]);
      return;
    }

    // Plain paragraph line
    flushList();
    blocks.push(<p key={key} className="my-1 leading-relaxed">{renderInline(line, key)}</p>);
  });
  flushList();

  return <div className={className}>{blocks}</div>;
};

export default Markdown;
