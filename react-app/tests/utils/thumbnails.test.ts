/**
 * Coverage for src/utils/thumbnails.ts.
 *
 * Pure function; we just feed minimal Exercise/Workout shapes.
 *
 * Bundled thumbnail URLs carry a cache-bust query (`?v=N`, bumped whenever a
 * thumbnail batch is redeployed — see THUMB_CACHE_BUST), so path assertions
 * match `?v=<digits>` rather than pinning today's number.
 */
import { describe, expect, it } from 'vitest';
import type { Exercise, Workout, WorkoutExercise } from '../../src/data/exercises';
import {
  isMediaHidden,
  publicVideoUrl,
  publicVideoUrlAlt,
  publicAnimationUrl,
  exerciseSupportsAnimation,
  exerciseThumb,
  exerciseThumbSet,
  buildNameToSlug,
  workoutHeroThumb,
} from '../../src/utils/thumbnails';

function ex(o: Partial<Exercise>): Exercise {
  return {
    id: o.id ?? 'x',
    name: o.name ?? 'X',
    cat: o.cat ?? 'gym',
    equipment: o.equipment ?? 'Barbell',
    bodyFocus: o.bodyFocus ?? 'Chest',
    machineRequired: o.machineRequired ?? false,
    diff: o.diff ?? 'beginner',
    variation: o.variation ?? '',
    emoji: o.emoji ?? '',
    videoUrl: o.videoUrl,
    videoUrlAlt: o.videoUrlAlt,
    animationUrl: o.animationUrl,
    thumbnailUrl: o.thumbnailUrl,
    setupNotes: o.setupNotes ?? '',
  };
}

/** Bundled thumbnail path for `<name>` with any `?v=N` cache-bust suffix. */
const bundledThumb = (name: string, ext = 'jpg') =>
  new RegExp(`^/images/thumbnails/exercises/${name}\\.${ext}\\?v=\\d+$`);

describe('isMediaHidden', () => {
  it('returns false for any category and equipment under current config', () => {
    expect(isMediaHidden('gym', 'Barbell')).toBe(false);
    expect(isMediaHidden('mobility', 'Bodyweight')).toBe(false);
  });

  it('returns false when args are undefined', () => {
    expect(isMediaHidden()).toBe(false);
  });
});

describe('publicVideoUrl', () => {
  it('returns the videoUrl unchanged for the male voice', () => {
    expect(publicVideoUrl(ex({ videoUrl: 'https://cdn.example/x.mp4' }), 'male')).toBe(
      'https://cdn.example/x.mp4',
    );
  });

  it('injects _nova for the female voice variant', () => {
    expect(publicVideoUrl(ex({ videoUrl: 'https://cdn.example/x.mp4' }), 'female')).toBe(
      'https://cdn.example/x_nova.mp4',
    );
  });

  it('preserves trailing query strings when injecting voice variant', () => {
    expect(publicVideoUrl(ex({ videoUrl: 'https://cdn.example/x.mp4?v=2' }), 'female')).toBe(
      'https://cdn.example/x_nova.mp4?v=2',
    );
  });

  it('returns undefined when videoUrl is missing', () => {
    expect(publicVideoUrl(ex({}))).toBeUndefined();
  });
});

describe('publicVideoUrlAlt', () => {
  it('returns the videoUrlAlt as-is regardless of voice', () => {
    expect(publicVideoUrlAlt(ex({ videoUrlAlt: 'https://cdn/alt.mp4' }), 'female')).toBe(
      'https://cdn/alt.mp4',
    );
  });

  it('returns undefined when videoUrlAlt missing', () => {
    expect(publicVideoUrlAlt(ex({}))).toBeUndefined();
  });
});

describe('publicAnimationUrl', () => {
  it('returns the URL when present', () => {
    expect(publicAnimationUrl(ex({ animationUrl: 'https://cdn/x.gif' }))).toBe('https://cdn/x.gif');
  });

  it('returns undefined when missing', () => {
    expect(publicAnimationUrl(ex({}))).toBeUndefined();
  });
});

describe('exerciseSupportsAnimation', () => {
  it('false when no animationUrl', () => {
    expect(exerciseSupportsAnimation(ex({}))).toBe(false);
  });

  it('false when equipment is Bodyweight', () => {
    expect(exerciseSupportsAnimation(ex({ animationUrl: 'a', equipment: 'Bodyweight' }))).toBe(false);
  });

  it('true otherwise', () => {
    expect(exerciseSupportsAnimation(ex({ animationUrl: 'a', equipment: 'Barbell' }))).toBe(true);
  });
});

describe('exerciseThumb', () => {
  it('returns null for null/undefined exercise', () => {
    expect(exerciseThumb(null)).toBeNull();
    expect(exerciseThumb(undefined)).toBeNull();
  });

  it('returns null when videoUrl is missing', () => {
    expect(exerciseThumb(ex({}))).toBeNull();
  });

  it('extracts the basename and points to /images/thumbnails/exercises/<name>.jpg', () => {
    expect(exerciseThumb(ex({ videoUrl: 'https://cdn/dir/childs_pose.mp4' })))
      .toMatch(bundledThumb('childs_pose'));
  });

  it('strips the video query string before basename extraction', () => {
    const url = exerciseThumb(ex({ videoUrl: 'https://cdn/x.mp4?v=2' }));
    expect(url).toMatch(bundledThumb('x'));
    // The video's own ?v=2 must not leak into the thumbnail path.
    expect(url).not.toContain('v=2');
  });

  it('case-insensitive .mp4 stripping', () => {
    expect(exerciseThumb(ex({ videoUrl: 'https://cdn/x.MP4' })))
      .toMatch(bundledThumb('x'));
  });

  it('prefers the media-worker thumbnailUrl over the bundled path', () => {
    expect(
      exerciseThumb(ex({ videoUrl: 'https://cdn/x.mp4', thumbnailUrl: 'https://storage/x-thumb.jpg' })),
    ).toBe('https://storage/x-thumb.jpg');
  });
});

describe('exerciseThumbSet', () => {
  it('returns null when there is no thumbnail', () => {
    expect(exerciseThumbSet(ex({}))).toBeNull();
  });

  it('derives WebP + JPEG variants (same cache-bust) for bundled thumbnails', () => {
    const set = exerciseThumbSet(ex({ videoUrl: 'https://cdn/x.mp4' }));
    expect(set?.jpeg).toMatch(bundledThumb('x'));
    expect(set?.webp).toMatch(bundledThumb('x', 'webp'));
    expect(set?.webp?.split('?')[1]).toBe(set?.jpeg.split('?')[1]);
  });

  it('has no WebP variant for non-bundled (Supabase Storage) thumbnails', () => {
    expect(exerciseThumbSet(ex({ thumbnailUrl: 'https://storage/x-thumb.jpg' }))).toEqual({
      jpeg: 'https://storage/x-thumb.jpg',
      webp: null,
    });
  });
});

describe('buildNameToSlug', () => {
  it('maps every name to its id', () => {
    const map = buildNameToSlug([ex({ id: 'a', name: 'Bench Press' }), ex({ id: 'b', name: 'Squat' })]);
    expect(map).toEqual({ 'Bench Press': 'a', Squat: 'b' });
  });

  it('returns empty object for empty list', () => {
    expect(buildNameToSlug([])).toEqual({});
  });
});

describe('workoutHeroThumb', () => {
  function workout(exercises: Array<Pick<WorkoutExercise, 'name' | 'phase'>>): Workout {
    return {
      id: 'w',
      name: 'W',
      emoji: '',
      diff: 'beginner',
      dur: 0,
      cat: 'gym',
      exercises: exercises.map((e) => ({ sets: '3', reps: '10', ...e })),
    };
  }

  it('null when workout has no exercises', () => {
    expect(workoutHeroThumb(workout([]), {})).toBeNull();
  });

  it('uses the first main-phase exercise as hero', () => {
    const list = [
      ex({ id: 'a', name: 'Warmup', videoUrl: 'https://cdn/warmup.mp4' }),
      ex({ id: 'b', name: 'Main', videoUrl: 'https://cdn/main.mp4' }),
    ];
    const w = workout([
      { name: 'Warmup', phase: 'warmup' },
      { name: 'Main', phase: 'main' },
    ]);
    expect(workoutHeroThumb(w, buildNameToSlug(list), list)).toMatch(bundledThumb('main'));
  });

  it('falls back to the first exercise if no main phase', () => {
    const list = [ex({ id: 'a', name: 'Stretch', videoUrl: 'https://cdn/stretch.mp4' })];
    const w = workout([{ name: 'Stretch', phase: 'cooldown' }]);
    expect(workoutHeroThumb(w, buildNameToSlug(list), list)).toMatch(bundledThumb('stretch'));
  });

  it('returns null when the hero name is not in nameToSlug', () => {
    const w = workout([{ name: 'Unknown', phase: 'main' }]);
    expect(workoutHeroThumb(w, {}, [])).toBeNull();
  });
});
