/**
 * Score alternative exercises by relevance to a given target.
 * Ported from libo-app-v2/src/utils/exerciseAlternatives.ts.
 */

import type { Exercise } from '../data/exercises';

interface ScoredExercise {
  exercise: Exercise;
  score: number;
}

function parseBodyFocus(bodyFocus: string): string[] {
  return bodyFocus
    .toLowerCase()
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Weights:
 *   +15  same parentId (direct variation — strongest signal)
 *   +10  exact bodyFocus match
 *    +6  partial bodyFocus overlap
 *    +4  same subcat
 *    +3  same equipment
 *    +2  same primaryCat
 *    +2  same cat (gym / home / mobility)
 *    +1  same difficulty
 */
function scoreExercise(current: Exercise, candidate: Exercise): number {
  let score = 0;

  if (current.parentId && candidate.parentId === current.parentId) score += 15;

  const currentParts = parseBodyFocus(current.bodyFocus);
  const candidateParts = parseBodyFocus(candidate.bodyFocus);

  if (candidate.bodyFocus.toLowerCase() === current.bodyFocus.toLowerCase()) {
    score += 10;
  } else {
    const hasOverlap = currentParts.some((cp) =>
      candidateParts.some((ap) => ap === cp || ap.includes(cp) || cp.includes(ap)),
    );
    if (hasOverlap) score += 6;
  }

  if (current.subcat && candidate.subcat === current.subcat) score += 4;
  if (candidate.equipment.toLowerCase() === current.equipment.toLowerCase()) score += 3;
  if (current.primaryCat && candidate.primaryCat === current.primaryCat) score += 2;
  if (candidate.cat === current.cat) score += 2;
  if (candidate.diff === current.diff) score += 1;

  return score;
}

export function getScoredAlternatives(
  currentId: string,
  allExercises: Exercise[],
): ScoredExercise[] {
  const current = allExercises.find((e) => e.id === currentId);
  if (!current) return [];

  return allExercises
    .filter((e) => e.id !== currentId)
    .map((e) => ({ exercise: e, score: scoreExercise(current, e) }))
    .filter((s) => s.score >= 6)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aCat = a.exercise.cat === current.cat ? 1 : 0;
      const bCat = b.exercise.cat === current.cat ? 1 : 0;
      if (bCat !== aCat) return bCat - aCat;
      const aEquip =
        a.exercise.equipment.toLowerCase() === current.equipment.toLowerCase() ? 1 : 0;
      const bEquip =
        b.exercise.equipment.toLowerCase() === current.equipment.toLowerCase() ? 1 : 0;
      if (bEquip !== aEquip) return bEquip - aEquip;
      return a.exercise.name.localeCompare(b.exercise.name);
    });
}

/**
 * Pick up to N recommended alternatives with equipment diversity, but only if
 * the diverse pick is within 60% of the top score (avoids showing weak matches).
 */
export function getRecommended(
  currentId: string,
  allExercises: Exercise[],
  limit: number = 3,
): Exercise[] {
  const scored = getScoredAlternatives(currentId, allExercises);
  if (scored.length === 0) return [];
  if (scored.length <= limit) return scored.map((s) => s.exercise);

  const topScore = scored[0].score;
  const diversityThreshold = topScore * 0.6;

  const picks: Exercise[] = [scored[0].exercise];
  const usedEquipment = new Set([scored[0].exercise.equipment.toLowerCase()]);

  for (const s of scored.slice(1)) {
    if (picks.length >= limit) break;
    const equip = s.exercise.equipment.toLowerCase();
    if (!usedEquipment.has(equip) && s.score >= diversityThreshold) {
      picks.push(s.exercise);
      usedEquipment.add(equip);
    }
  }

  for (const s of scored.slice(1)) {
    if (picks.length >= limit) break;
    if (!picks.some((p) => p.id === s.exercise.id)) {
      picks.push(s.exercise);
    }
  }

  return picks;
}
