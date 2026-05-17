/**
 * Coverage for src/utils/exerciseAlternatives.ts (web port).
 * This module is a port of the mobile equivalent — same scoring weights,
 * but lookups happen by `id` instead of `name`.
 */
import { describe, expect, it } from 'vitest';
import { getScoredAlternatives, getRecommended } from '../../src/utils/exerciseAlternatives';

function ex(o: any) {
  return {
    id: o.id ?? 'e_' + Math.random().toString(36).slice(2),
    name: o.name ?? 'X',
    cat: o.cat ?? 'gym',
    bodyFocus: o.bodyFocus ?? 'Chest',
    equipment: o.equipment ?? 'Barbell',
    diff: o.diff ?? 'beginner',
    setupNotes: '',
    machineRequired: false,
    variation: '',
    emoji: '',
    primaryCat: o.primaryCat,
    subcat: o.subcat,
    parentId: o.parentId,
  } as any;
}

describe('getScoredAlternatives (web)', () => {
  it('returns [] when the source id is not in the list', () => {
    expect(getScoredAlternatives('missing', [ex({ id: 'a' })])).toEqual([]);
  });

  it('drops candidates below the threshold (score < 6)', () => {
    const a = ex({ id: 'a', cat: 'gym', primaryCat: 'P', subcat: 'S', equipment: 'Barbell', bodyFocus: 'Chest', diff: 'beginner' });
    const b = ex({ id: 'b', cat: 'home', primaryCat: 'Q', subcat: 'T', equipment: 'Cable', bodyFocus: 'Back', diff: 'advanced' });
    expect(getScoredAlternatives('a', [a, b])).toEqual([]);
  });

  it('parentId match is the strongest signal', () => {
    const src = ex({ id: 'src', parentId: 'p', bodyFocus: 'Chest', equipment: 'Barbell', cat: 'gym' });
    const sib = ex({ id: 'sib', parentId: 'p', bodyFocus: 'Chest', equipment: 'Barbell', cat: 'gym' });
    const oth = ex({ id: 'oth', parentId: 'q', bodyFocus: 'Chest', equipment: 'Barbell', cat: 'gym' });
    const r = getScoredAlternatives('src', [src, sib, oth]);
    expect(r[0].exercise.id).toBe('sib');
  });
});

describe('getRecommended (web)', () => {
  it('returns up to `limit` picks (default 3)', () => {
    const src = ex({ id: 's', bodyFocus: 'Chest' });
    const cands = Array.from({ length: 6 }).map((_, i) => ex({ id: 'c' + i, bodyFocus: 'Chest' }));
    expect(getRecommended('s', [src, ...cands]).length).toBeLessThanOrEqual(3);
  });

  it('returns all when fewer than limit', () => {
    const src = ex({ id: 's', bodyFocus: 'Chest' });
    const a = ex({ id: 'a', bodyFocus: 'Chest', equipment: 'Cable' });
    const b = ex({ id: 'b', bodyFocus: 'Chest', equipment: 'Dumbbell' });
    expect(getRecommended('s', [src, a, b]).length).toBe(2);
  });

  it('respects custom limit', () => {
    const src = ex({ id: 's', bodyFocus: 'Chest' });
    const cands = Array.from({ length: 6 }).map((_, i) => ex({ id: 'c' + i, bodyFocus: 'Chest' }));
    expect(getRecommended('s', [src, ...cands], 5).length).toBe(5);
  });
});
