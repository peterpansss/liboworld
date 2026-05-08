/**
 * Shared mappings from raw English-keyed values (as stored in exercises.json
 * and used throughout the data layer) to the leaf keys under their respective
 * i18n namespaces. Centralized here so ExerciseLibrary, ExerciseDetail,
 * MuscleGroupStrip, AnatomyDiagram, and AlternativesGrid all resolve the
 * same label for the same value.
 */

export const MUSCLE_I18N_KEYS: Record<string, string> = {
  All: 'all',
  Chest: 'chest',
  Back: 'back',
  Shoulders: 'shoulders',
  Biceps: 'biceps',
  Triceps: 'triceps',
  Core: 'core',
  Legs: 'legs',
  Glutes: 'glutes',
  Cardio: 'cardio',
  'Full Body': 'fullBody',
  Forearms: 'forearms',
  Traps: 'traps',
};

export const EQUIPMENT_I18N_KEYS: Record<string, string> = {
  All: 'all',
  Bodyweight: 'bodyweight',
  Barbell: 'barbell',
  Dumbbell: 'dumbbell',
  Cable: 'cable',
  Machine: 'machine',
  Kettlebell: 'kettlebell',
  'Resistance Bands': 'resistanceBands',
  Bar: 'bar',
  'Swiss Ball': 'swissBall',
};

export const SETTING_I18N_KEYS: Record<string, string> = {
  All: 'all',
  Gym: 'gym',
  Home: 'home',
};

export const TYPE_I18N_KEYS: Record<string, string> = {
  All: 'all',
  Strength: 'strength',
  Cardio: 'cardio',
  HIIT: 'hiit',
  Power: 'power',
  Mobility: 'mobility',
  Stretching: 'stretching',
  Core: 'core',
  'Pelvic Floor': 'pelvicFloor',
  'Warm-Up': 'warmUp',
};

/**
 * AnatomyDiagram + getMuscleGroups produce these granular muscle names.
 * Mapped onto exerciseLibrary.muscles.* keys so the legend chips in
 * AnatomyDiagram share the same translated vocabulary as the muscle filter.
 */
export const MUSCLE_NAME_I18N_KEYS: Record<string, string> = {
  Chest: 'chest',
  Back: 'back',
  Shoulders: 'shoulders',
  Biceps: 'biceps',
  Triceps: 'triceps',
  Core: 'core',
  Legs: 'legs',
  Glutes: 'glutes',
  'Full Body': 'fullBody',
  Forearms: 'forearms',
  Traps: 'traps',
  Quads: 'quads',
  Hamstrings: 'hamstrings',
  Calves: 'calves',
  'Front Delts': 'frontDelts',
  'Side Delts': 'sideDelts',
  'Rear Delts': 'rearDelts',
  Lats: 'lats',
  Rhomboids: 'rhomboids',
  Abs: 'abs',
  Obliques: 'obliques',
  'Lower Back': 'lowerBack',
  'Hip Flexors': 'hipFlexors',
};
