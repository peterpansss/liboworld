import { create } from 'zustand';

export interface OnboardingData {
  step: number;
  name: string;
  goal: string;
  goalDetail: string;
  gender: string;
  age: string;
  height: string;
  weight: string;
  targetWeight: string;
  activityLevel: string;
  level: string;
  days: string;
  timeOfDay: string;
  duration: string;
  equip: string[];
  location: string;
  injuries: string[];
  focusAreas: string[];
  diet: string;
  sleep: string;
  motivation: string;
  challenge: string;
}

export interface WorkoutLog {
  id: string;
  name: string;
  emoji: string;
  date: string;
  dur: number;
  cal: number;
}

export interface PlayerState {
  exerciseIndex: number;
  phase: 'playing' | 'rest' | 'done';
  logModal: boolean;
  sets: Array<{ weight: number; reps: number }>;
  completedSets: Array<{ exercise: string; weight: number; reps: number }>;
}

export interface BuilderState {
  step: 'pick' | 'details' | 'preview';
  name: string;
  exercises: string[];
  searchQ: string;
  filter: string;
}

export interface AiGenState {
  step: 'form' | 'loading' | 'result';
  goal: string;
  equip: string;
  duration: number;
  focus: string;
  generated: unknown | null;
}

export type Tab = 'home' | 'explore' | 'programs' | 'progress' | 'rewards';
export type ExploreTab = 'workouts' | 'exercises';

interface AppState {
  // Navigation
  tab: Tab;
  exploreTab: ExploreTab;
  exploreFilter: string;
  searchQ: string;
  exploreLimit: number;

  // Data
  user: OnboardingData | null;
  logs: WorkoutLog[];
  selectedWorkoutId: string | null;
  challengeProgress: Record<string, unknown>;
  customWorkouts: unknown[];
  waterDate: string;
  waterCount: number;

  // Sub-states
  player: PlayerState;
  builder: BuilderState;
  aiGen: AiGenState;

  // Actions
  setTab: (tab: Tab) => void;
  setExploreTab: (tab: ExploreTab) => void;
  setExploreFilter: (filter: string) => void;
  setSearchQ: (q: string) => void;
  loadMoreExplore: () => void;
  setUser: (user: OnboardingData) => void;
  addLog: (log: WorkoutLog) => void;
  selectWorkout: (id: string | null) => void;
  setWaterCount: (count: number) => void;
}

const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

export const useAppStore = create<AppState>((set) => ({
  tab: 'home',
  exploreTab: 'workouts',
  exploreFilter: 'all',
  searchQ: '',
  exploreLimit: 60,
  user: loadFromStorage('libo_user', null),
  logs: loadFromStorage('libo_logs', []),
  selectedWorkoutId: null,
  challengeProgress: loadFromStorage('libo_challenge_progress', {}),
  customWorkouts: loadFromStorage('libo_custom_workouts', []),
  waterDate: new Date().toDateString(),
  waterCount: parseInt(localStorage.getItem('libo_water_' + new Date().toDateString()) || '0'),
  player: { exerciseIndex: 0, phase: 'playing', logModal: false, sets: [], completedSets: [] },
  builder: { step: 'pick', name: 'My Workout', exercises: [], searchQ: '', filter: 'All' },
  aiGen: { step: 'form', goal: '', equip: 'none', duration: 30, focus: 'Full Body', generated: null },

  setTab: (tab) => set({ tab }),
  setExploreTab: (tab) => set({ exploreTab: tab }),
  setExploreFilter: (filter) => set({ exploreFilter: filter }),
  setSearchQ: (q) => set({ searchQ: q }),
  loadMoreExplore: () => set((s) => ({ exploreLimit: s.exploreLimit + 60 })),
  setUser: (user) => {
    localStorage.setItem('libo_user', JSON.stringify(user));
    set({ user });
  },
  addLog: (log) => set((s) => {
    const logs = [log, ...s.logs].slice(0, 20);
    localStorage.setItem('libo_logs', JSON.stringify(logs));
    return { logs };
  }),
  selectWorkout: (id) => set({ selectedWorkoutId: id }),
  setWaterCount: (count) => {
    const date = new Date().toDateString();
    localStorage.setItem('libo_water_' + date, String(count));
    set({ waterCount: count, waterDate: date });
  },
}));
