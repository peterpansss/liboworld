/**
 * Coverage for src/utils/thumbnails.ts.
 *
 * Pure function; we just feed minimal Exercise/Workout shapes.
 */
import { describe, expect, it } from 'vitest';
import {
  isMediaHidden,
  publicVideoUrl,
  publicVideoUrlAlt,
  publicAnimationUrl,
  exerciseSupportsAnimation,
  exerciseThumb,
  buildNameToSlug,
  workoutHeroThumb,
} from '../../src/utils/thumbnails';

function ex(o: any) {
  return {
    id: o.id ?? 'x',
    name: o.name ?? 'X',
    cat: o.cat ?? 'gym',
    equipment: o.equipment ?? 'Barbell',
    bodyFocus: o.bodyFocus ?? 'Chest',
    diff: o.diff ?? 'beginner',
    videoUrl: o.videoUrl,
    videoUrlAlt: o.videoUrlAlt,
    animationUrl: o.animationUrl,
    setupNotes: o.setupNotes ?? '',
  };
}

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
    expect(publicVideoUrl(ex({ videoUrl: 'https://cdn.example/x.mp4' }) as any, 'male')).toBe(
      'https://cdn.example/x.mp4',
    );
  });

  it('injects _nova for the female voice variant', () => {
    expect(publicVideoUrl(ex({ videoUrl: 'https://cdn.example/x.mp4' }) as any, 'female')).toBe(
      'https://cdn.example/x_nova.mp4',
    );
  });

  it('preserves trailing query strings when injecting voice variant', () => {
    expect(publicVideoUrl(ex({ videoUrl: 'https://cdn.example/x.mp4?v=2' }) as any, 'female')).toBe(
      'https://cdn.example/x_nova.mp4?v=2',
    );
  });

  it('returns undefined when videoUrl is missing', () => {
    expect(publicVideoUrl(ex({}) as any)).toBeUndefined();
  });
});

describe('publicVideoUrlAlt', () => {
  it('returns the videoUrlAlt as-is regardless of voice', () => {
    expect(publicVideoUrlAlt(ex({ videoUrlAlt: 'https://cdn/alt.mp4' }) as any, 'female')).toBe(
      'https://cdn/alt.mp4',
    );
  });

  it('returns undefined when videoUrlAlt missing', () => {
    expect(publicVideoUrlAlt(ex({}) as any)).toBeUndefined();
  });
});

describe('publicAnimationUrl', () => {
  it('returns the URL when present', () => {
    expect(publicAnimationUrl(ex({ animationUrl: 'https://cdn/x.gif' }) as any)).toBe('https://cdn/x.gif');
  });

  it('returns undefined when missing', () => {
    expect(publicAnimationUrl(ex({}) as any)).toBeUndefined();
  });
});

describe('exerciseSupportsAnimation', () => {
  it('false when no animationUrl', () => {
    expect(exerciseSupportsAnimation(ex({}) as any)).toBe(false);
  });

  it('false when equipment is Bodyweight', () => {
    expect(exerciseSupportsAnimation(ex({ animationUrl: 'a', equipment: 'Bodyweight' }) as any)).toBe(false);
  });

  it('true otherwise', () => {
    expect(exerciseSupportsAnimation(ex({ animationUrl: 'a', equipment: 'Barbell' }) as any)).toBe(true);
  });
});

describe('exerciseThumb', () => {
  it('returns null for null/undefined exercise', () => {
    expect(exerciseThumb(null)).toBeNull();
    expect(exerciseThumb(undefined)).toBeNull();
  });

  it('returns null when videoUrl is missing', () => {
    expect(exerciseThumb(ex({}) as any)).toBeNull();
  });

  it('extracts the basename and points to /images/thumbnails/exercises/<name>.jpg', () => {
    expect(exerciseThumb(ex({ videoUrl: 'https://cdn/dir/childs_pose.mp4' }) as any))
      .toBe('/images/thumbnails/exercises/childs_pose.jpg');
  });

  it('strips query string before basename extraction', () => {
    expect(exerciseThumb(ex({ videoUrl: 'https://cdn/x.mp4?v=2' }) as any))
      .toBe('/images/thumbnails/exercises/x.jpg');
  });

  it('case-insensitive .mp4 stripping', () => {
    expect(exerciseThumb(ex({ videoUrl: 'https://cdn/x.MP4' }) as any))
      .toBe('/images/thumbnails/exercises/x.jpg');
  });
});

describe('buildNameToSlug', () => {
  it('maps every name to its id', () => {
    const map = buildNameToSlug([ex({ id: 'a', name: 'Bench Press' }) as any, ex({ id: 'b', name: 'Squat' }) as any]);
    expect(map).toEqual({ 'Bench Press': 'a', Squat: 'b' });
  });

  it('returns empty object for empty list', () => {
    expect(buildNameToSlug([])).toEqual({});
  });
});

describe('workoutHeroThumb', () => {
  function workout(exercises: any[]) {
    return { id: 'w', name: 'W', exercises } as any;
  }

  it('null when workout has no exercises', () => {
    expect(workoutHeroThumb(workout([]), {})).toBeNull();
  });

  it('uses the first main-phase exercise as hero', () => {
    const list = [
      ex({ id: 'a', name: 'Warmup', videoUrl: 'https://cdn/warmup.mp4' }) as any,
      ex({ id: 'b', name: 'Main', videoUrl: 'https://cdn/main.mp4' }) as any,
    ];
    const w = workout([
      { name: 'Warmup', phase: 'warmup' },
      { name: 'Main', phase: 'main' },
    ]);
    expect(workoutHeroThumb(w, buildNameToSlug(list), list)).toBe('/images/thumbnails/exercises/main.jpg');
  });

  it('falls back to the first exercise if no main phase', () => {
    const list = [ex({ id: 'a', name: 'Stretch', videoUrl: 'https://cdn/stretch.mp4' }) as any];
    const w = workout([{ name: 'Stretch', phase: 'cooldown' }]);
    expect(workoutHeroThumb(w, buildNameToSlug(list), list)).toBe('/images/thumbnails/exercises/stretch.jpg');
  });

  it('returns null when the hero name is not in nameToSlug', () => {
    const w = workout([{ name: 'Unknown', phase: 'main' }]);
    expect(workoutHeroThumb(w, {}, [])).toBeNull();
  });
});
