/**
 * Content overrides for exercises and workouts. Includes the storage-agent
 * owned upload functions (uploadExerciseVideo, uploadExerciseThumbnail).
 * Re-exports from adminApi.ts.
 *
 * The `delete*Override` names resolve to the re-auth-gated wrappers for UI
 * callers; the `_unsafe` variants are exported for tests.
 */
export {
  type ExerciseOverride,
  type WorkoutOverride,
  listExerciseOverrides,
  listWorkoutOverrides,
  upsertExerciseOverride,
  replaceExerciseOverride,
  deleteExerciseOverrideWithReauth as deleteExerciseOverride,
  deleteExerciseOverride_unsafe,
  upsertWorkoutOverride,
  replaceWorkoutOverride,
  deleteWorkoutOverrideWithReauth as deleteWorkoutOverride,
  deleteWorkoutOverride_unsafe,
  uploadExerciseVideo,
  uploadExerciseThumbnail,
} from '../adminApi';
