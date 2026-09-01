# Design QA — Daily Missions and Trak Rewards

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
