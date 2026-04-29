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

export function getInstructions(exercise: {
  name: string;
  setupNotes: string;
  equipment: string;
  bodyFocus: string;
}): string[] {
  const steps: string[] = [];
  const { name, setupNotes } = exercise;
  const lower = name.toLowerCase();

  if (setupNotes) {
    const sentences = setupNotes
      .split(/\.\s+/)
      .map((s) => s.trim().replace(/\.$/, ''))
      .filter((s) => s.length > 5);
    for (const s of sentences) steps.push(s + '.');
  }

  if (steps.length < 3) {
    if (lower.includes('press') || lower.includes('push')) {
      steps.push('Brace your core and maintain a controlled tempo throughout the movement.');
      steps.push('Lower the weight under control, then press up explosively.');
      steps.push('Fully extend at the top without locking out joints.');
    } else if (lower.includes('row') || lower.includes('pull')) {
      steps.push('Initiate the movement by retracting your shoulder blades.');
      steps.push('Pull towards your body with control, squeezing at the peak contraction.');
      steps.push('Lower under control to full extension.');
    } else if (lower.includes('squat') || lower.includes('lunge')) {
      steps.push('Keep your chest up and core braced throughout the movement.');
      steps.push('Lower with control, keeping knees tracking over toes.');
      steps.push('Drive through your heels to return to the starting position.');
    } else if (lower.includes('curl')) {
      steps.push('Keep your elbows pinned to your sides throughout the movement.');
      steps.push('Curl the weight up with control, squeezing at the top.');
      steps.push('Lower slowly under control — avoid swinging.');
    } else if (
      lower.includes('stretch') ||
      lower.includes('foam roll') ||
      lower.includes('lacrosse')
    ) {
      steps.push('Move into the stretch slowly and hold at the point of mild tension.');
      steps.push('Breathe deeply and relax into the position — do not force it.');
      steps.push('Hold for the prescribed duration, then release gently.');
    } else if (lower.includes('plank') || lower.includes('hold')) {
      steps.push('Engage your core and maintain a straight line from head to heels.');
      steps.push('Breathe steadily — do not hold your breath.');
      steps.push('Hold for the prescribed duration, maintaining form throughout.');
    } else if (lower.includes('deadlift') || lower.includes('hip thrust')) {
      steps.push('Hinge at the hips, keeping your spine neutral throughout.');
      steps.push('Drive through your heels and squeeze your glutes at the top.');
      steps.push('Lower with control, maintaining tension in the target muscles.');
    } else {
      steps.push('Perform the movement with controlled tempo.');
      steps.push('Focus on mind-muscle connection with the target area.');
      steps.push('Complete all reps with proper form before increasing weight.');
    }
  }

  return steps;
}

export function getTips(exercise: { name: string; equipment: string; diff: string }): string[] {
  const tips: string[] = [];
  const lower = exercise.name.toLowerCase();

  if (exercise.equipment === 'Barbell') {
    tips.push('Start with lighter weight to perfect your form before loading up.');
  }
  if (exercise.diff === 'advanced') {
    tips.push('This is an advanced movement — ensure you can perform the basic version first.');
  }
  if (
    lower.includes('single-leg') ||
    lower.includes('single leg') ||
    lower.includes('one-arm')
  ) {
    tips.push('Start with your weaker side first to ensure balanced development.');
  }
  if (lower.includes('— left') || lower.includes('— right')) {
    tips.push('Perform equal reps on both sides for balanced development.');
  }
  if (lower.includes('stretch')) {
    tips.push('Never bounce in a stretch — hold steady and breathe.');
  }

  return tips;
}

/**
 * Stub for common-mistakes section. Heuristic per movement type — replaced by
 * AI-authored content in PR 3 via exercise_content.json sidecar.
 */
export function getCommonMistakes(exercise: { name: string; bodyFocus: string }): string[] {
  const lower = exercise.name.toLowerCase();
  const out: string[] = [];

  if (lower.includes('squat') || lower.includes('lunge')) {
    out.push('Letting the knees collapse inward — keep them tracking over your toes.');
    out.push('Rounding the lower back at the bottom — keep your chest tall and core braced.');
  } else if (lower.includes('press') || lower.includes('push')) {
    out.push('Flaring the elbows out at 90° — keep them at a comfortable 45–60° angle.');
    out.push('Bouncing the weight off your chest — control the descent.');
  } else if (lower.includes('row') || lower.includes('pull')) {
    out.push('Using momentum to swing the weight — keep your torso steady.');
    out.push('Stopping short of full contraction — pull all the way through.');
  } else if (lower.includes('deadlift') || lower.includes('hip thrust')) {
    out.push('Rounding the lower back — keep your spine neutral throughout.');
    out.push('Hyperextending at the top — finish with a squeeze, not a lean.');
  } else if (lower.includes('curl')) {
    out.push('Swinging the weight with your back — pin elbows and isolate the bicep.');
    out.push('Cutting reps short — fully extend at the bottom for full range.');
  } else if (lower.includes('plank') || lower.includes('hold')) {
    out.push('Letting the hips sag — keep a straight line from head to heels.');
    out.push('Holding your breath — breathe steadily throughout.');
  } else if (lower.includes('stretch')) {
    out.push('Bouncing into the stretch — hold steady, never bounce.');
    out.push('Forcing the range — relax into mild tension, not pain.');
  }

  return out;
}
