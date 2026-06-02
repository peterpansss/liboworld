/**
 * Shared-routine snapshot contract — mirrors the mobile app repo verbatim
 * (libo-app-v2 src/types/sharedWorkout.ts). The web renders a `shared_workouts`
 * row by id. Snapshot items carry exerciseId ONLY (no thumbnail URLs); the web
 * resolves thumbnails from the id.
 */
export type SharedWorkoutKind = 'workout' | 'plan';

export interface SharedItem {
  exerciseId: string;
  name: string;
  equipment: string;
  muscle: string;
  sets: number;
  reps: string;
  restSeconds: number | null;
}

export interface SharedSession {
  label: string;
  sets: number;
  items: SharedItem[];
}

export interface SharedWorkoutMeta {
  goal?: string;
  difficulty?: string;
  durationMin?: number;
  weeks?: number;
  frequency?: number;
  split?: string;
}

export interface SharedMuscleSummaryEntry {
  muscle: string;
  sets: number;
}

export interface SharedSnapshot {
  sessions: SharedSession[];
}

export interface SharedWorkout {
  id: string;
  ownerUserId: string | null;
  kind: SharedWorkoutKind;
  title: string;
  creatorUsername: string | null;
  meta: SharedWorkoutMeta;
  snapshot: SharedSnapshot;
  muscleSummary: SharedMuscleSummaryEntry[];
  createdAt: string;
}
