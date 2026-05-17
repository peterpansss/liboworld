/**
 * Exercise info utilities — muscle groups, instructions, and tips
 * derived from exercise metadata. Ported from libo-app-v2.
 */

export interface MuscleGroup {
  name: string;
  intensity: 'primary' | 'secondary';
}

const BODY_FOCUS_MUSCLE_MAP: Record<string, MuscleGroup[]> = {
  Chest: [
    { name: 'Chest', intensity: 'primary' },
    { name: 'Front Delts', intensity: 'secondary' },
    { name: 'Triceps', intensity: 'secondary' },
  ],
  Back: [
    { name: 'Lats', intensity: 'primary' },
    { name: 'Rhomboids', intensity: 'primary' },
    { name: 'Rear Delts', intensity: 'secondary' },
    { name: 'Biceps', intensity: 'secondary' },
  ],
  Shoulders: [
    { name: 'Front Delts', intensity: 'primary' },
    { name: 'Side Delts', intensity: 'primary' },
    { name: 'Rear Delts', intensity: 'secondary' },
    { name: 'Traps', intensity: 'secondary' },
  ],
  Biceps: [
    { name: 'Biceps', intensity: 'primary' },
    { name: 'Forearms', intensity: 'secondary' },
  ],
  Triceps: [
    { name: 'Triceps', intensity: 'primary' },
    { name: 'Chest', intensity: 'secondary' },
  ],
  Legs: [
    { name: 'Quads', intensity: 'primary' },
    { name: 'Hamstrings', intensity: 'primary' },
    { name: 'Glutes', intensity: 'secondary' },
    { name: 'Calves', intensity: 'secondary' },
  ],
  Glutes: [
    { name: 'Glutes', intensity: 'primary' },
    { name: 'Hamstrings', intensity: 'secondary' },
    { name: 'Hip Flexors', intensity: 'secondary' },
  ],
  Core: [
    { name: 'Abs', intensity: 'primary' },
    { name: 'Obliques', intensity: 'primary' },
    { name: 'Lower Back', intensity: 'secondary' },
  ],
  Hamstrings: [
    { name: 'Hamstrings', intensity: 'primary' },
    { name: 'Glutes', intensity: 'secondary' },
    { name: 'Lower Back', intensity: 'secondary' },
  ],
  Calves: [{ name: 'Calves', intensity: 'primary' }],
  Forearms: [
    { name: 'Forearms', intensity: 'primary' },
    { name: 'Biceps', intensity: 'secondary' },
  ],
  Traps: [
    { name: 'Traps', intensity: 'primary' },
    { name: 'Rear Delts', intensity: 'secondary' },
    { name: 'Rhomboids', intensity: 'secondary' },
  ],
  'Full Body': [
    { name: 'Quads', intensity: 'primary' },
    { name: 'Glutes', intensity: 'primary' },
    { name: 'Core', intensity: 'primary' },
    { name: 'Shoulders', intensity: 'secondary' },
    { name: 'Back', intensity: 'secondary' },
  ],
  Quads: [
    { name: 'Quads', intensity: 'primary' },
    { name: 'Glutes', intensity: 'secondary' },
    { name: 'Calves', intensity: 'secondary' },
  ],
};

function parseBodyFocus(bodyFocus: string): string[] {
  return bodyFocus
    .split(/[\/&,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getMuscleGroups(bodyFocus: string): MuscleGroup[] {
  const parts = parseBodyFocus(bodyFocus);
  const seen = new Set<string>();
  const result: MuscleGroup[] = [];

  for (const part of parts) {
    const mapped = BODY_FOCUS_MUSCLE_MAP[part];
    if (mapped) {
      for (const m of mapped) {
        if (!seen.has(m.name)) {
          seen.add(m.name);
          result.push(m);
        }
      }
    } else {
      const key = Object.keys(BODY_FOCUS_MUSCLE_MAP).find(
        (k) =>
          part.toLowerCase().includes(k.toLowerCase()) ||
          k.toLowerCase().includes(part.toLowerCase()),
      );
      if (key) {
        for (const m of BODY_FOCUS_MUSCLE_MAP[key]) {
          if (!seen.has(m.name)) {
            seen.add(m.name);
            result.push(m);
          }
        }
      } else if (!seen.has(part)) {
        seen.add(part);
        result.push({ name: part, intensity: 'primary' });
      }
    }
  }

  return result;
}

/** Top-level muscle group (one of the 13 keys) for a given bodyFocus. Used for navigation/filtering. */
export function getPrimaryMuscleGroup(bodyFocus: string): string {
  const parts = parseBodyFocus(bodyFocus);
  for (const part of parts) {
    if (BODY_FOCUS_MUSCLE_MAP[part]) return part;
    const key = Object.keys(BODY_FOCUS_MUSCLE_MAP).find(
      (k) =>
        part.toLowerCase().includes(k.toLowerCase()) ||
        k.toLowerCase().includes(part.toLowerCase()),
    );
    if (key) return key;
  }
  return parts[0] ?? bodyFocus;
}

export const MUSCLE_GROUP_KEYS = Object.keys(BODY_FOCUS_MUSCLE_MAP);

/** i18next-compatible translation function — kept loose so we don't pull i18next types here. */
type TFn = (k: string, opts?: Record<string, unknown>) => unknown;

type InstructionsBucket =
  | 'press'
  | 'pull'
  | 'squat'
  | 'curl'
  | 'stretch'
  | 'hold'
  | 'hinge'
  | 'default';

type MistakesBucket =
  | 'squat'
  | 'press'
  | 'pull'
  | 'hinge'
  | 'curl'
  | 'hold'
  | 'stretch'
  | null;

function pickInstructionsBucket(name: string): InstructionsBucket {
  const lower = name.toLowerCase();
  if (lower.includes('press') || lower.includes('push')) return 'press';
  if (lower.includes('row') || lower.includes('pull')) return 'pull';
  if (lower.includes('squat') || lower.includes('lunge')) return 'squat';
  if (lower.includes('curl')) return 'curl';
  if (
    lower.includes('stretch') ||
    lower.includes('foam roll') ||
    lower.includes('lacrosse')
  )
    return 'stretch';
  if (lower.includes('plank') || lower.includes('hold')) return 'hold';
  if (lower.includes('deadlift') || lower.includes('hip thrust')) return 'hinge';
  return 'default';
}

function pickMistakesBucket(name: string): MistakesBucket {
  const lower = name.toLowerCase();
  if (lower.includes('squat') || lower.includes('lunge')) return 'squat';
  if (lower.includes('press') || lower.includes('push')) return 'press';
  if (lower.includes('row') || lower.includes('pull')) return 'pull';
  if (lower.includes('deadlift') || lower.includes('hip thrust')) return 'hinge';
  if (lower.includes('curl')) return 'curl';
  if (lower.includes('plank') || lower.includes('hold')) return 'hold';
  if (lower.includes('stretch')) return 'stretch';
  return null;
}

const INSTRUCTIONS_FALLBACK_EN: Record<InstructionsBucket, string[]> = {
  press: [
    'Brace your core and maintain a controlled tempo throughout the movement.',
    'Lower the weight under control, then press up explosively.',
    'Fully extend at the top without locking out joints.',
  ],
  pull: [
    'Initiate the movement by retracting your shoulder blades.',
    'Pull towards your body with control, squeezing at the peak contraction.',
    'Lower under control to full extension.',
  ],
  squat: [
    'Keep your chest up and core braced throughout the movement.',
    'Lower with control, keeping knees tracking over toes.',
    'Drive through your heels to return to the starting position.',
  ],
  curl: [
    'Keep your elbows pinned to your sides throughout the movement.',
    'Curl the weight up with control, squeezing at the top.',
    'Lower slowly under control — avoid swinging.',
  ],
  stretch: [
    'Move into the stretch slowly and hold at the point of mild tension.',
    'Breathe deeply and relax into the position — do not force it.',
    'Hold for the prescribed duration, then release gently.',
  ],
  hold: [
    'Engage your core and maintain a straight line from head to heels.',
    'Breathe steadily — do not hold your breath.',
    'Hold for the prescribed duration, maintaining form throughout.',
  ],
  hinge: [
    'Hinge at the hips, keeping your spine neutral throughout.',
    'Drive through your heels and squeeze your glutes at the top.',
    'Lower with control, maintaining tension in the target muscles.',
  ],
  default: [
    'Perform the movement with controlled tempo.',
    'Focus on mind-muscle connection with the target area.',
    'Complete all reps with proper form before increasing weight.',
  ],
};

const TIPS_FALLBACK_EN = {
  barbell: 'Start with lighter weight to perfect your form before loading up.',
  advanced: 'This is an advanced movement — ensure you can perform the basic version first.',
  unilateral: 'Start with your weaker side first to ensure balanced development.',
  sided: 'Perform equal reps on both sides for balanced development.',
  stretch: 'Never bounce in a stretch — hold steady and breathe.',
} as const;

const MISTAKES_FALLBACK_EN: Record<NonNullable<MistakesBucket>, string[]> = {
  squat: [
    'Letting the knees collapse inward — keep them tracking over your toes.',
    'Rounding the lower back at the bottom — keep your chest tall and core braced.',
  ],
  press: [
    'Flaring the elbows out at 90° — keep them at a comfortable 45–60° angle.',
    'Bouncing the weight off your chest — control the descent.',
  ],
  pull: [
    'Using momentum to swing the weight — keep your torso steady.',
    'Stopping short of full contraction — pull all the way through.',
  ],
  hinge: [
    'Rounding the lower back — keep your spine neutral throughout.',
    'Hyperextending at the top — finish with a squeeze, not a lean.',
  ],
  curl: [
    'Swinging the weight with your back — pin elbows and isolate the bicep.',
    'Cutting reps short — fully extend at the bottom for full range.',
  ],
  hold: [
    'Letting the hips sag — keep a straight line from head to heels.',
    'Holding your breath — breathe steadily throughout.',
  ],
  stretch: [
    'Bouncing into the stretch — hold steady, never bounce.',
    'Forcing the range — relax into mild tension, not pain.',
  ],
};

function readArrayKey(t: TFn, key: string): string[] | null {
  const result = t(key, { returnObjects: true });
  return Array.isArray(result) && result.every((x) => typeof x === 'string')
    ? (result as string[])
    : null;
}

export function getInstructions(
  exercise: {
    name: string;
    setupNotes: string;
    equipment: string;
    bodyFocus: string;
  },
  t?: TFn,
): string[] {
  const steps: string[] = [];
  const { setupNotes } = exercise;

  if (setupNotes) {
    const sentences = setupNotes
      .split(/\.\s+/)
      .map((s) => s.trim().replace(/\.$/, ''))
      .filter((s) => s.length > 5);
    for (const s of sentences) steps.push(s + '.');
  }

  if (steps.length < 3) {
    const bucket = pickInstructionsBucket(exercise.name);
    const translated = t
      ? readArrayKey(t, `exerciseDetail.heuristics.instructions.${bucket}`)
      : null;
    const fallback = translated ?? INSTRUCTIONS_FALLBACK_EN[bucket];
    steps.push(...fallback);
  }

  return steps;
}

export function getTips(
  exercise: { name: string; equipment: string; diff: string },
  t?: TFn,
): string[] {
  const tips: string[] = [];
  const lower = exercise.name.toLowerCase();
  const tip = (key: keyof typeof TIPS_FALLBACK_EN): string => {
    if (t) {
      const translated = t(`exerciseDetail.heuristics.tips.${key}`);
      if (typeof translated === 'string') return translated;
    }
    return TIPS_FALLBACK_EN[key];
  };

  if (exercise.equipment === 'Barbell') {
    tips.push(tip('barbell'));
  }
  if (exercise.diff === 'advanced') {
    tips.push(tip('advanced'));
  }
  if (
    lower.includes('single-leg') ||
    lower.includes('single leg') ||
    lower.includes('one-arm')
  ) {
    tips.push(tip('unilateral'));
  }
  if (lower.includes('— left') || lower.includes('— right')) {
    tips.push(tip('sided'));
  }
  if (lower.includes('stretch')) {
    tips.push(tip('stretch'));
  }

  return tips;
}

/**
 * Stub for common-mistakes section. Heuristic per movement type — replaced by
 * AI-authored content in PR 3 via exercise_content.json sidecar.
 */
export function getCommonMistakes(
  exercise: { name: string; bodyFocus: string },
  t?: TFn,
): string[] {
  const bucket = pickMistakesBucket(exercise.name);
  if (!bucket) return [];
  const translated = t
    ? readArrayKey(t, `exerciseDetail.heuristics.mistakes.${bucket}`)
    : null;
  return translated ?? MISTAKES_FALLBACK_EN[bucket];
}
