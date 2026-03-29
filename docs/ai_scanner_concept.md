# Libo AI Scanner — Technical Concept

## Overview

The AI Scanner is Libo's core differentiating feature. Users point their phone camera at anything fitness-related — a machine, an object, a person exercising — and get instant recognition, explanation, and 3 alternative exercises.

---

## How It Works (User Flow)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Open Camera │ ──► │  Point & Scan │ ──► │  AI Recognizes   │ ──► │  Results Card │
│   (1 tap)    │     │  (live feed)  │     │  (< 2 seconds)   │     │  (swipeable)  │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
```

### Results Card Shows:
1. **What it is** — "Lat Pulldown Machine" / "Resistance Band" / "Push-up"
2. **How to do it** — Step-by-step form guide with key cues
3. **Muscles targeted** — Visual muscle map highlight
4. **3 Alternatives** — Each with difficulty tag (Easier / Same / Harder)
   - Alternative 1: No equipment version (home/park)
   - Alternative 2: Different equipment version (gym swap)
   - Alternative 3: Progression/regression variant

---

## 4 Recognition Modes

### Mode 1: Machine Recognition
**Input:** Camera pointed at gym equipment
**AI does:** Identifies machine by shape, structure, brand label
**Output:** Machine name, muscle groups, proper form guide, 3 alternatives

Example:
> 📸 Scans a **Cable Crossover Machine**
> → "Cable Crossover — targets chest, front delts"
> → How to: stance, grip, movement path, breathing
> → Alt 1: Resistance band crossover (home)
> → Alt 2: Dumbbell flyes (gym, if machine is busy)
> → Alt 3: Push-up variations (no equipment)

### Mode 2: Label/Text Recognition
**Input:** Camera pointed at machine nameplate, label, or instruction sticker
**AI does:** OCR reads text → matches to exercise database
**Output:** Same as Mode 1 but triggered by text instead of visual shape

Example:
> 📸 Scans label reading **"Hammer Strength Iso-Lateral Row"**
> → Identifies exact model, shows proper usage for that specific variant

### Mode 3: Object Recognition
**Input:** Camera pointed at any everyday object
**AI does:** Identifies object → queries exercise database for exercises using that object
**Output:** Object name, 3+ exercises possible with it, form guides for each

Example:
> 📸 Scans a **park bench**
> → Exercise 1: Bulgarian split squats (hold bench for support)
> → Exercise 2: Incline push-ups (hands on bench)
> → Exercise 3: Bench dips (triceps)
> → Each with form guide + muscle map

More objects: chair, wall, backpack (weighted), stairs, towel, water bottle, door frame, tree branch

### Mode 4: Exercise Recognition
**Input:** Camera pointed at person performing an exercise (or self via front camera)
**AI does:** Pose estimation → matches movement pattern to exercise database
**Output:** Exercise name, form corrections, muscles worked, 3 alternatives

Example:
> 📸 Points at someone doing a **barbell deadlift**
> → "Conventional Deadlift — targets posterior chain"
> → Form check: "Keep back neutral, push through heels"
> → Alt 1: Romanian deadlift (hamstring focus)
> → Alt 2: Kettlebell deadlift (lighter load)
> → Alt 3: Bodyweight good mornings (no equipment)

---

## Technical Architecture

### On-Device (Fast, Private)

```
┌─────────────────────────────────────────────────┐
│                   iPhone Camera                   │
│                   (live feed)                     │
└──────────────────────┬──────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │    Frame Preprocessor    │
          │  (resize, normalize)     │
          └────────────┬────────────┘
                       │
        ┌──────────────▼──────────────┐
        │     Classification Router    │
        │  "What am I looking at?"     │
        │                              │
        │  → Machine? → Machine Model  │
        │  → Text?    → OCR Pipeline   │
        │  → Object?  → Object Model   │
        │  → Person?  → Pose Model     │
        └──────────────┬──────────────┘
                       │
          ┌────────────▼────────────┐
          │   Core ML Models (on     │
          │   device, no internet)   │
          │                          │
          │  • Image Classification  │
          │    (MobileNet/EfficientNet)
          │  • Object Detection      │
          │    (YOLOv8 or similar)   │
          │  • OCR (Vision framework)│
          │  • Pose Estimation       │
          │    (Apple Vision/MLKit)  │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │   Exercise Database      │
          │   (local SQLite)         │
          │                          │
          │  500+ exercises with:    │
          │  • Name, description     │
          │  • Muscle map            │
          │  • Form cues             │
          │  • Equipment tags        │
          │  • Alternative links     │
          │  • Difficulty rating     │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │   Alternatives Engine    │
          │                          │
          │  For any recognized item │
          │  → Query by:             │
          │    • Same muscle group   │
          │    • Different equipment │
          │    • Difficulty range    │
          │  → Return 3 ranked alts  │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │      Results UI Card     │
          │  (animated, swipeable)   │
          └─────────────────────────┘
```

### Cloud (Enhanced, Optional)

For cases where on-device models aren't confident enough:

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Low confidence│ ──► │  Cloud API Call    │ ──► │  Enhanced     │
│  (< 80%)      │     │  (Claude Vision /  │     │  Recognition  │
│               │     │   GPT-4V / custom) │     │              │
└──────────────┘     └──────────────────┘     └──────────────┘
```

- **On-device first** — works offline, fast (< 1s), private
- **Cloud fallback** — for unusual objects, complex scenes, or form analysis
- **Cloud enrichment** — detailed form coaching, personalized alternatives based on user profile/goals

---

## AI Models Needed

| Component | Technology | Runs On | Purpose |
|-----------|-----------|---------|---------|
| Image Classification | MobileNetV3 / EfficientNet-Lite | Device (Core ML) | "Is this a machine, object, or person?" |
| Object Detection | YOLOv8-nano | Device (Core ML) | Bounding boxes around equipment |
| OCR | Apple Vision Framework | Device (native) | Read machine labels and text |
| Pose Estimation | Apple Vision / MediaPipe | Device (native) | Skeleton tracking for exercise recognition |
| Exercise Matching | Custom classifier | Device (Core ML) | Map pose sequence → exercise name |
| Cloud Vision | Claude API / custom model | Cloud | Fallback for low-confidence scans |
| Alternatives Engine | Rule-based + embeddings | Device | Find 3 best alternatives by muscle group + equipment |

---

## Training Data Strategy

### Phase 1: Bootstrap (Pre-Launch)
- Scrape open-source gym equipment image datasets
- Use existing exercise databases (with proper licensing)
- Manually photograph 50-100 common machines across different gyms
- Use synthetic data augmentation (rotation, lighting, angles)

### Phase 2: User-Powered (Post-Launch)
- Every scan = training data (with user consent)
- "Was this correct?" feedback button → reinforcement signal
- Users in 5 markets = diverse gym equipment from different manufacturers
- This is a massive competitive moat — the more users scan, the better it gets

---

## Alternatives Engine Logic

```
function getAlternatives(recognizedExercise) {
    primaryMuscles = recognizedExercise.muscles
    currentEquipment = recognizedExercise.equipment
    userGoal = user.profile.goal  // e.g. "build muscle", "lose weight"

    alternatives = exerciseDB.query({
        muscles: primaryMuscles,          // same muscle group
        equipment: NOT currentEquipment,  // different equipment
        difficulty: range(current - 1, current + 1)
    })

    // Always return 3 types:
    return {
        noEquipment: alternatives.filter(e => e.equipment == "bodyweight")[0],
        differentEquipment: alternatives.filter(e => e.equipment != "bodyweight")[0],
        progression: alternatives.sort(by: difficulty).pickVariant()
    }
}
```

---

## Example Scan Scenarios

| Scan Target | Recognition | Alt 1 (No Equip) | Alt 2 (Swap) | Alt 3 (Variant) |
|-------------|------------|-------------------|--------------|------------------|
| Leg Press Machine | Leg press, 45° | Bodyweight squats | Barbell squats | Single-leg press |
| Water Bottle | Object: weighted cylinder | Weighted arm circles | Dumbbell laterals | Resistance band raises |
| Person doing pull-up | Pull-up exercise | Inverted rows (table) | Lat pulldown | Chin-ups |
| Staircase | Object: stairs | Step-ups | Box jumps | Stair sprints |
| TRX Label | "TRX Suspension Trainer" | Towel rows (door) | Cable rows | Ring rows |
| Office Chair | Object: chair | Chair dips | Bench dips | Parallel bar dips |
| Resistance Band | Object: resistance band | Bodyweight equivalent | Cable equivalent | Heavier band |

---

## MVP vs Full Version

### MVP (Launch)
- Machine recognition (top 50 most common gym machines)
- Object recognition (top 30 everyday objects)
- Basic exercise recognition (20 fundamental movements)
- Pre-built alternatives database (not AI-generated)
- On-device only, no cloud fallback

### V2
- Expanded to 200+ machines, 100+ objects
- Real-time pose estimation with form corrections
- Cloud fallback for unknown items
- Personalized alternatives based on user profile and goals
- "Scan history" — track what you've scanned and used

### V3
- Live form coaching ("straighten your back", "go deeper")
- Workout builder from scans ("I have a bench and dumbbells" → full workout)
- Social: share your scans, see what others found
- Gym map: "these machines are available" based on crowd-sourced scans
