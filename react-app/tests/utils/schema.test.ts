/**
 * Coverage for src/utils/schema.ts (JSON-LD schema builders for SEO).
 */
import { describe, expect, it } from 'vitest';
import {
  buildHowToSchema,
  buildVideoObjectSchema,
  buildBreadcrumbSchema,
  buildExerciseGraph,
  exerciseCanonicalUrl,
  libraryCanonicalUrl,
} from '../../src/utils/schema';

function ex(o: any) {
  return {
    id: o.id ?? 'pushup',
    name: o.name ?? 'Pushup',
    cat: o.cat ?? 'home',
    bodyFocus: o.bodyFocus ?? 'Chest',
    equipment: o.equipment ?? 'Bodyweight',
    diff: o.diff ?? 'beginner',
    setupNotes: o.setupNotes ?? '',
    videoUrl: o.videoUrl,
  };
}

describe('buildHowToSchema', () => {
  it('returns @type=HowTo with the right id', () => {
    const r = buildHowToSchema(ex({ id: 'pushup_v1' }) as any);
    expect(r['@type']).toBe('HowTo');
    expect(r['@id']).toContain('/exercises/pushup_v1#howto');
  });

  it('the name field is "How to do <name>"', () => {
    const r = buildHowToSchema(ex({ name: 'Bench Press' }) as any);
    expect(r.name).toBe('How to do Bench Press');
  });

  it('description is setup notes when present', () => {
    const r = buildHowToSchema(ex({ setupNotes: 'Lie on bench' }) as any);
    expect(r.description).toBe('Lie on bench');
  });

  it('description truncates very long notes to 240 chars', () => {
    const r = buildHowToSchema(ex({ setupNotes: 'A'.repeat(500) }) as any);
    expect((r.description as string).length).toBeLessThanOrEqual(240);
    expect(r.description).toMatch(/…$/);
  });

  it('description falls back to a synthetic sentence when notes are blank', () => {
    const r = buildHowToSchema(ex({ name: 'Squat', bodyFocus: 'Legs', equipment: 'Barbell', diff: 'beginner' }) as any);
    expect(r.description).toContain('Squat');
    expect(r.description).toContain('Legs');
    expect(r.description).toContain('Barbell');
    expect(r.description).toContain('beginner');
  });

  it('steps array uses HowToStep type and 1-indexed positions', () => {
    const r = buildHowToSchema(ex({ name: 'Foo', setupNotes: 'Step one. Step two with enough text. Final step done.' }) as any);
    const steps = r.step as any[];
    expect(steps.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < steps.length; i++) {
      expect(steps[i]['@type']).toBe('HowToStep');
      expect(steps[i].position).toBe(i + 1);
    }
  });

  it('tool array contains the equipment', () => {
    const r = buildHowToSchema(ex({ equipment: 'Cable' }) as any);
    expect((r.tool as any[])[0]).toEqual({ '@type': 'HowToTool', name: 'Cable' });
  });

  it('image is set when a thumbnail exists (videoUrl present)', () => {
    const r = buildHowToSchema(ex({ videoUrl: 'https://cdn/x.mp4' }) as any);
    expect(r.image).toBeDefined();
  });
});

describe('buildVideoObjectSchema', () => {
  it('returns null when there is no videoUrl', () => {
    expect(buildVideoObjectSchema(ex({}) as any)).toBeNull();
  });

  it('returns a VideoObject with contentUrl + thumbnailUrl', () => {
    const r = buildVideoObjectSchema(ex({ videoUrl: 'https://cdn/x.mp4' }) as any);
    expect(r).not.toBeNull();
    expect(r!['@type']).toBe('VideoObject');
    expect(r!.contentUrl).toBe('https://cdn/x.mp4');
    expect(r!.thumbnailUrl).toBeDefined();
  });

  it('uploadDate is the documented sentinel', () => {
    const r = buildVideoObjectSchema(ex({ videoUrl: 'https://cdn/x.mp4' }) as any);
    expect(r!.uploadDate).toBe('2026-01-01');
  });
});

describe('buildBreadcrumbSchema', () => {
  it('builds the four-level breadcrumb', () => {
    const r = buildBreadcrumbSchema(ex({ name: 'Bench Press' }) as any, 'Chest');
    expect(r['@type']).toBe('BreadcrumbList');
    expect(r.itemListElement).toHaveLength(4);
    expect(r.itemListElement[2].name).toBe('Chest');
    expect(r.itemListElement[3].name).toBe('Bench Press');
  });

  it('encodes the muscle name in the URL', () => {
    const r = buildBreadcrumbSchema(ex({}) as any, 'Lower Back');
    expect(r.itemListElement[2].item).toContain('Lower%20Back');
  });
});

describe('buildExerciseGraph', () => {
  it('combines HowTo + Breadcrumb + (optional) VideoObject into @graph', () => {
    const r = buildExerciseGraph(ex({}) as any, 'Chest');
    expect(r['@context']).toBe('https://schema.org');
    expect((r['@graph'] as any[]).length).toBe(2);

    const r2 = buildExerciseGraph(ex({ videoUrl: 'https://x.mp4' }) as any, 'Chest');
    expect((r2['@graph'] as any[]).length).toBe(3);
  });
});

describe('canonical URL helpers', () => {
  it('exerciseCanonicalUrl', () => {
    expect(exerciseCanonicalUrl(ex({ id: 'foo' }) as any)).toBe('https://liboworld.com/exercises/foo');
  });

  it('libraryCanonicalUrl with no query', () => {
    expect(libraryCanonicalUrl()).toBe('https://liboworld.com/exercises');
  });

  it('libraryCanonicalUrl with query string', () => {
    expect(libraryCanonicalUrl('muscle=Chest')).toBe('https://liboworld.com/exercises?muscle=Chest');
  });
});
