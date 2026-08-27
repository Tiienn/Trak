# Design QA — Progress training, overload, and supplements

## Evidence

- Source visual truth:
  - `/Users/tien/trak/output/qa-v23/home.png` for Trak's current Home layout and canonical coach card.
  - `/Users/tien/Downloads/Screenshot_2026-08-28-01-03-34-941_com.tien.trak.testing.jpg` for the reported Android supplements keyboard failure.
- Implementation screenshots:
  - `/Users/tien/trak/output/qa-v23/progress-top.png`
  - `/Users/tien/trak/output/qa-v23/training-plan.png`
  - `/Users/tien/trak/output/qa-v23/training-cardio-saved.png`
  - `/Users/tien/trak/output/qa-v23/workout-log-top.png`
  - `/Users/tien/trak/output/qa-v23/workout-options-mid.png`
  - `/Users/tien/trak/output/qa-v23/supplements-keyboard.png`
- Combined comparison inputs inspected together:
  - `/Users/tien/trak/output/qa-v23/coach-home-progress-compare.png`
  - `/Users/tien/trak/output/qa-v23/supplements-keyboard-compare.png`
- Implementation viewport: iPhone 17 Pro Max simulator, 440 × 956 logical points, 1320 × 2868 px at 3× density.
- Android source viewport: 1200 × 2608 px. It was proportionally normalized to 1320 × 2868 px for the combined comparison because both captures have the same portrait aspect ratio.
- State: light theme, signed-in test account, Aug 28, 2026.

## Full-view comparison

The Home/Progress comparison confirms that the Progress coach card now uses the shared Home component with the same height, padding, 36 pt icon tile, text hierarchy, chevron placement, corner radius, and page gutters. Progress retains the Trak logo, date ribbon, cream canvas, white surfaces, forest actions, editorial headings, and existing navigation.

The supplements comparison confirms the reported failure is removed. In the source, the Android keyboard opens while no input is visible. In the implementation, the list scrolls, the active input and Cancel/Add actions remain fully visible above the keyboard, and the top safe area is respected. Keyboard artwork itself is platform-owned and excluded from fidelity judgment.

## Focused region comparison

- Training balance: eight equal rings use distinct, persistent colors for Chest, Legs, Back, Arms, Shoulders, Abs, Glutes, and Other. Each shows points plus completed sets without relying on color alone.
- Customise training: the strength/cardio switch, eight muscle choices, sets/reps, kg/lb load selector, time target, and calorie target use Trak's existing fields, pills, spacing, and rounded surfaces.
- Progressive overload: saved strength items show the current load and a visible comparison to the previous recorded load once updated.
- Workout logger: all muscle groups plus Full body and Cardio are available. The completed-set rows mirror the same eight-group catalog; duration uses user-entered hours/minutes and calorie burn explicitly syncs to Home.
- No new raster artwork was introduced. Existing Trak logo and library icons remain crisp; no improvised image assets or placeholders were used.

## Required fidelity surfaces

- Fonts and typography: passed. Existing display serif and sans weights are retained; no clipping or awkward wrapping appears at 440 pt width.
- Spacing and layout rhythm: passed. Page gutters, card padding, section gaps, tap targets, safe areas, and bottom action clearance are consistent.
- Colors and visual tokens: passed. Existing cream, white, forest, sage, terracotta, lime, gold, blue, rose, purple, and teal tokens are reused.
- Copy and content: passed. “Customise training” is distinct from “Log workout”; Chest, Legs, and Back state their 2-point rate; the weekly target is expressed as 12 points.
- Accessibility and interaction: passed for the primary path. Focus cards expose checkbox state; key inputs have labels; numeric/form keyboards can be dismissed by dragging; supplement fields remain visible while typing.

## Interaction and data checks

- Saved and removed a cardio target through the signed-in app, verifying the authenticated remote round trip.
- Saved and removed a strength item with a kg load, verifying the initial progressive-overload history entry and cascade cleanup.
- Verified every workout focus and every completed-set muscle row in the rendered form; Full body and Cardio can be selected together.
- Verified the full-body/cardio summary recalculates duration, calories, and total sets without saving test workout data.
- Opened the supplement add form, entered `QA visible field`, confirmed it remained visible above the keyboard, then cancelled without creating data.
- Type checking, lint, 28 Node unit tests, 6 Deno tests, 3 evaluation tests, linked Supabase schema lint, and local/remote migration alignment all passed.

## Comparison history

### Iteration 1

- [P2] Supplements title overlapped the iOS status safe area when opened by deep link.
  - Fix: applied the measured safe-area inset explicitly while preserving bottom safe-area handling.
  - Post-fix evidence: `/Users/tien/trak/output/qa-v23/supplements-safe.png`.

- [P2] Numeric training fields had no practical keyboard-dismiss path on iOS.
  - Fix: added drag-to-dismiss behavior to training and workout forms; Android retains resize behavior.

No P0, P1, or P2 findings remain.

## Android test artifact

- APK: `/Users/tien/trak/output/trak-test-1.1.15-v23.apk` (61 MB).
- Verified package `com.tien.trak.testing`, version `1.1.15`, version code `23`, and arm64-v8a architecture.
- Verified the APK archive has no compressed-data errors.
- Verified its signing certificate matches build 22, allowing an in-place update of the existing Trak Test installation.
- SHA-256: `539f7c9c15bd98ad67ca7ac03f6437725b426bc3642e5a3ccabd3c19b41ee57d`.

## Iteration 2 — Planned completion and 28-day Body Analysis cadence

- Today’s training now supports a 450 ms hold gesture. The confirmation names the planned item and explains that completion adds it to today’s workout log and updates the weekly muscle score.
- The completion path was exercised against the signed-in data store: a temporary 3-set chest plan produced 6 chest points, displayed the completed state, and prevented duplicate completion. The temporary workout and plan were then removed through the UI.
- “Training balance” is now “Weekly muscle score.” The card keeps eight color-distinct muscle rings and states the 12-point weekly target and 2-point rate for chest, legs, and back.
- “What did you train?” now puts Upper body, Lower body, Push, Pull, Full body, and Cardio in a compact two-row quick-select grid, followed by a compact three-column muscle grid. All labels remain visible at the tested viewport without requiring a long option-list scroll.
- Body Analysis is now a fourth item in the existing Progress pill, using the full label “Body Analysis.” Its empty state explains the 28-day cadence; completed analyses show the due date and notification state.
- A completed analysis schedules one device-local notification exactly 28 days later. A newer analysis replaces the prior reminder; deleting the latest analysis re-targets the next result or cancels it; tapping the notification opens Body Analysis.
- Visual evidence:
  - `/Users/tien/trak/output/qa-v24/progress-pill.png`
  - `/Users/tien/trak/output/qa-v24/workout-picker-fixed.png`
  - `/Users/tien/trak/output/qa-v24/score-updated.png`
  - `/Users/tien/.maestro/tests/2026-08-28_024006/analysis-tab/screenshots/step-007-assertCondition-Body_Analysis.png`
- TypeScript, Expo lint, 28 Node unit tests, 6 Deno tests, and 3 evaluation tests passed after the final changes.

## Android test artifact — build 24

- APK: `/Users/tien/trak/output/trak-test-1.1.15-v24.apk` (63,863,701 bytes).
- Verified package `com.tien.trak.testing`, version `1.1.15`, version code `24`, and arm64-v8a architecture.
- Verified the APK archive has no compressed-data errors.
- Verified its signing certificate exactly matches build 23, allowing an in-place update without uninstalling the current Trak Test app.
- Signing certificate SHA-256: `b4848fc5d54ce665e52e9a74feadcea4cdca8ba7a2febbfaef4a25f56d3f4687`.
- APK SHA-256: `1405a24af654a9c37f80d72414b3226074259b9773c26e504948d52f0025b0fe`.

final result: passed
