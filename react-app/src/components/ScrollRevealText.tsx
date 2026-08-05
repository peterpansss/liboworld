import { useMemo } from 'react';
import { useScrollProgress } from '../utils/funnelAnimations';
import './ScrollRevealText.css';

type Props = {
  /** The full string to reveal. Kept intact in aria-label for AT + crawlers. */
  children: string;
  /** Element to render as. Headlines pass 'h1'/'h2'; the mission block passes 'p'. */
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
  className?: string;
  /**
   * Viewport band the sweep maps to, as fractions of viewport height.
   * Defaults follow SPEC: ~0% when the block's top sits at 85%, ~100% by 40%.
   * Founder's "Why we're building this" overrides to a wider 1.0 → 0.55 band.
   */
  start?: number;
  end?: number;
};

/**
 * Scroll-SCRUBBED text reveal — progress is derived from scroll position, not
 * fired once on intersection, so scrolling back up un-reveals it frame for
 * frame. Characters ramp from --muted to --text across a ~3-glyph soft edge.
 *
 * Implementation notes that matter (see design_handoff_scroll_text_reveal/SPEC.md):
 * - One style write per frame: we set --p on the container and let each span
 *   compute its own color in CSS. React never re-renders per character.
 * - Words are wrapped so per-character splitting can't break line wrapping
 *   mid-word.
 * - Default --p is 1 (fully white), so no-JS, prerender and reduced-motion all
 *   render legible text without running anything.
 */
export default function ScrollRevealText({
  children,
  as: Tag = 'span',
  className = '',
  start,
  end,
}: Props) {
  const { ref, progress, enabled } = useScrollProgress<HTMLElement>({ start, end });

  // Split into words (kept nowrap) then characters, numbering characters
  // continuously across the whole string so the sweep runs in reading order.
  const words = useMemo(() => {
    const parts = children.split(/(\s+)/);
    let index = 0;
    return parts.map((part) => {
      const chars = Array.from(part).map((ch) => ({ ch, i: index++ }));
      return { part, chars, isSpace: /^\s+$/.test(part) };
    });
  }, [children]);

  const total = useMemo(() => Array.from(children).length, [children]);

  return (
    <Tag
      ref={ref as never}
      className={`scroll-reveal${enabled ? '' : ' scroll-reveal--static'} ${className}`.trim()}
      aria-label={children}
      style={{ '--p': enabled ? progress : 1, '--n': total } as React.CSSProperties}
    >
      <span aria-hidden="true">
        {words.map(({ part, chars, isSpace }, w) =>
          isSpace ? (
            <span key={w}>{part}</span>
          ) : (
            <span className="scroll-reveal__word" key={w}>
              {chars.map(({ ch, i }) => (
                <span
                  className="scroll-reveal__char"
                  key={i}
                  style={{ '--i': i } as React.CSSProperties}
                >
                  {ch}
                </span>
              ))}
            </span>
          ),
        )}
      </span>
    </Tag>
  );
}
