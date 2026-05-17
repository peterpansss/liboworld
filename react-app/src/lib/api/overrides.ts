/**
 * Content overrides for exercises and workouts. Includes the storage-agent
 * owned upload functions (uploadExerciseVideo, uploadExerciseThumbnail).
 * Re-exports from adminApi.ts.
 */
export {
  type ExerciseOverride,
  type WorkoutOverride,
  listExerciseOverrides,
  listWorkoutOverrides,
  upsertExerciseOverride,
  replaceExerciseOverride,
  deleteExerciseOverride,
  upsertWorkoutOverride,
  replaceWorkoutOverride,
  deleteWorkoutOverride,
  uploadExerciseVideo,
  uploadExerciseThumbnail,
} from '../adminApi';
