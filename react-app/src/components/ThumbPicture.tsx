import type { CSSProperties, SyntheticEvent } from 'react';
import type { ThumbnailSet } from '../utils/thumbnails';

interface Props {
  thumb: ThumbnailSet | null | undefined;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  style?: CSSProperties;
  onError?: (e: SyntheticEvent<HTMLImageElement>) => void;
}

/**
 * Renders an exercise/workout thumbnail as a <picture> with WebP primary +
 * JPEG fallback for the ~3% of browsers that don't speak WebP. Both are
 * 1440x1080 (matches source video); browsers downsample for non-retina.
 * `className` and `style` are applied to the inner <img> so existing card
 * positioning (e.g. absolute-fill over an emoji) keeps working unchanged.
 * Falls back silently to nothing when `thumb` is null.
 *
 * Origin-agnostic by construction: it renders whatever `ThumbnailSet` it is
 * handed, so a bundled `/images/...` path, a Supabase Storage URL and a
 * Cloudflare R2 `videos.liboworld.com/thumbnails/...` URL all work, including
 * a mixture of them on the same page during the thumbnail migration. `webp`
 * is null whenever the caller could not prove a `.webp` sibling exists (see
 * `utils/thumbnails.ts`), and a null `webp` omits the <source> entirely —
 * never emit a <source> that might 404, since Chrome does not fall through to
 * the <img> and the card goes blank.
 */
export function ThumbPicture({ thumb, alt = '', className, loading = 'lazy', style, onError }: Props) {
  if (!thumb) return null;
  return (
    <picture>
      {thumb.webp && <source type="image/webp" srcSet={thumb.webp} />}
      <img
        src={thumb.jpeg}
        alt={alt}
        loading={loading}
        className={className}
        style={style}
        onError={onError}
      />
    </picture>
  );
}
