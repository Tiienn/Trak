# Design QA — Trak

## Audit item 8 — Games, Quick Add, Ask, and Progress polish — Sep 4, 2026

- Fixed Quick Add's direct-open safe-area overlap and replaced the ambiguous “tap × to see more” pattern with explicit six-item history expansion.
- Quick Add now preserves two lines for long meal names and exposes labelled add, close, dismiss, and pagination actions.
- Ask retains its approved compact horizontal prompt rail; expand/collapse and question browsing now use consistent icons, and the broader library remains one tap away.
- Games now names the selected mode and deck in its primary CTA, while the daily card uses the clearer “Daily challenge” label.
- Progress Challenges is action-only: the full Weekly muscle score and Weekly cardio summaries remain in Overview and are no longer repeated in Challenges.
- iPhone simulator interaction checks passed for Quick Add expansion, Ask question browsing, Games mode switching, and Progress tab selection.
- TypeScript, Expo lint, 123 Node tests, 23 Deno tests, and 15 evaluation tests pass.
- Evidence and full scoped report: `output/audits/item-8-polish-2026-09-04/`.

## Progress muscle focus + Body Analysis preview copy — Sep 3, 2026

### Visual source and normalized comparison

- Visual sources: the user-provided Progress screenshots at `/var/folders/ch/mqhz5ht92w9cfx5w3bw8_6rm0000gn/T/TemporaryItems/NSIRD_screencaptureui_g07vhq/Screenshot 2026-09-03 at 00.30.27.png` and `/var/folders/ch/mqhz5ht92w9cfx5w3bw8_6rm0000gn/T/TemporaryItems/NSIRD_screencaptureui_yfqTID/Screenshot 2026-09-03 at 00.31.31.png`.
- Rendered implementation: `/Users/tien/trak/output/qa-muscle-focus-layout/progress-chest-focus.png` and `/Users/tien/trak/output/qa-muscle-focus-layout/body-analysis-preview-copy.png`.
- Side-by-side comparisons inspected: `/Users/tien/trak/output/qa-muscle-focus-layout/comparison-progress.png` and `/Users/tien/trak/output/qa-muscle-focus-layout/comparison-body-analysis-copy.png`.
- The implementation is captured on the same iPhone 17 Pro Max simulator and in the same dark appearance and authenticated Chest-focus state as the reference.

### Findings and fidelity surfaces

- No actionable P0, P1, or P2 findings remain.
- Hierarchy: passed. Muscle focus is now an independent compact row between the weekly cards and Today’s Training; the training card no longer nests an unrelated settings control.
- Density: passed. The separate focus row is 78 pt tall, preserves a full-size touch target, and shortens the training card without changing the plan, completion gesture, feedback actions, or safe-effort guidance.
- Typography, color, spacing, and assets: passed. The row reuses Trak’s existing eyebrow, card radius, cream/forest palette, gutters, and dumbbell icon rather than introducing a new visual language.
- Copy: passed. The demo-only card now says “Preview mode” and explains that sample content stays on-device and does not perform a real analysis. Gemini and backend implementation details are absent from the user-facing preview. Production consent/privacy copy remains separate and accurate.
- Muscle-score meaning: passed. The universal 12-set “Target met” threshold remains unchanged; selecting Chest changes recommendations without moving the score goalpost.

### Interaction and accessibility verification

- Selecting Chest, saving, returning to Progress, and re-opening the focus flow passed on the iOS simulator.
- The saved focus is loaded before the selector can be saved, preventing a temporary default from clearing an existing choice.
- The compact row announces its muscle, block week, recommendation use, and Change/Choose action.
- Body Analysis preview copy passed presence checks; “Gemini” and “backend” passed absence checks.
- TypeScript, Expo lint, 108 Node tests, and 12 Deno tests pass.

final result: passed

---

## Home → Weight and Exercise — Sep 2, 2026

### Visual source and normalized comparison

- Visual truth: the user-provided Home screenshot at `/Users/tien/trak/output/audits/home-body-activity-2026-09-01/source-home-weight-exercise.png`.
- Rendered implementation: `/Users/tien/trak/output/audits/home-body-activity-2026-09-01/implementation-home-body-activity.png`.
- Same-viewport comparison inspected: `/Users/tien/trak/output/audits/home-body-activity-2026-09-01/comparison-home-full.png`.
- The source app interior and implementation are both normalized to the same 440 × 956 logical-point viewport. State differs only because the verification crossed midnight: the reference has Sep 1 meal/workout data, while the final simulator capture shows the Sep 2 empty-day state.

### Findings and fidelity surfaces

- No actionable P0, P1, or P2 findings remain.
- Hierarchy: passed. Two disconnected utility rows are now one compact Body + Activity card, with equally weighted Weight and Exercise actions.
- Typography: passed. Labels use the existing secondary 13 pt treatment, values use the existing strong 20 pt dashboard treatment, and supporting details remain deliberately smaller.
- Color and assets: passed. Existing Trak scale, dumbbell, and chevron icons are reused with the same white, cream, sage, and forest tokens as Water and Activity.
- Spacing and shape: passed. Both halves share aligned icon headers, value baselines, metadata lines, a subtle divider, 44+ pt touch targets, and the Home card's existing 20 pt radius.
- Empty and populated states: passed. A populated card shows weight change plus calories/minutes; a new day exposes “Log weight”/“Log workout” actions without inventing values.

### Interaction and accessibility verification

- Weight opens the existing app-wide weigh-in screen and the close control returns to Home.
- Exercise opens the existing “What did you train?” logger.
- Each half exposes a stable, descriptive accessibility label in both populated and empty states.
- Maestro verified both routes on the iPhone 17 Pro Max simulator.

### Verification

- TypeScript: passed (`npx tsc --noEmit`).
- Expo lint: passed.
- Full automated suite: passed — 83 Node unit tests, 12 Deno tests, and 15 evaluation tests.
- Maestro iOS flow: passed for Home visibility, both card actions, and both destination screens.

final result: passed

---

## Progress → Weight progress — Sep 1, 2026

### Visual source and normalized comparison

- Visual truth: the user-provided CalAI Progress screenshot at `/Users/tien/trak/output/audits/weight-progress-calai-2026-09-01/source-calai-weight-progress.jpg`.
- Rendered Trak implementation: `/Users/tien/trak/output/audits/weight-progress-calai-2026-09-01/implementation-weight-progress.png`.
- Horizontally revealed range state: `/Users/tien/trak/output/audits/weight-progress-calai-2026-09-01/implementation-weight-progress-more-ranges.png`.
- Combined focused comparison inspected: `/Users/tien/trak/output/audits/weight-progress-calai-2026-09-01/comparison-source-vs-trak.png`.
- Source screenshot: 1200 × 2608 px. Implementation screenshot: 1320 × 2868 px from the iPhone 17 Pro Max simulator, representing 440 × 956 logical points at 3× density.
- Both full screens were normalized to 1200 × 2608 px and compared side by side, with the Weight progress card visible in each.
- State: authenticated test account, light appearance, gain goal, one visible 71 kg weigh-in, 7D selected.

### Findings and fidelity surfaces

- No actionable P0, P1, or P2 findings remain.
- Hierarchy: passed. Trak follows the reference card’s title/goal chip, spacious line chart, four-visible-item range picker, and a single full-width logging action.
- Typography and color: passed. The structure is faithful while Trak’s editorial serif, cream canvas, white card, forest line, and sage action surface remain unchanged.
- Chart: passed. Five labelled dashed grid lines, first/latest date labels, historical points, a stronger latest point, flat-line handling, and an explicit empty state are legible without clipping.
- Spacing and shape: passed. The 24 pt card radius, equal-width range segments, 40+ pt controls, and aligned card edges fit the existing Progress screen.
- Copy: passed. The goal chip uses the profile’s real lose/maintain/gain goal rather than inventing a target-weight percentage Trak does not store. The reference’s ranges were intentionally replaced by the user-requested 7D through ALL sequence.
- Assets: passed. The goal chip keeps only the existing chevron, as requested; the chart is data-driven and no placeholder, emoji, or copied CalAI asset was introduced.

### Interaction and accessibility verification

- 7D, 1M, 2M, and 3M are visible initially. A horizontal swipe reveals 4M, 5M, 6M, 1Y, and ALL without increasing card height.
- 7D is an exact seven-day window; 1M–6M and 1Y use calendar-month boundaries with month-end clamping. Every range exposes selected accessibility state.
- The chart announces its first date, latest date, and latest kilogram value as one image description.
- The goal chip opens the existing profile editor; Log weight opens the existing app-wide weigh-in flow for the selected date.
- Trak Score trend and the separate duplicate Weight tile are absent. Progress retains Weekly muscle score, Today’s training, and Workout Time.
- Maestro exercised all nine filters, swiped through both selector states, verified the old trend is absent, opened the weigh-in flow, and confirmed “What is your weight?” is visible.

### Comparison history

#### Iteration 1

- [P2] The first Trak pass added a large “latest weight” readout that was not present in the reference and made the card unnecessarily tall.
  - Fix: removed the extra readout and let the labelled chart carry the current value, restoring the reference’s clean title → chart → range → message sequence.
  - Post-fix evidence: `/Users/tien/trak/output/audits/weight-progress-calai-2026-09-01/comparison-source-vs-trak.png`.

#### Iteration 2

- [P2] The first 7D state repeated the same date at both chart edges when only one weigh-in was in range.
  - Fix: a single-point chart now places one centered date label below the point; multi-point charts retain first/latest edge labels.
  - Post-fix evidence: `/Users/tien/trak/output/audits/weight-progress-calai-2026-09-01/implementation-weight-progress.png`.

#### Iteration 3

- [P2] The progress message and nested green action made the footer busier than the Activity card below, and the goal flag duplicated the chip's meaning.
  - Fix: replaced the footer with one full-width `LOG WEIGHT` button matching `LOG A WORKOUT`, and removed the flag while retaining the goal label and chevron.
  - Post-fix evidence: `/Users/tien/trak/output/audits/weight-progress-calai-2026-09-01/comparison-source-vs-trak.png`.

### Verification

- TypeScript: passed (`npx tsc --noEmit`).
- Expo lint: passed.
- Full automated suite: passed — 83 Node unit tests, 12 Deno tests, and 15 evaluation tests.
- Maestro iOS flow: passed all hierarchy, filter, absence, and weigh-in navigation checks.

final result: passed

---

## Chat → Ask streamlined interface — Sep 1, 2026 follow-up

### Visual source and normalized comparison

- Visual truth: stable crops of the two user-provided simulator screenshots at `/Users/tien/trak/output/audits/chat-ask-2026-09-01/source-chat-before-v2.png` and `/Users/tien/trak/output/audits/chat-ask-2026-09-01/source-ask-before-v2.png`, together with the explicit deletion instructions in the same request.
- Rendered Ask implementation: `/Users/tien/trak/output/audits/chat-ask-2026-09-01/ask-spacing-expanded-v3.png` and `/Users/tien/trak/output/audits/chat-ask-2026-09-01/ask-spacing-collapsed-v3.png`.
- Rendered Chat implementation: `/Users/tien/trak/output/audits/chat-ask-2026-09-01/chat-clean-v2.png`.
- Full Ask comparison: `/Users/tien/trak/output/audits/chat-ask-2026-09-01/comparison-ask-cleanup-v2.png`.
- Focused Chat-header comparison: `/Users/tien/trak/output/audits/chat-ask-2026-09-01/comparison-chat-header-v2.png`.
- Chat/Ask spacing comparison: `/Users/tien/trak/output/audits/chat-ask-2026-09-01/comparison-chat-ask-spacing-v3.png`.
- Source screenshots: 606 × 1166 px including simulator frame. The app-owned interior was cropped to 440 × 956 px at 1× for comparison.
- Implementation screenshots: 1320 × 2868 px from the iPhone 17 Pro Max simulator, representing 440 × 956 logical points at 3× density; normalized to 440 × 956 px.
- State: authenticated test account, light appearance. Ask is empty. Chat retains its existing conversation; the focused comparison isolates the unchanged Daily meals state that this request modifies.

### Findings and fidelity surfaces

- No actionable P0, P1, or P2 findings remain.
- Fonts and typography: passed. “Suggested for you” and “Daily meals” now use the exact same `suggestionHeading` style, including size and weight.
- Spacing and layout rhythm: passed. Ask now reuses Chat's 40 pt header row, 30 pt circular disclosure control, 8 pt section gap, and matching top/bottom padding. The prompt rail and browse action collapse together without leaving an accidental spacer.
- Colors and visual tokens: passed. The cleanup uses the existing cream, white, forest, and text tokens with no new hardcoded visual system.
- Image quality and asset fidelity: passed. No image or icon assets changed, and existing Trak logo/profile/navigation assets remain sharp and unchanged.
- Copy and content: passed. Ask no longer shows “Ask about your progress,” its personal-answer subtitle, or the Trak Coach card. Chat no longer shows “Your most logged meals appear first.” Prompt text, logged-meal counts, and the broader question library remain intact.

### Interaction and accessibility verification

- Chat and Ask tab switching passed.
- Daily meals remains collapsible and retains its accessible expanded state.
- Suggested for you now has matching accessible expanded/collapsed states and `−`/`+` controls.
- Suggested question selection continues through the existing Ask send path.
- Browse more questions still opens the Today, Coach, Nutrition, and Trends sheet; backdrop dismissal passed.
- The removed copy is absent from the rendered accessibility hierarchy, not merely hidden visually.
- No change-related runtime errors were observed. The existing development-only RevenueCat cached-user warning remains unrelated.

### Comparison history

#### Iteration 1

- [P2] The previous compact Ask build still carried an introduction and coach card, making the top state denser than the user's refined direction. Chat also retained an unnecessary helper line.
  - Fix: removed all three Ask elements, removed Chat's helper line, and reused the Daily meals heading style for Suggested for you.
  - Post-fix evidence: `/Users/tien/trak/output/audits/chat-ask-2026-09-01/comparison-ask-cleanup-v2.png` and `/Users/tien/trak/output/audits/chat-ask-2026-09-01/comparison-chat-header-v2.png`.

#### Iteration 2

- The normalized comparisons show the requested copy and card removed with the remaining controls aligned and intact. No actionable P0, P1, or P2 findings remain.

### Verification

- TypeScript: passed (`npx tsc --noEmit`).
- Expo lint for the changed screen: passed.
- Full automated suite: passed — 80 Node unit tests, 12 Deno tests, and 15 evaluation tests.
- Maestro iOS flow: passed all Chat/Ask presence, absence, question-browser, and dismissal checks.

### Implementation checklist

- [x] Remove the Ask title and descriptive subtitle.
- [x] Remove the Ask Trak Coach card.
- [x] Match Suggested for you typography to Daily meals.
- [x] Match Suggested for you disclosure control and spacing to Daily meals.
- [x] Remove the Daily meals helper sentence from Chat.
- [x] Preserve prompt selection, question browsing, meal shortcuts, and conversations.

final result: passed

---

## Daily Missions and Trak Rewards

## Build 28 — rolling score and optional resets

- Restored the default to today plus the previous six local calendar days. Monday is no longer an automatic reset unless the user selects it.
- Added Profile → Settings → Weekly muscle score using the existing account cards, pills, colors, and type styles. Users can choose Last 7 days, one or more weekly reset days, Reset score now (with confirmation), or Undo last reset.
- Reset weekdays use local midnight boundaries. Manual resets exclude earlier sets without changing workouts, calories, daily missions, or spendable Trak Points; sets logged afterward still count. Reset history remains available to historical date calculations.
- Preferences persist per account in on-device storage, not the cloud. Writes report failures; loading failures offer Retry; account deletion cleans up the new preference key.
- Fixed a cold-launch navigation regression caught during QA by preserving the navigator while account preferences load. Scheduled weekdays survived a full app restart.
- Simulator checks: rolling scores show Chest 6 / Legs 24 / Back 6 / Arms 6; Monday+Thursday schedule shows zero on Monday; Reset now shows zero and its date; Undo removes the temporary reset. Wallet remains 20 points. Test preferences were returned to Last 7 days.
- Light/dark standard-text settings inspected. Large-text full-scroll verification was limited by simulator scroll automation; original text size and appearance were restored.
- TypeScript, lint, 42 Node tests, 6 Deno tests, and 3 evaluation tests pass. The 12 training/reset/storage tests pass in five timezones, including Mauritius and daylight-saving New York.
- Evidence: `output/qa-v28/settings.png`, `reset-days.png`, `manual-reset.png`, and `settings-dark.png`.
- Android test APK 1.1.19 (version code 28) built successfully for `arm64-v8a`. Archive integrity and signing checks pass; the application ID and signing certificate match build 27 for an in-place upgrade.

## Build 27 — Monday weekly muscle reset

- Root cause: Weekly muscle score reused the Workout Time chart's rolling seven-day window, so Sunday sets carried into Monday.
- Scores now include only local Monday through the selected date. Workout history, the rolling Workout Time chart, point multipliers, weekly targets, and spendable Trak Points are unchanged.
- Progress follows the existing shared calendar-day refresh (on foreground and once per minute while open). Today's selection and date ribbon advance together; explicitly selected historical dates remain selected.
- Added a "Resets every Monday" explanation without changing the card layout.
- Three regression tests failed before the fix and pass afterward. The six training-progress tests also pass in Indian/Mauritius, UTC, America/New_York, Pacific/Kiritimati, and Pacific/Pago_Pago, covering month/year boundaries and daylight-saving weeks.
- TypeScript, lint, all 36 Node unit tests, 6 Deno tests, and 3 evaluation tests pass.
- iPhone simulator: Monday Aug 31 shows zero weekly points; selecting Sunday Aug 30 restores Chest 6, Legs 24, Back 6, and Arms 6. The wallet remains 20 points. No workout data was created or deleted.
- Evidence: `output/qa-v27/monday-reset.png` and `output/qa-v27/sunday-history.png`.
- Android testing APK 1.1.18 (version code 27) built successfully. Archive integrity and APK signature checks pass; `com.tien.trak.testing` and the signing certificate match build 26 for an in-place upgrade.
- Scope note: simulator date navigation and calculation tests are verified; a real device held open through midnight was not tested.

## Build 26 — compact card follow-up

- Replaced the large score ring and always-visible five-row list with a compact title/score/wallet header, slim score bar, five labeled indicators, and a View missions disclosure.
- Standard-text collapsed height is approximately 252 pt, versus approximately 504 pt previously (about 50% shorter).
- The shared component renders on both Home and Progress; mission targets, 20-point awards, wallet synchronization, and the separate weekly muscle score are unchanged.
- Expanded targets, Hide missions, the workout logging shortcut, and wallet navigation were exercised in the iPhone simulator without saving test activity.
- Enlarged accessibility text stacks the header and wraps indicators into multiple rows. The simulator's original text size and appearance were restored after inspection.
- Progress pill text is centered within each equal-width segment, with Android font padding removed.
- TypeScript, lint, 33 Node unit tests, 6 Deno tests, and 3 evaluation tests pass.
- Android testing APK 1.1.17 (version code 26) builds successfully for `arm64-v8a`. Archive integrity and APK signature verification pass; the package and signing certificate match build 25 for an in-place test-app upgrade.
- New screenshots: `output/qa-v26/progress-compact.png`, `output/qa-v26/progress-expanded.png`, `output/qa-v26/home-compact.png`, and `output/qa-v26/progress-large-text.png`.
- Scope note: full Android device interaction testing and unrelated app-wide large-text layout issues are not covered by this simulator pass.

The sections below document the original build-25 rewards implementation.

## Evidence

- Source visual truth: `/Users/tien/trak/output/qa-v24/home.png` — the shipped Trak Home hierarchy, typography, palette, cards, header, date ribbon, and navigation.
- Rendered implementation:
  - `/Users/tien/trak/output/qa-v25/home.png`
  - `/Users/tien/trak/output/qa-v25/progress.png`
  - `/Users/tien/trak/output/qa-v25/rewards-fixed.png`
- Combined comparison inspected: `/Users/tien/trak/output/qa-v25/home-comparison.png`.
- Viewport: iPhone 17 Pro Max simulator, 440 × 956 logical points.
- Source and implementation: 1320 × 2868 px at 3× density. Both were normalized to 540 px wide in the combined comparison without cropping.
- State: light theme, authenticated account, zero completed missions, zero wallet balance.

## Full-view comparison

The Home header, date ribbon, cream canvas, page gutters, white cards, forest actions, fixed scan controls, and bottom navigation remain unchanged. The old opaque 40-point score card is intentionally replaced by a larger Daily Missions card because the approved product direction makes five daily achievements the score itself. Progress renders the same shared component and the Weekly Muscle Score remains a separate section below it.

The reward catalog uses the same editorial serif headings, heavy sans labels, 20–24 pt radii, cream/white/forest hierarchy, and existing Trak icon set. No device chrome or visible asset was recreated in app code.

## Focused region comparison

- Daily Missions: the card presents the wallet, 0–100 score ring, exactly five rows, current progress, and a visible +20 value per mission. Labels and values remain readable without truncation at 440 pt width.
- Rewards: the catalog distinguishes utility, badge, avatar frame, and mission theme rewards with consistent icon tiles and explicit prices. Unaffordable actions are visibly muted.
- Header safe area: the first rewards capture placed the title under the status area. The corrected capture moves the entire header below the Dynamic Island while preserving Trak’s top rhythm.
- A separate focused crop was unnecessary because the combined full-density captures keep all card labels, wallet values, row states, and navigation affordances legible.

## Required fidelity surfaces

- Fonts and typography: passed. Trak’s serif display face and existing sans weights are preserved; headings, mission labels, metadata, and wallet numerals establish a clear hierarchy.
- Spacing and layout rhythm: passed. Existing gutters, card padding, row separators, radii, and tap-target heights are reused. The taller score card is an intentional information-priority change.
- Colors and visual tokens: passed. Cream, white, forest, sage, terracotta, and gold reuse the current token language; completed states do not rely on color alone.
- Image quality and asset fidelity: passed. Existing vector icon components are reused; no new raster assets, placeholders, emoji, or improvised decorative art were added.
- Copy and content: passed. The interface consistently says “Daily Missions,” “Trak Score,” “Trak Points,” and “Weekly muscle score,” keeping daily currency separate from weekly training points.
- Accessibility and interaction: passed for the primary visible path. Wallet and close controls have labels; completed states use ticks and text; mission rows disable unavailable navigation.

## Interaction and data checks

- Home, Progress, and Rewards rendered from the signed-in app with no React errors.
- Rewards safe-area behavior was re-captured after the fix.
- Remote RLS denies anonymous catalog and wallet RPC access with HTTP 401.
- The linked database migration applied successfully; remote database lint reports no schema errors.
- TypeScript, Expo lint, 30 Node unit tests, 6 Deno tests, and 3 nutrition evaluation tests pass.
- Android testing APK 1.1.16 (version code 25) builds successfully for `arm64-v8a`; its signing certificate matches build 24, so it supports an in-place test-app upgrade.

## Comparison history

### Iteration 1

- [P2] Rewards title overlapped the iOS status area when the screen was opened directly.
  - Fix: applied the measured top safe-area inset explicitly and retained bottom safe-area handling.
  - Post-fix evidence: `/Users/tien/trak/output/qa-v25/rewards-fixed.png`.

No actionable P0, P1, or P2 findings remain. A P3 follow-up is to evaluate a slightly denser mission card on the smallest supported Android viewport after device feedback; the current layout is fully readable and scrollable.

## Implementation checklist

- [x] Shared five-mission score card on Home and Progress.
- [x] Persistent, server-validated point ledger with one award per mission/day.
- [x] Transactional reward purchasing and saved inventory/equipment.
- [x] Visible equipped avatar frame, badge, and mission theme treatments.
- [x] Calorie input can be cleared without restoring the estimate.
- [x] Weekly muscle scoring remains independent.
- [x] Signed Android upgrade build verified.

final result: passed
