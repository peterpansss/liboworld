/**
 * EXERCISE NAME FORMAT — the one place that knows both spellings of a name.
 *
 * Owner decision 25 Nov 2026: exercise names lose their em dashes (they read
 * as AI-written). The library moves from
 *
 *     "Bulgarian Split Squat — Barbell — Back Rack — Paused — Right Leg"
 *     "Cable Glute Kickback — Right Leg"
 *
 * to
 *
 *     "Bulgarian Split Squat: Barbell, Back Rack, Paused, Right Leg"
 *     "Cable Glute Kickback: Right Leg"
 *
 * Mirror of libo-app-v2/src/utils/exerciseNameFormat.ts — keep the two
 * identical (tests/utils/exerciseNameFormat.test.ts pins the behaviour).
 *
 * RULES (same as `rewrite_name` in libo-app-v2/scripts/
 * no_em_dashes_exercise_names.py, which generates the data migration):
 *   • the FIRST dash introduces the variant and becomes ": " (French " : ");
 *   • every later dash becomes ", ";
 *   • a digit range "3—5" becomes "3-5";
 *   • the side is always the LAST qualifier: "Base: Left Leg" when it is the
 *     only one, "Base: Variant, Left Leg" otherwise. So a side child is always
 *     its parent's name + (parent has a colon ? ", " : ": ") + side, and the
 *     side parses unambiguously: no library name contained ':' or ',' before
 *     the rename (verified on production, 25 Nov 2026).
 *
 * WHY BOTH SPELLINGS STAY VALID FOREVER: names are join keys. Workout blocks,
 * programs, shared routines, cached content on old installs and — above all —
 * every member's `set_logs` / `exercise_log_notes` history carry the name as
 * it was when written. History is never rewritten, so every matcher compares
 * through `exerciseNameKey`, which maps both spellings to one key.
 *
 * Web: the bundled public/exercises.json wins over Supabase on a slug match
 * (data/exercises.ts), so until that bundle is regenerated the library keeps
 * the old spelling while live workout blocks carry the new one. Every name
 * join therefore goes through `exerciseNameKey`.
 */

/**
 * A trailing Left/Right side qualifier, in either spelling:
 *   old  "… — Left", "… — Right Leg", "… - Left Arm"
 *   new  "…: Left", "…, Right Leg", "… : Gauche"-style French colon spacing
 * Group 1 is the side word.
 */
export const SIDE_SUFFIX_RE = /\s*[\u2014\u2013:,-]\s*(Left|Right)(\s+(Leg|Arm|Side|Hip|Shoulder))?\s*$/i;

/**
 * Match key for an exercise name: lowercased; every qualifier separator
 * (em/en dash, ": ", ", ", spaced hyphen) collapsed to " - "; digit ranges to
 * "3-5"; whitespace runs to one space. "Leg Press — Standard",
 * "Leg Press: Standard" and "leg press - standard" share one key. A hyphen
 * inside a word ("Push-Up") is left alone.
 */
export function exerciseNameKey(name: string | null | undefined): string {
  return (name ?? '')
    .toLowerCase()
    .replace(/(\d)\s*[\u2014\u2013]\s*(\d)/g, '$1-$2')
    .replace(/\s*[\u2014\u2013:,]\s*|\s+-\s+/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DASH_SPLIT = /\s*\u2014\s*|\s+\u2013\s+/;

/**
 * Old dashed spelling → new spelling. Identity for a name with no dash.
 * Port of `rewrite_name` in the migration generator.
 */
export function modernExerciseName(name: string, colon: ': ' | ' : ' = ': '): string {
  if (!name || (!name.includes('\u2014') && !name.includes(' \u2013 '))) return name;
  const ranged = name.replace(/(\d)\s*\u2014\s*(\d)/g, '$1-$2');
  const parts = ranged.split(DASH_SPLIT);
  if (parts.length === 1) return ranged;
  return parts[0].trimEnd() + colon + parts.slice(1).join(', ');
}

/**
 * New spelling → the old dashed one, so a history table written before the
 * rename can be queried with an index (`exercise_name IN (?, ?)`). Exact
 * inverse of `modernExerciseName` for every pre-rename library name (none
 * contained ':' or ','). Identity for a name with no colon.
 */
export function legacyExerciseName(name: string): string {
  if (!name) return name;
  const m = name.match(/^(.*?)\s*:\s+(.*)$/);
  if (!m) return name;
  return `${m[1]} \u2014 ${m[2].split(/\s*,\s+/).join(' \u2014 ')}`;
}

/**
 * Every spelling a history row for `name` may carry: the name as given, the
 * old dashed form and the new form, de-duplicated. Always length ≥ 1.
 */
export function exerciseNameSpellings(name: string): string[] {
  const out = [name, legacyExerciseName(name), modernExerciseName(name)];
  return out.filter((v, i) => v && out.indexOf(v) === i);
}

/** Strip the trailing side qualifier from a child name (either spelling). */
export function parentNameOf(childName: string): string {
  return childName.replace(SIDE_SUFFIX_RE, '').trim();
}

/** 'L' / 'R' when the name ends in a side qualifier, else null. */
export function sideOf(name: string): 'L' | 'R' | null {
  const m = name.match(SIDE_SUFFIX_RE);
  if (!m) return null;
  return m[1].toLowerCase() === 'left' ? 'L' : 'R';
}

/**
 * The name a side child gets (new spelling): "Base: Left Leg" or, when the
 * parent already carries a qualifier, "Base: Variant, Left Leg".
 */
export function bilateralChildName(parent: string, side: 'Left' | 'Right', label = ''): string {
  const base = modernExerciseName(parent.trim());
  if (!base) return '';
  const tail = label ? `${side} ${label}` : side;
  return /\s:\s|:\s/.test(base) ? `${base}, ${tail}` : `${base}: ${tail}`;
}

/**
 * True when `longer` is `shorter` plus one or more qualifiers, in either
 * spelling ("Reverse Lunge" ⊂ "Reverse Lunge: Bodyweight, Left Leg").
 * Replaces the old `startsWith(name + ' —')` checks.
 */
export function isQualifiedForm(longer: string, shorter: string): boolean {
  const k = exerciseNameKey(shorter);
  return k.length > 0 && exerciseNameKey(longer).startsWith(k + ' - ');
}
