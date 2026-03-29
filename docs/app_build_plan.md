# Libo Mobile App — Comprehensive Implementation Plan

## 1. Tech Stack

**React Native + Expo (SDK 52+)** with expo-dev-client for native module access.

| Component | Technology |
|-----------|-----------|
| Framework | Expo SDK 52+ with expo-dev-client |
| Language | TypeScript (Swift only for scanner native module) |
| Navigation | expo-router v4 (file-based routing) |
| Styling | NativeWind v4 (Tailwind CSS for RN) |
| State | Zustand + MMKV for persistence |
| Database | SQLite via expo-sqlite (offline-first) |
| Auth | Supabase Auth (Apple Sign-In + email) |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Animations | react-native-reanimated v3 + gesture-handler |
| Video | expo-video for exercise demos |
| Camera | expo-camera v15 |
| Scanner ML | Custom Expo module wrapping Core ML (Swift) |
| Charts | victory-native for progress screen |
| AI Cloud | Claude API via Supabase Edge Functions |

**Why React Native over Swift/Flutter:**
- Prototype already uses React-like render pattern (state object, render(), attachEvents())
- Single codebase for iOS + Android (Android later without rebuild)
- Core ML accessed via Swift native module (native performance where it matters)
- 95% of app stays in TypeScript, only scanner in Swift
- Fastest developer velocity (hot reload, OTA updates)

---

## 2. App Architecture

### 2.1 Folder Structure

```
libo-app/
  app/                          # expo-router file-based routes
    _layout.tsx                 # Root layout (fonts, providers, splash)
    (auth)/
      _layout.tsx
      sign-in.tsx
      sign-up.tsx
    (onboarding)/
      _layout.tsx               # Onboarding stack layout
      index.tsx                 # Step controller (22 steps)
      complete.tsx              # Plan summary + "Enter Libo"
    (tabs)/
      _layout.tsx               # Tab bar layout (5 tabs)
      index.tsx                 # Home tab
      explore/
        _layout.tsx
        index.tsx               # Explore (workouts/exercises tabs)
        exercise/[id].tsx       # Exercise detail
        workout/[id].tsx        # Workout detail v2
      programs/
        _layout.tsx
        index.tsx               # Programs list
        [id].tsx                # Program detail (week view)
      scanner/
        _layout.tsx
        index.tsx               # Scanner (camera + library modes)
      progress/
        _layout.tsx
        index.tsx               # Progress dashboard
    (player)/
      _layout.tsx               # Full-screen player (no tabs)
      [workoutId].tsx           # Workout player v2
      complete.tsx              # Workout complete screen
    (builder)/
      _layout.tsx
      custom.tsx                # Custom workout builder
      ai-generate.tsx           # AI workout generator

  src/
    components/
      ui/                       # Design system primitives
        Button.tsx
        Card.tsx
        Badge.tsx
        Chip.tsx
        ProgressBar.tsx
        Input.tsx
        BottomSheet.tsx
        MuscleMap.tsx
      onboarding/
        StepWrapper.tsx
        ChoiceCard.tsx
        ChipGrid.tsx
      home/
        HeroCard.tsx
        StatsRow.tsx
        FeaturedGrid.tsx
        RecentActivity.tsx
      explore/
        SearchBar.tsx
        FilterChips.tsx
        ExerciseListItem.tsx
        WorkoutGridCard.tsx
        TabSwitcher.tsx
      workout/
        WorkoutHero.tsx
        ExerciseBlock.tsx
        ExerciseRow.tsx
      player/
        PlayerHeader.tsx
        ExerciseExpanded.tsx
        ExerciseCollapsed.tsx
        SetLoggingModal.tsx
        PauseOverlay.tsx
        RestTimer.tsx
      scanner/
        CameraViewfinder.tsx
        ScanResultCard.tsx
        AlternativeCard.tsx
        LibraryDropdown.tsx
      programs/
        ProgramCard.tsx
        WeekDots.tsx
        DayCalendar.tsx
      progress/
        WeeklyChart.tsx
        WorkoutLog.tsx
        WaterTracker.tsx

    store/
      useUserStore.ts
      useWorkoutStore.ts
      useProgressStore.ts
      useScannerStore.ts
      useBuilderStore.ts

    db/
      schema.ts
      seed.ts                   # Import 718 exercises + 140 workouts
      queries/
        exercises.ts
        workouts.ts
        programs.ts
        logs.ts

    services/
      api.ts                    # Supabase client init
      auth.ts
      sync.ts                   # Local <-> cloud sync
      scanner/
        classifier.ts
        alternatives.ts
        cloud-fallback.ts       # Claude Vision API call

    hooks/
      useExercises.ts
      useWorkouts.ts
      useTimer.ts
      useCamera.ts

    utils/
      colors.ts
      typography.ts
      helpers.ts
      haptics.ts

    types/
      exercise.ts
      workout.ts
      program.ts
      user.ts
      scanner.ts

  modules/
    libo-scanner/               # Expo native module (Swift)
      ios/
        LiboScannerModule.swift
        MLModels/
          ClassificationRouter.mlmodel
          GymEquipment.mlmodel
          PoseEstimator.mlmodel
      src/
        index.ts
        LiboScanner.types.ts

  assets/
    fonts/
      Inter-*.ttf
      BarlowCondensed-*.ttf
    images/
      exercises/
      onboarding/
    ml-models/
```

### 2.2 Data Models

```typescript
// Exercise
interface Exercise {
  id: string;
  name: string;
  cat: 'gym' | 'home' | 'mobility';
  bodyFocus: string;
  equipment: string;
  machineRequired: boolean;
  diff: 'beginner' | 'intermediate' | 'advanced';
  variation: string;
  emoji: string;
  setupNotes: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  muscleGroups: string[];
  alternatives?: string[];
}

// Workout
interface WorkoutExercise {
  exercise: string;
  sets: string;
  reps: string;
  notes?: string;
}

interface Workout {
  id: string;
  name: string;
  cat: string;
  diff: string;
  dur: number;
  emoji: string;
  warmup: WorkoutExercise[];
  main: WorkoutExercise[];
  cooldown: WorkoutExercise[];
}

// User Profile
interface UserProfile {
  id: string;
  name: string;
  goal: string;
  goalDetail: string;
  gender: string;
  age: number;
  height: number;
  weight: number;
  targetWeight: number;
  activityLevel: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  days: number;
  timeOfDay: string;
  duration: string;
  equipment: string[];
  location: string;
  injuries: string[];
  focusAreas: string[];
  diet: string;
  sleep: string;
  motivation: string;
  challenge: string;
  createdAt: string;
}

// Scanner
interface ScanResult {
  mode: 'machine' | 'label' | 'object' | 'exercise';
  confidence: number;
  identified: string;
  description: string;
  muscleGroups: string[];
  formGuide: string[];
  alternatives: ScanAlternative[];
  imageUri?: string;
}

interface ScanAlternative {
  name: string;
  tags: string[];
  instruction: string;
  emoji: string;
  difficulty: 'Easier' | 'Same' | 'Harder';
  equipment: string;
}
```

### 2.3 Navigation Architecture

```
RootLayout (fonts, Zustand provider, auth check)
  ├── (auth) — Stack
  │     sign-in
  │     sign-up
  ├── (onboarding) — Stack (22-step flow)
  │     index (step controller)
  │     complete (summary)
  ├── (tabs) — Bottom Tab Navigator
  │     Programs  — Stack
  │     Explore   — Stack (workout/[id], exercise/[id])
  │     Home      — Stack
  │     Scanner   — Stack
  │     Progress  — Stack
  ├── (player) — Modal Stack (full screen, no tabs)
  │     [workoutId] (player v2)
  │     complete (confetti + stats)
  └── (builder) — Modal Stack
        custom
        ai-generate
```

### 2.4 Zustand Stores

| Store | Data | Persisted |
|-------|------|-----------|
| useUserStore | User profile, onboarding data, isOnboarded | Yes (MMKV) |
| useWorkoutStore | Active workout, player state, timer | No (session) |
| useProgressStore | Logs, stats, streaks, water tracker | Yes (MMKV + Supabase) |
| useScannerStore | Mode, state, results, scan history | Partial |
| useBuilderStore | Builder step, exercises, AI config | No (session) |

### 2.5 SQLite Tables

- `exercises` (718 rows, seeded from libo-data.js)
- `workouts` (140 rows)
- `workout_exercises` (join table: workout_id → exercise)
- `programs` (derived from challenge workouts)
- `custom_workouts` (user-created)
- `workout_logs` (completed workouts + per-exercise set data)
- `scan_history` (scanner results)

### 2.6 Design Tokens

```typescript
const colors = {
  bg: '#080808',
  bg2: '#0E0E0E',
  bg3: '#141414',
  bg4: '#1A1A1A',
  accent: '#CAFF00',
  accent2: '#9BC800',
  accentDim: 'rgba(202,255,0,0.12)',
  text: '#FFFFFF',
  muted: '#8A9BB0',
  dim: '#4A5568',
  border: 'rgba(255,255,255,0.07)',
  card: 'rgba(255,255,255,0.04)',
};

const fonts = {
  display: 'BarlowCondensed',   // 700, 800, 900
  body: 'Inter',                // 300-900
};
```

---

## 3. Phased Build Plan

### Phase 1: Foundation (Weeks 1-3) — CRITICAL PATH

**Goal**: Skeleton app with navigation, design system, and data layer. Deployable to TestFlight.

**Week 1: Project setup + Design system**
- Initialize Expo project with expo-router, TypeScript, NativeWind
- Configure custom fonts (Inter, Barlow Condensed)
- Build UI primitives: Button, Card, Badge, Chip, ProgressBar, Input, BottomSheet
- Set up color tokens, typography scale
- Configure expo-dev-client + EAS Build for iOS
- Milestone: Design system component showcase screen

**Week 2: Data layer + Navigation shell**
- Set up SQLite with expo-sqlite
- Define schema, seed migration (convert libo-data.js → SQLite)
- Build query hooks (useExercises, useWorkouts with filtering/search)
- Set up Zustand stores with MMKV persistence
- Build full navigation structure (all screens as placeholders)
- Configure bottom tab bar (Programs, Explore, Home, Scanner, Progress)
- Milestone: App boots, tabs work, data loads from SQLite

**Week 3: Onboarding flow**
- StepWrapper component (progress bar, next/back/skip)
- All 22 onboarding screens (from prototype steps 0-22)
- ChoiceCard (single-select), ChipGrid (multi-select), number inputs
- Loading animation + summary screen
- Persist user profile to Zustand → MMKV
- Conditional routing: no profile → onboarding, has profile → tabs
- Milestone: Complete onboarding, first TestFlight build

### Phase 2: Core Workout Experience (Weeks 4-6)

**Goal**: Users can browse, start, and complete workouts.

**Week 4: Home + Explore**
- Home: greeting hero, today's workout, stats row, featured grid, recent activity
- Explore: tab switcher (Workouts/Exercises), search, filter chips
- Workout grid cards, exercise list with difficulty badges
- SQLite queries wired to filters and search
- Milestone: Home and Explore fully functional

**Week 5: Workout Detail + Player**
- Workout Detail v2: hero, meta chips, exercise blocks with expandable rows
- Workout Player v2: timer, exercise list, active exercise expansion
- Set tracking dots, set logging bottom sheet (weight + reps)
- Rest timer between sets, pause overlay
- Milestone: Can play through a full workout

**Week 6: Complete + Logging**
- Workout complete screen: confetti, stats (time, exercises, calories)
- Save logs to SQLite + Zustand
- Progress screen: weekly bar chart, workout log list, water tracker, streaks
- Milestone: Full workout loop end-to-end

### Phase 3: Programs + Builder (Weeks 7-8)

**Week 7: Programs**
- Programs list with program cards
- Program detail: week view, day dots (done/current/locked)
- Track progress in SQLite
- Challenge workouts (30-day challenges)
- Milestone: Can follow a multi-week program

**Week 8: Custom Builder + AI Generator**
- Exercise picker with search/filter, drag-to-reorder, sets/reps config
- Save custom workouts to SQLite
- AI generator: goal chips, equipment, duration → Claude API → workout
- Custom workouts in Explore "My Workouts"
- Milestone: Can create and play custom/AI workouts

### Phase 4: AI Scanner MVP (Weeks 9-12)

**Week 9: Camera + UI**
- Scanner screen with camera viewfinder (expo-camera)
- Corner frame overlay, scan line animation
- Camera/Library mode toggle, scan button
- Result card UI: identified item, muscle map, form guide, 3 alternatives
- Milestone: Scanner UI complete with mock data

**Week 10: Cloud-first scanner**
- Capture photo → Supabase Edge Function → Claude API
- Structured prompt for recognition + alternatives JSON
- Parse response into ScanResult, display on result card
- Error handling (no internet, low confidence)
- Milestone: Working scanner via cloud API

**Week 11: Core ML native module**
- Create Expo native module (modules/libo-scanner/)
- MobileNetV3/EfficientNet-Lite for classification router
- YOLOv8-nano for gym equipment detection
- Apple Vision framework for OCR (machine labels)
- On-device inference < 1 second
- Milestone: On-device classification for top 50 machines

**Week 12: Scanner integration**
- Wire on-device results to exercise database (alternatives engine)
- Hybrid: on-device first, cloud fallback if confidence < 80%
- Scan history saved to SQLite
- Pose estimation (Apple Vision) for exercise recognition
- Milestone: Scanner MVP complete — all 4 modes functional

### Phase 5: Backend + Auth + Polish (Weeks 13-15)

**Week 13: Supabase backend**
- Supabase project setup (Postgres, Auth, Storage, Edge Functions)
- Apple Sign-In (required for App Store) + email auth
- Sync user profile, workout logs, custom workouts to cloud
- Offline-first conflict resolution
- Milestone: Auth works, data syncs

**Week 14: Polish + Performance**
- Haptic feedback (set completion, workout finish, scan result)
- Skeleton loading screens, optimistic UI
- Image caching for exercise thumbnails
- App icon + splash screen (from brand assets)
- Push notifications (workout reminders)
- Accessibility: VoiceOver labels, dynamic type
- Milestone: Production-quality feel

**Week 15: Testing + App Store**
- Integration tests for critical flows
- App Store screenshots (6.7" + 6.1")
- App Store listing (description, keywords, categories)
- Privacy policy, terms of service
- App Review prep (camera permission justification, health data)
- TestFlight beta → Submit to App Store
- Milestone: Submitted to App Store review

### Phase 6: Android + Post-Launch (Weeks 16-18)

**Weeks 16-17: Android**
- Replace Core ML with TensorFlow Lite / MediaPipe
- Test all screens on Android
- Google Play listing + submission

**Week 18: Post-launch iteration**
- Analytics review, user feedback
- Exercise video content production
- ML model improvement with scan data

---

## 4. Critical Path

```
Setup → Design System → Navigation → Data Layer → Onboarding
  → Home/Explore → Workout Detail → Workout Player → Complete → Progress
    → Auth → App Store Submission
```

Scanner (Phase 4) runs in parallel after Phase 2. Does NOT block App Store launch — can ship cloud-only MVP first, add on-device ML in v1.1.

---

## 5. Biggest Risks

1. **Exercise video content** — prototype uses emoji placeholders. Real demos essential for launch. Start sourcing in Phase 1.
   - MVP option: animated GIFs/Lottie for top 50 exercises, static muscle maps for rest

2. **Scanner accuracy** — start cloud-first (Claude Vision), add on-device when user data provides training signal. Every scan = training data (with consent).

3. **App Store review** — camera + health app gets scrutiny. Prepare privacy docs early.

4. **Data migration** — 718 exercises + 140 workouts from libo-data.js must convert to SQLite cleanly.

---

## 6. Key Source Files

- `/Users/peterpan/libo-landing/app.html` — Complete prototype (all screens, state, render)
- `/Users/peterpan/libo-landing/libo-data.js` — 718 exercises + 140 workouts (SQLite seed source)
- `/Users/peterpan/libo-landing/docs/ai_scanner_concept.md` — Scanner architecture spec
- `/Users/peterpan/libo-landing/index.html` — Design system tokens + feature descriptions
