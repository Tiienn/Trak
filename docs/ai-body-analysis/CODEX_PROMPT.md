You are the implementation engineer for the **Trak Progress: AI Body Analysis MVP** inside the existing Trak mobile app.

Repository: `/Users/tien/trak`

Your job is to implement and verify the complete local MVP described in the PRD—not merely write a plan, static mock, schema stub, or partial camera flow.

## 1. Read before coding

Read fully, in this order:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/ai-body-analysis/PRD.md`
4. `package.json`
5. `app.json`
6. `src/constants/theme.ts`
7. `src/app/_layout.tsx`
8. `src/components/app-tabs.tsx`
9. `src/app/(tabs)/index.tsx`
10. `src/app/(tabs)/explore.tsx`
11. `src/app/scan.tsx`
12. `src/lib/analyzeFood.ts`
13. `src/lib/store.tsx`
14. `src/lib/types.ts`
15. `src/lib/purchases.tsx`
16. `src/app/paywall.tsx`
17. `src/lib/account.ts`
18. `supabase/functions/analyze-food/index.ts`
19. `supabase/functions/_shared/nutrition.ts`
20. `supabase/functions/delete-account/index.ts`
21. `supabase/functions/privacy/index.ts`
22. `supabase/config.toml`
23. every current migration and relevant Node/Deno test pattern
24. all seven visual references listed in the PRD's **Visual design source of truth** section

Trace every symbol to its definition and usages before editing. Do not invent APIs, imports, tables, entitlements, routes, or conventions.

The PRD is the product source of truth. If a requirement conflicts with the live repository, preserve safety and existing behavior, choose the smallest compatible implementation, and document the deviation.

## 2. Protect the current checkout

The repository already contains substantial uncommitted work unrelated to this feature.

Before editing, run and record:

```bash
git status --short --branch
git diff --stat
npm run test
npm run lint
npx tsc --noEmit
```

Do not reset, clean, stash, checkout, restore, revert, overwrite, or discard pre-existing work. Merge around it carefully. Do not commit, push, rewrite history, deploy, or publish unless Tien separately authorizes that external action.

Do not read or print `.env` contents. Never put Gemini keys, Supabase service-role keys, RevenueCat secrets, credentials, raw body photos, base64 images, or sensitive provider payloads in client code, tracked files, tests, logs, screenshots, or your final response.

### Live-production constraint

**Trak Nutrition is already live and usable on Google Play.** Treat this as a production extension, not a greenfield prototype.

- Preserve every existing Nutrition flow and API contract.
- Use additive migrations; do not drop, rename, reinterpret, or newly require existing columns.
- Assume old Play Store clients and the new client can coexist during rollout.
- Keep shared Edge Function helpers backward compatible with released clients.
- Isolate Body Analysis failures so a missing migration/function can never break Nutrition startup or data loading.
- Show a friendly unavailable/retry state when the Body backend is absent or not deployed.
- Add regression tests around existing Nutrition capability and shared-server behavior where your changes touch them.
- Do not deploy anything. In the final report, provide a safe later rollout order: additive migration, new/updated Edge Functions and public privacy pages, then mobile store release.

## 3. Product architecture

Trak is becoming one body-transformation product with three tentpoles:

- **Nutrition** — daily food/calorie/protein execution;
- **Coach** — future workouts, weekly goals, and missions;
- **Progress** — body photos, weight/waist trends, and monthly adjustment evidence.

This task builds **Progress** only.

Implement Body Analysis inside the current app. Do not create a second app, bundle, tab, authentication flow, nutrition tracker, workout product, mission engine, social product, or multi-agent system.

The output must be useful to a future Trak Coach through clean, versioned structured data, but Body Analysis must not create missions, workout programs, XP, or automatic plan changes.

## 4. Mandatory Expo and stack constraints

- Expo SDK 57, React Native, TypeScript, Expo Router.
- Before using any Expo API, consult the exact versioned docs at `https://docs.expo.dev/versions/v57.0.0/`.
- Reuse installed camera, image-picker, image-manipulator, file-system, Supabase, RevenueCat, theme, auth, and profile infrastructure.
- Add a dependency only if the MVP cannot be implemented safely with the current stack; explain and verify any addition.
- Gemini remains behind an authenticated Supabase Edge Function.
- Keep the current five-tab layout and central meal-scan behavior unchanged.
- Preserve light/dark themes, safe areas, accessibility labels, large tap targets, and small-screen behavior.
- Do not change bundle identifiers, versions, EAS project settings, App Store metadata, or package identity.

### Visual implementation contract

Open and inspect all seven supplied Trak screenshots before implementing UI. They are the visual source of truth together with `src/constants/theme.ts` and existing neighboring components.

Match Trak's established language:

- warm editorial serif for the wordmark, selected display headings/section titles, and hero numbers;
- system sans for controls, labels, navigation, body copy, and dense data;
- espresso/cream canvases, low-contrast cards, forest-green primary actions, large radii, generous spacing, pill segments, circles, and quiet chevrons/dividers;
- one obvious filled-green primary action per screen;
- existing bottom navigation and elevated meal-scan button unchanged;
- existing light and dark themes both supported.

Do not introduce gradients, neon, glassmorphism, blue/purple “AI” decoration, a new component library, ornamental macro colors, or a visually separate mini-app.

Use stacked Trak cards and progressive disclosure for results. Use the existing segmented-control pattern for pose/comparison selection. Treat body photos as private content, never decorative card backgrounds, Home thumbnails, or share imagery.

Critically, do **not** reuse the circular `Trak Score` or macro-ring treatment for physique, body fat, attractiveness, or model confidence. Body Analysis confidence belongs in quiet evidence text/cards. Do not invent a body score.

After implementation, compare screenshots of every new major state against the supplied references at the same device size. Check horizontal gutters, card radius/spacing, typography roles, action hierarchy, sticky-bottom clearance, and bottom-tab overlap. Fix obvious mismatches before finalizing.

## 5. Capability-ready access without new store products

The future commercial products are Trak Nutrition, Trak Coach, and Trak Complete. Do not create or deploy those RevenueCat products/offerings/entitlements in this task.

Create a small typed access/capability boundary equivalent to:

```ts
type TrakCapabilities = {
  nutritionAi: boolean;
  bodyAnalysis: boolean;
  coach: boolean;
};
```

For this MVP:

- current/legacy `pro` grants all capabilities and is treated as future Complete;
- the existing seven-day trial grants all capabilities;
- tester access grants all capabilities;
- all existing Nutrition AI users retain exactly their current access;
- Body Analysis gates on `bodyAnalysis` rather than a screen-level raw `isPro` check;
- code may be shaped so future entitlement mapping is isolated, but do not pretend unconfigured products exist;
- paywall copy may mention Body Analysis while continuing to render only actual current RevenueCat packages.

Write failing tests for capability resolution before changing feature gates.

## 6. Core user flow to implement

1. User enters Body Analysis from a Home Progress card or Profile entry.
2. Sign-in/profile, adult eligibility, capability, and consent are checked before photo permissions.
3. User confirms goal/training preferences and may add an optional waist measurement.
4. User captures or selects exactly front, side, and back photos.
5. Each pose has clear framing guidance, review, and retake.
6. All three photos are reviewed together; upload begins only after **Analyze securely**.
7. An authenticated `analyze-body` Edge Function validates images, derives profile/nutrition/weight context server-side, calls Gemini, normalizes a strict result, persists only a usable normalized result, and returns it.
8. The result shows evidence quality, strengths, at most two priorities, recommendation-only training/nutrition guidance, and a 21/28-day next check-in.
9. Repeat scans compare only the user with their own prior scan.
10. The user can delete local photos only, one whole scan, all Body Analysis data, or the entire account.

Implement every loading, empty, denied, retake, unsupported, error, missing-local-photo, and destructive-confirmation state specified in the PRD.

## 7. Privacy and photo rules

These are hard requirements:

- Gate before camera/gallery permission.
- Separate camera and gallery actions.
- Keep gallery usable when camera permission is denied.
- Never pressure a denied user to open Settings.
- Never upload on shutter press; require three-photo review and explicit submission.
- Keep only one `CameraView` mounted at once.
- Resize/compress upload derivatives with the installed SDK 57 image-manipulator API.
- Use an abort signal and cancel on unmount/back.
- Raw photos and base64 must never be persisted in Postgres, Supabase Storage, Edge Function files, telemetry, logs, errors, or fixtures.
- Completed progress photos live only in app-private on-device storage, grouped by user id and scan id.
- Maintain a user-scoped manifest and handle partial writes/missing files honestly.
- Do not claim app-level encryption unless you implement and test it.
- Return `Cache-Control: no-store` from the AI function on success and errors.
- Extend one-scan, delete-local-only, delete-all, and account-deletion paths.
- Update the public privacy policy to match the real implementation exactly.

## 8. AI behavior and safety

Implement the versioned strict response contract from the PRD, including:

- capture quality and per-pose checks;
- `usable | retake | unsupported`;
- confidence;
- optional wide visual body-fat range;
- strengths;
- at most two domain-tagged focus areas with evidence;
- progress comparison basis;
- recommendation-only training focus/exercises;
- nutrition data sufficiency and bounded action;
- versioned `coachHandoff` that does not change a plan;
- persistent disclaimer.

Model output is untrusted. Clamp string/array lengths, enums, numeric ranges, calorie adjustment, check-in days, days/week, and id cross-references before persistence/rendering.

Explicitly forbid and safely reject/downgrade:

- attractiveness, worth, desirability, public ranking, or universal physique scores;
- comparison with other people;
- race/ethnicity, gender identity, pregnancy, disability, disease, eating-disorder, hormone, injury, posture-disorder, steroid-use, genetic, or “natural/enhanced” inference;
- exact lean/fat mass, inferred circumference, or medical-grade body-fat claims;
- nudity, sexual imagery, possible minors, multiple people, or non-analyzable body images;
- shame, starvation, purging, dehydration, unsafe restriction, punitive exercise, or “bad/forbidden food” language;
- prompt injection from user labels, notes, image text, meal titles, or metadata.

Only show the optional visual body-fat range when capture quality and confidence are not low, and enforce the PRD's display limitations. Never fabricate certainty.

## 9. Implementation sequence

Work test-first in small slices.

### Slice 1 — Access and domain contracts

- Add failing tests for capability resolution preserving current behavior.
- Implement the focused capability resolver.
- Add versioned Body Analysis types and normalization tests.
- Test malformed, oversized, unsafe, low-confidence, and cross-reference cases.

### Slice 2 — Persistence schema and server pure logic

- Add timestamped migrations for preferences, scans, body-specific usage, RLS/grants, and telemetry constraints.
- Update maintained bootstrap SQL if appropriate.
- Add pure server helpers/tests for input validation, sanitization, context derivation, normalization, and persistence eligibility.
- Add new tables to explicit account deletion in safe dependency order.

### Slice 3 — `analyze-body` Edge Function

- Require authenticated JWT and pin `verify_jwt = true`.
- Validate exactly three bounded images.
- Enforce three attempts/user/day initially.
- Fetch user-owned profile, weight, nutrition, and previous-scan context server-side.
- Validate ownership of any previous scan reference.
- Call Gemini with timeout and at most one malformed-output retry.
- Persist only normalized usable results.
- Record privacy-safe operational telemetry only.
- Return friendly errors and no-store headers.

### Slice 4 — Local photo repository

- Store front/side/back under user/scan-specific app document paths.
- Implement atomic-enough manifest behavior: never mark a set complete after partial failure.
- Verify file existence on read.
- Implement local-only, one-scan, all-body-data, and account cleanup.
- Add per-user isolation and missing-file tests.

### Slice 5 — UI flow

- Add Home and Profile entries.
- Add hub, setup/consent, capture/gallery, review/analyzing, result, history, privacy, and deletion screens.
- Reuse established visual/navigation patterns without copying food-specific behavior.
- Keep photos off Home and share cards.
- Add the optional waist input with unit conversion/plausibility tests.

### Slice 6 — Integration and regression safety

- Move existing Nutrition AI gates through the capability boundary without changing access.
- Update paywall copy without inventing unavailable products.
- Update privacy and deletion copy.
- Verify Body Analysis does not leak into the meal store or become a new monolith.
- Review every changed existing file for accidental unrelated churn.

## 10. Expected file areas

The PRD lists expected paths. Inspect before editing and choose the smallest coherent structure.

Prefer new focused modules such as:

- `src/lib/access.ts`
- `src/lib/body-analysis.ts`
- `src/lib/body-analysis-store.tsx` or a focused repository/provider
- `src/lib/body-photo-store.ts`
- `src/app/body-analysis/*`
- `supabase/functions/analyze-body/*`

Do not dump Body Analysis into `src/lib/store.tsx` or mix its logic into nutrition enrichment.

## 11. Verification requirements

Run focused tests after each slice. Before finishing, run and fix:

```bash
npm run test
npm run lint
npx tsc --noEmit
npx expo-doctor
```

Also run:

- focused Deno tests for new Edge Function helpers;
- the strongest feasible Expo production export/build check supported by this checkout;
- `git diff --check`;
- a manual native/emulator smoke test when the environment supports it.

The smoke must cover:

- access gate before permissions;
- adult-only block;
- consent and preferences;
- camera and gallery;
- all three poses and retakes;
- explicit final review;
- cancel/abort and error states;
- retake and unsupported responses;
- usable result rendering;
- history with and without local photos;
- local-only deletion, whole-scan deletion, delete-all, and account deletion;
- dark mode, small screen, and basic accessibility.

Provider mocks are acceptable for deterministic tests and UI states, but they do not prove live Gemini behavior.

Do not deploy migrations, Edge Functions, EAS builds, RevenueCat configuration, or store metadata unless Tien separately authorizes deployment. If a real request can be performed against an already-running local environment without external changes and without exposing secrets, record it. Otherwise report live-provider and deployment status as unverified and list exact later steps.

## 12. Scope discipline

Do not implement during this build:

- a separate app or new tab;
- App Store rename or bundle/version changes;
- new live RevenueCat products or offerings;
- full workout plans/logging or four-week programs;
- daily/weekly/monthly missions;
- XP, levels, Games redesign, or final tab redesign;
- multiple AI agents or autonomous plan modification;
- social/community/leaderboards;
- body-photo sharing;
- 3D/future-body/AR/form-analysis features;
- inferred body measurements or medical claims;
- broad refactors, dependency upgrades, or unrelated fixes.

If you find an unrelated issue, report it rather than expanding scope.

## 13. Definition of done

Do not stop at scaffolding. Continue until every immediate acceptance criterion in `docs/ai-body-analysis/PRD.md` is implemented and verified to the limit of the local environment.

Before finalizing, inspect:

```bash
git status --short --branch
git diff --stat
git diff -- docs/ai-body-analysis src supabase package.json app.json
```

Review the complete diff for:

- secrets or sensitive image data;
- logging of photos/base64/URIs;
- unsafe or medical claims;
- current subscriber regressions;
- direct raw `isPro` feature gates that should use capabilities;
- broken deletion paths;
- accidental mission/workout scope;
- unrelated formatting/dependency churn;
- missing tests or states.

## 14. Final report format

Return a concise evidence-based report:

1. **Implemented** — user flow and server/database behavior.
2. **Architecture** — capability boundary, Body Analysis domain boundary, future Coach handoff.
3. **Files changed** — mobile, server/database, tests/docs.
4. **Verification** — exact commands and real results.
5. **Privacy and safety** — photo lifecycle, provider processing, stored data, refusals, deletion.
6. **Live status** — distinguish mocks, local API, live Gemini, native smoke, migrations, deployment, and store configuration.
7. **Production rollout** — backward-compatibility evidence and the exact safe deployment/release order for the live Play Store app.
8. **Remaining limitations/TODOs** — genuine unresolved items only.

Do not claim “done,” “production-ready,” “secure,” “deployed,” “live AI verified,” or “subscription configured” unless real tool output proves that exact statement.
