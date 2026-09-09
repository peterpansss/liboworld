// Parent ⇄ child (L/R variant) resolution for the exercise catalog.
//
// Why this exists: a "unilateral" canonical (e.g. Single-Arm Cable Overhead
// Extension) carries NO video of its own — its `_left` / `_right` children do.
// Every surface that wants a clip or a still for the canonical has to walk to
// a child and borrow it. Mobile does this in
// `libo-app-v2/src/utils/exerciseVideo.ts#findChildDonorVideoUrl`; this module
// is the web counterpart, shared by the detail page, the library grid and the
// playability filter so all three agree on what "has a video" means.
//
// The hard part is that the link is not a single reliable key:
//
//   * Supabase `exercises.id` and `exercises.slug` DIFFER for 550 of the 575
//     published canonicals, and children's `parent_id` points at the parent's
//     *id*. e.g. slug `single_arm_cable_overhead_extension` has id
//     `single_arm_cable_overhead_triceps_extension_rope`.
//   * The bundled `public/exercises.json` snapshot keys every row by its SLUG
//     (id === slug for all 829 rows) but preserves the children's Supabase
//     `parentId` verbatim — so in the bundle 214 children point at a parent id
//     that does not exist in the file at all.
//
// So a parent is identified by a SET of ids (its own, its slug, and any
// Supabase id it was merged with — see `aliasIds` in data/exercises.ts), with
// `parentName` as a last-resort structural fallback for snapshots that predate
// the alias merge. Name matching is normalized because production names carry
// real dirt: trailing spaces and ASCII hyphens where the library convention is
// an em-dash (see APP-NOTES-TRIAGE N37).

export interface FamilyParentLike {
  id: string;
  slug?: string;
  name?: string;
  /** Other ids this row is known by — typically its Supabase primary key. */
  aliasIds?: string[];
}

export interface FamilyChildLike {
  id: string;
  parentId?: string;
  parentName?: string;
  videoUrl?: string;
}

/**
 * Case/whitespace/dash-insensitive name key. Collapses runs of whitespace,
 * folds every dash variant (hyphen, en, em, minus) to a single '-', and
 * lowercases, so `"Dumbbell Row - Standard "` and `"Dumbbell Row — Standard"`
 * compare equal.
 */
export function normalizeExerciseName(name: string | undefined | null): string {
  if (!name) return '';
  return name
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Every id a child's `parentId` could legitimately carry for this parent.
 * Empty strings are dropped — Supabase stores `''` (not NULL) on canonicals,
 * and an empty key would match every other canonical.
 */
export function parentIdentifiers(parent: FamilyParentLike): Set<string> {
  const ids = new Set<string>();
  for (const candidate of [parent.id, parent.slug, ...(parent.aliasIds ?? [])]) {
    if (candidate) ids.add(candidate);
  }
  return ids;
}

/** True when `child` belongs to `parent` by id, alias id, or (fallback) name. */
export function isChildOf(child: FamilyChildLike, parent: FamilyParentLike): boolean {
  if (child.id === parent.id) return false;
  if (child.parentId && parentIdentifiers(parent).has(child.parentId)) return true;
  const parentName = normalizeExerciseName(parent.name);
  if (!parentName) return false;
  return normalizeExerciseName(child.parentName) === parentName;
}

/**
 * First child of `parent` that has a video of its own, or undefined.
 *
 * Deterministic: candidates are ordered by id ascending so the chosen donor is
 * stable across reloads and across any re-ordering of the catalog (the same
 * guarantee mobile's `findChildDonorVideoUrl` makes). Without the sort a
 * parent could show the left arm on one visit and the right on the next.
 */
export function findChildVideoDonor<T extends FamilyChildLike>(
  parent: FamilyParentLike,
  all: readonly T[],
): T | undefined {
  let best: T | undefined;
  for (const candidate of all) {
    if (!candidate.videoUrl) continue;
    if (!isChildOf(candidate, parent)) continue;
    if (!best || candidate.id < best.id) best = candidate;
  }
  return best;
}
