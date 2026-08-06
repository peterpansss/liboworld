import { useMemo } from 'react';
import { useScrollProgress } from '../utils/funnelAnimations';
import './ScrollRevealText.css';

type Props = {
  /** The full string to reveal. Kept intact in aria-label for AT + crawlers. */
  children: string;
  /** Display headings only — h1/h2, or a span inside one. Never body copy. */
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'div';
  className?: string;
  /**
   * Viewport band the sweep maps to, as fractions of viewport height.
   * Founder's "Why we're building this" overrides to a wider 1.0 → 0.55 band.
   */
  start?: number;
  end?: number;
};

/**
 * Scroll-scrubbed text reveal for DISPLAY HEADINGS.
 *
 * Two rules learned the hard way (FIX-TICKET-V3 §1):
 *
 * 1. WORD is the atom, not the character. Splitting per glyph left words
 *    two-toned mid-word — "WHERE THI/S IS GOIN/G." — which reads as a
 *    rendering fault, not an effect.
 * 2. It must always finish. `useScrollProgress` force-completes once the
 *    element's top passes the middle of the viewport, so nothing can be left
 *    sitting in the dim rest colour and look like disabled text.
 *
 * Scope it to h1/h2. Body paragraphs, card copy, step descriptions and
 * captions stay static — the restraint is what makes it land, and dimmed body
 * copy just looks broken.
 */
export default function ScrollRevealText({
  children,
  as: Tag = 'span',
  className = '',
  start,
  end,
}: Props) {
  const { ref, progress, enabled } = useScrollProgress<HTMLElement>({ start, end });

  // Split on whitespace, keeping the separators so spacing survives. Only the
  // non-space tokens get an index — the sweep advances a word at a time.
  const tokens = useMemo(() => {
    let index = 0;
    return children.split(/(\s+)/).map((part) => {
      const isSpace = /^\s+$/.test(part) || part === '';
      return { part, isSpace, i: isSpace ? -1 : index++ };
    });
  }, [children]);

  const total = useMemo(
    () => tokens.filter((t) => !t.isSpace).length || 1,
    [tokens],
  );

  return (
    <Tag
      ref={ref as never}
      className={`scroll-reveal${enabled ? '' : ' scroll-reveal--static'} ${className}`.trim()}
      aria-label={children}
      style={{ '--p': enabled ? progress : 1, '--n': total } as React.CSSProperties}
    >
      <span aria-hidden="true">
        {tokens.map(({ part, isSpace, i }, k) =>
          isSpace ? (
            <span key={k}>{part}</span>
          ) : (
            <span
              className="scroll-reveal__word"
              key={k}
              style={{ '--i': i } as React.CSSProperties}
            >
              {part}
            </span>
          ),
        )}
      </span>
    </Tag>
  );
}
