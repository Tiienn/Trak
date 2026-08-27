# Trak: Body Transformation — AI Progress MVP PRD

**Document status:** Build-ready product requirements

**Immediate deliverable:** AI Body Analysis / Progress tentpole inside the existing Trak app

**Future product:** One Trak app connecting Nutrition, Coach, and Progress

---

## 1. Executive decision

Build **AI Body Analysis inside the existing Trak app** as the first version of the **Trak Progress** tentpole.

Do not create a second Expo project, bundle identifier, account system, subscription app, nutrition tracker, workout tracker, or social product in this phase.

The long-term product is one body-transformation system:

> **Eat → Train → Measure → Adjust**

The intended public positioning after the ecosystem is sufficiently complete is:

> **Trak: Body Transformation**
>
> *Calories, Workouts & Progress*

The App Store metadata rename is a later release task. This MVP must not change bundle identifiers, store records, versions, or deployment configuration merely to adopt the future positioning.

## 2. Product vision and tentpole strategy

Trak should not become a collection of unrelated wellness features. It should have three tentpoles that reinforce one transformation loop.

### Tentpole 1 — Trak Nutrition

**Job:** Help the user eat according to their goal.

- AI meal scanning
- calorie and macro tracking
- nutrition history and coaching
- weight context
- daily nutrition adherence

**Cadence:** Daily

**Business role:** Acquisition and high-frequency data

### Tentpole 2 — Trak Coach

**Job:** Tell the user what to do today and this week.

Future scope:

- stable four-week workout blocks
- exercise progression and substitutions
- daily missions
- weekly targets and review
- plan changes that require user approval
- comeback and recovery missions

**Cadence:** Daily and weekly

**Business role:** Retention

### Tentpole 3 — Trak Progress

**Job:** Show whether the plan is working and provide evidence for the next adjustment.

This MVP builds the foundation:

- standardized front/side/back photos
- AI-assisted visual analysis
- weight and optional waist context
- nutrition adherence context
- repeat check-ins
- structured training and nutrition priorities
- private history and deletion controls

**Cadence:** Every 3–4 weeks

**Business role:** Proof, motivation, and conversion

### Why Body Analysis belongs in Trak

A generic photo scanner can only produce generic advice. Trak can connect the photo check-in with:

- the user's stated goal;
- current weight and weight trend;
- optional waist measurement;
- calorie and protein targets;
- recent calorie/protein logging consistency;
- training environment and experience;
- previous standardized check-ins.

The defensible product is not “AI rates your body.” It is:

> **Trak observes what changed, explains the limits of that observation, and identifies the smallest sensible focus before the next check-in.**

## 3. Immediate MVP boundary

This build implements **Progress**, not the full Coach or mission ecosystem.

It must produce structured outputs that a future Coach can consume, but it must not prematurely build:

- full workout programs;
- sets/reps/load performance logging;
- mission tables or XP;
- daily/weekly/monthly plan orchestration;
- autonomous plan changes;
- a multi-agent system.

The Body Analysis result may recommend a weekly focus and 3–5 starter exercises. These are recommendations, not a generated training program or logged workout block.

## 4. Target user

An adult pursuing general fat loss, muscle retention/gain, or recomposition who:

- finds scale weight alone incomplete or discouraging;
- wants consistent progress photos without public comparison;
- wants a small number of practical next actions;
- may already log food and weight in Trak;
- does not need bodybuilding judging, genetic ratings, or medical body-composition measurements.

## 5. Product promise

> **See what is changing. Understand what the data can and cannot show. Know what to focus on next.**

## 6. Product principles

1. **Progress over judgment.** Compare the user only with their own prior check-in.
2. **Action over score.** Return at most two priorities.
3. **One coach identity.** Results should be phrased as Trak guidance, not conflicting specialist agents.
4. **Evidence before adjustment.** Use nutrition/weight/photo history when available and say when evidence is insufficient.
5. **Stable plans over AI novelty.** The future Coach should consume these results; this feature must not generate random daily workouts.
6. **User approval.** Never silently change calorie, macro, goal, or future workout settings.
7. **Honest uncertainty.** Every visual estimate carries quality/confidence and limitations.
8. **Privacy by design.** Raw body photos stay on the device after analysis; Trak's backend never stores them.
9. **No surprise paywall.** Gate before camera/gallery permissions.
10. **No shame.** Use supportive, body-neutral, non-punitive language.

## 7. Existing technical constraints

Extend the existing architecture rather than replacing it:

- Expo SDK 57, React Native 0.86, TypeScript 6, Expo Router.
- Supabase Auth, Postgres, RLS, and Edge Functions.
- Gemini is called only from server-side Supabase Edge Functions.
- RevenueCat `pro` entitlement plus the existing seven-day account trial and tester access.
- Warm editorial theme in `src/constants/theme.ts`.
- Existing profile, meals, weights, exercises, auth, purchases, privacy, and account-deletion flows.
- **Trak Nutrition is already live and usable on Google Play.** This is an extension of a production app, not a greenfield prototype.
- Existing checkout is dirty; every pre-existing modified/untracked file must be preserved.

Before using Expo APIs, consult the exact versioned documentation at:

`https://docs.expo.dev/versions/v57.0.0/`

### Production compatibility requirements

Installed Play Store clients may continue running while the new backend schema/functions are introduced and while the new mobile version rolls out. Therefore:

- database migrations must be additive, idempotent where repository conventions require it, and safe for old clients;
- do not drop, rename, reinterpret, or make newly required any existing profile, meal, weight, exercise, subscription, or AI fields;
- existing Nutrition screens and the deployed `analyze-food`/chat contracts must continue working unchanged;
- shared Edge Function helpers must remain backward compatible with the already-released clients;
- new Body Analysis tables/functions must be isolated so an unavailable or not-yet-deployed Body backend cannot break Nutrition startup or data loading;
- new client code must show a friendly unavailable/retry state if the Body function or migration is not yet present;
- privacy and account-deletion behavior must remain correct during the transition;
- the implementation report must include a safe release order for later authorization, normally additive migration → Edge Functions/privacy pages → mobile store release;
- Codex must not perform that deployment in this task.

## 8. Capability-ready subscription architecture

The future product catalog is:

### Trak Nutrition

- AI meal scanning
- nutrition Chat/Ask
- nutrition insights

### Trak Coach

- workout recommendations
- training missions and weekly plans
- Body Analysis / Progress check-ins

### Trak Complete

- Nutrition + Coach + Progress
- cross-domain recommendations using real nutrition and training history

### Current MVP behavior

Do **not** create or deploy new RevenueCat products, offerings, entitlements, or store subscriptions in this task.

Introduce a small typed capability resolver so feature gates no longer depend directly on one ambiguous boolean. It should support capabilities equivalent to:

```ts
type TrakCapabilities = {
  nutritionAi: boolean;
  bodyAnalysis: boolean;
  coach: boolean;
};
```

Rules for this MVP:

- legacy/current `pro` grants all three capabilities and is treated as future **Trak Complete**;
- existing seven-day trial grants all three;
- tester access grants all three;
- future RevenueCat `nutrition`, `coach`, and `complete` entitlements may be mapped later without changing feature screens;
- existing Nutrition AI behavior must not regress;
- Body Analysis gates on `bodyAnalysis`, not a raw `isPro` check;
- no feature is removed from an existing subscriber.

The paywall may update its copy to mention AI Body Analysis, but it must continue to use the existing available RevenueCat packages. It must not pretend that not-yet-created Nutrition/Coach/Complete store products are purchasable.

## 9. MVP information architecture

Do not redesign the five-tab application in this phase. Do not add a sixth tab or change the central meal-scan behavior.

### 9.1 Visual design source of truth

The existing Trak screenshots below are product references, not loose inspiration:

- `/Users/tien/Library/Application Support/Hermes/composer-images/composer_2026-08-25_19-15-09-960_03d0f4.jpg`
- `/Users/tien/Library/Application Support/Hermes/composer-images/composer_2026-08-25_19-15-12-563_beff28.jpg`
- `/Users/tien/Library/Application Support/Hermes/composer-images/composer_2026-08-25_19-15-15-110_84267d.jpg`
- `/Users/tien/Library/Application Support/Hermes/composer-images/composer_2026-08-25_19-15-19-630_1da3e4.jpg`
- `/Users/tien/Library/Application Support/Hermes/composer-images/composer_2026-08-25_19-15-24-395_5f3b57.jpg`
- `/Users/tien/Library/Application Support/Hermes/composer-images/composer_2026-08-25_19-15-27-311_08da19.jpg`
- `/Users/tien/Library/Application Support/Hermes/composer-images/composer_2026-08-25_19-15-30-778_d17b1b.jpg`

The implementation must preserve the design language already encoded in `src/constants/theme.ts` and neighboring screens:

- warm editorial rather than clinical fitness-tech;
- espresso-green dark canvas and cream light canvas;
- low-contrast elevated cards (`backgroundElement`) rather than borders around everything;
- forest green as the single primary action/accent color;
- terracotta, lime, and gold reserved for macro identity—not reused decoratively for Body Analysis confidence or body judgments;
- editorial serif for the Trak wordmark, selected display headings, section titles, and hero numbers;
- system sans for navigation, controls, card labels, body copy, and dense data;
- generous vertical rhythm using existing 4/8/16/24/32/64 spacing tokens;
- large rounded cards, pill segmented controls, circular completion controls, quiet dividers, and trailing chevrons;
- one obvious filled-green primary action per screen, with tonal/dark secondary actions;
- the current five-slot bottom navigation and elevated circular meal-scan control remain visually and behaviorally unchanged;
- no gradients, neon, glassmorphism, generic blue/purple AI styling, excessive shadows, tiny dashboard tiles, or a new competing component library.

Body Analysis must feel like an existing Trak surface:

- use an editorial `Progress`/`Body Analysis` heading and short calm subtitle;
- use familiar stacked cards for the latest check-in, strengths, focus areas, training, nutrition, evidence, history, and privacy;
- use the established segmented-control pattern for Front / Side / Back and Before / Latest selection;
- use green outline/guide/check states for pose completion; avoid red unless communicating a genuine destructive/error state;
- keep the capture step focused, with one pose, one instruction, and one primary action at a time;
- put persistent capture/analyze actions above safe-area/tab insets without covering scroll content;
- use warm, direct copy with restrained information density and progressive disclosure;
- body photos are private user content, never decorative hero imagery, Home thumbnails, card backgrounds, or share-card imagery;
- never reuse the circular **Trak Score** treatment for physique, body-fat, attractiveness, or analysis confidence. Confidence is a quiet text label/evidence card, not a gamified body score;
- do not use macro rings to visualize body quality. If cadence/progress needs a visual, prefer dated timelines, check-in labels, and comparison cards;
- support the existing light theme even though the supplied references show dark mode.

### 9.2 Visual acceptance criteria

- New screens use existing theme tokens and shared components whenever available; hard-coded copies of palette values require justification.
- Card radius, control height, horizontal gutter, type scale, and button treatment visually match neighboring Trak screens on the same device.
- Primary actions remain reachable without colliding with the central scan tab, gesture bar, keyboard, or large-text layouts.
- Long AI text is divided into scannable cards and short paragraphs; no unbounded chat-style wall of text is used for the analysis result.
- Loading uses quiet skeleton/progress treatment in Trak colors; no fake precision percentage is shown unless it represents actual deterministic upload progress.
- Empty, locked, retake, unsupported, missing-photo, and error states look native to Trak rather than like generic system dialogs.
- Capture guides remain legible over light and dark clothing/backgrounds without implying body-shape targets.

### Home entry

Add a compact **Progress** or **Body Analysis** card to Home:

- No scans: “Track changes beyond the scale” and “Start body check-in”.
- Existing scan: latest date, one-line current priority, and “View progress”.
- Locked: explain Body Analysis before routing to the existing paywall.
- Never show a body photo on Home.

### Profile entry

Add a Progress/Body Analysis entry for managing:

- training preferences;
- consent information;
- locally stored photos;
- scan history;
- delete-all body data.

### Routes

Expected Expo Router routes:

- `src/app/body-analysis/index.tsx` — hub, latest result, history, empty/error states.
- `src/app/body-analysis/setup.tsx` — explanation, consent, training preferences.
- `src/app/body-analysis/capture.tsx` — guided capture/gallery workflow.
- `src/app/body-analysis/result/[id].tsx` — result, evidence, recommendations.
- `src/app/body-analysis/privacy.tsx` — photo handling and deletion.

Codex may consolidate routes if the existing Router structure strongly favors it, but every user-visible state and a deep-linkable result must remain.

## 10. Primary user flow

### 10.1 Entry and eligibility

Before requesting camera or gallery permissions:

- require a signed-in user and loaded profile;
- if `profile.age < 18`, block Body Analysis with calm adult-only copy;
- do not change unrelated Trak behavior for under-18 profiles in this task;
- resolve `bodyAnalysis` capability;
- if locked, show feature value and route to paywall before touching photos or permissions.

### 10.2 First-use explanation and explicit consent

Explain in plain language:

- Trak sends the chosen photos through its server to Google's Gemini API for analysis;
- raw photos are not stored in Trak's database, Supabase Storage, or server logs;
- completed progress photos remain in app-private storage on this device;
- photos may be unavailable after reinstall/device change and are not cross-device synced;
- the stored cloud result contains analysis and non-image context;
- the user can delete one scan or all Body Analysis data;
- results are visual estimates and general wellness guidance, not medical measurements, diagnosis, or treatment;
- the feature requires one adult, fitted workout clothing, and no nudity.

Consent must be unchecked by default. Store:

- consent version;
- accepted timestamp;
- user id;
- preferences version.

A future consent-copy version change must be able to require renewed consent.

### 10.3 Check-in profile

Collect or confirm:

- goal inherited from the existing profile;
- training location: home, gym, or both;
- experience: beginner, intermediate, advanced;
- days available: 2–6;
- bounded equipment selections;
- optional limitations note, capped and sanitized;
- current weight from Trak, with an explicit option to log/update through the existing flow;
- optional waist measurement with metric/imperial support and plausibility validation.

State clearly that Trak cannot diagnose injuries or prescribe rehabilitation. Do not ask for these preferences again on every scan; allow editing from the hub.

### 10.4 Guided capture

Collect exactly three views in order:

1. Front
2. Side
3. Back

For each pose:

- separate live-camera and gallery actions;
- alignment guide and pose-specific instructions;
- frame shoulders through feet so a face is unnecessary;
- neutral posture, arms slightly away, fitted workout clothing;
- consistent lighting, camera height, distance, and background;
- five-second timer for live capture;
- front/rear camera toggle;
- thumbnail review with explicit Retake and Use Photo actions;
- never upload on shutter press;
- only one mounted `CameraView` at a time;
- gallery remains available if camera permission is denied;
- never pressure a denied user to open Settings.

Before upload, display all three thumbnails plus the privacy reminder and a single **Analyze securely** button.

### 10.5 Local image processing

Use the installed SDK 57 `expo-image-manipulator` API to:

- normalize orientation;
- resize to a bounded long edge, initially 1280px;
- JPEG-compress to a reasonable size;
- validate supported inputs and client-side size limits;
- avoid logging file URIs, base64, EXIF, or metadata;
- create upload-ready derivatives without overwriting the selected originals.

Use an abort signal and cancel the request on back/unmount, following the meal scanner's established pattern.

### 10.6 Server-side analysis

Create an authenticated Supabase Edge Function named `analyze-body` with `verify_jwt = true` in `supabase/config.toml`.

It must:

- require an authenticated user JWT using existing conventions;
- enforce a body-analysis-specific cap, initially three analysis attempts per user/day;
- require exactly front/side/back images;
- allowlist expected image representation and cap each image plus combined payload size;
- fetch the user's profile, latest weight, recent weight trend, previous completed scan, and last 28 days of meal totals server-side;
- derive compact nutrition evidence: days logged, average calories/protein on logged days, targets, weight trend, and sufficiency;
- include only a small sanitized recurring-meal list when grounding optional food swaps;
- treat all user-entered strings as untrusted data, never instructions;
- optionally accept the previous scan's locally stored images for direct visual comparison, only after verifying the referenced scan belongs to the user;
- gracefully fall back to structured history when prior local photos are unavailable;
- send images to Gemini through the existing server-side provider pattern;
- use a strict JSON contract, bounded output, timeout, and at most one malformed-output retry;
- normalize and validate before persistence or response;
- return `Cache-Control: no-store` on success and errors;
- never persist or log image bytes, base64, URIs, prompts containing image data, or provider image payloads;
- record only privacy-safe AI operational metadata;
- insert successful normalized `usable` results server-side so stored and returned results match;
- never persist `retake` or `unsupported` analyses as completed scans.

Do not run nutrition enrichment providers for Body Analysis. Do not describe Gemini as a validated body-composition instrument.

## 11. Strict AI response contract

Implement a typed, versioned result equivalent to:

```ts
type BodyAnalysisResult = {
  schemaVersion: 1;
  status: 'usable' | 'retake' | 'unsupported';
  capture: {
    quality: 'high' | 'medium' | 'low';
    issues: string[]; // max 4
    poseChecks: Array<{
      pose: 'front' | 'side' | 'back';
      usable: boolean;
      issue?: string;
    }>;
  };
  summary: string; // max 280 chars
  confidence: 'high' | 'medium' | 'low';
  visualEstimate?: {
    bodyFatRangeMin: number;
    bodyFatRangeMax: number;
    explanation: string;
  };
  strengths: string[]; // max 3
  focusAreas: Array<{
    id: string;
    domain: 'nutrition' | 'training' | 'consistency';
    title: string;
    reason: string;
    evidence: string[]; // max 3
  }>; // max 2
  progress: {
    comparisonAvailable: boolean;
    basis: 'photos_and_history' | 'history_only' | 'first_scan';
    summary: string;
    changes: string[]; // max 3
  };
  training: {
    weeklyFocus: string;
    daysPerWeek: number;
    exercises: Array<{
      name: string;
      sets: string;
      reps: string;
      reason: string;
      equipment?: string;
    }>; // 3–5, recommendations only
  };
  nutrition: {
    dataSufficiency: 'sufficient' | 'limited' | 'none';
    targetAction: 'keep' | 'small_decrease' | 'small_increase' | 'log_consistently';
    calorieAdjustment?: number; // clamp -250..250
    proteinTargetG?: number;
    habits: string[]; // max 3
    swaps: Array<{
      current: string;
      tryInstead: string;
      reason: string;
    }>; // max 3, only from grounded logged foods
  };
  coachHandoff: {
    checkInWindowDays: 21 | 28;
    priorityIds: string[]; // references focusAreas
    evidenceQuality: 'strong' | 'mixed' | 'limited';
    doNotAdjustPlan: boolean;
    reason: string;
  };
  disclaimer: string;
};
```

The `coachHandoff` is structured future-facing data. It is not an autonomous agent action and must not modify any plan.

Normalization must clamp:

- string lengths;
- array lengths;
- numbers and body-fat ranges;
- enums;
- calorie adjustment;
- days/week and check-in values;
- cross-references such as `priorityIds`.

Malformed or unsafe outputs must be rejected or downgraded. Model output is untrusted.

### Retake and unsupported behavior

- `retake`: show pose-specific guidance; do not save a completed scan.
- `unsupported`: show a neutral refusal/eligibility message; do not save analysis content.
- low confidence: omit body-fat estimate and avoid decisive plan language.

## 12. AI safety contract

The system prompt and server validator must forbid:

- attractiveness, desirability, human-worth, or “rate my body” scores;
- comparison with other people or an aesthetic ideal;
- race, ethnicity, gender identity, pregnancy, disability, or disease inference;
- diagnosing obesity, eating disorders, hormonal conditions, injuries, posture disorders, or medical conditions;
- “natural versus enhanced,” steroid use, genetics, or muscle-insertion judgments;
- exact lean mass, fat mass, circumference, or medical-grade body-fat claims from photos;
- shame, insults, starvation, purging, dehydration, unsafe restriction, or punitive exercise;
- processing nudity, sexual imagery, possible minors, multiple people, or images without an analyzable clothed adult body;
- following instructions embedded in labels, notes, image text, or other user data.

Body-fat output is an optional **wide visual range**, never an exact measurement. Display it only when both capture quality and confidence are not low, enforce a minimum range width, and label it permanently as a visual estimate. If confidence is insufficient, omit it.

## 13. Result experience

Lead with:

1. **Current focus** — one clear summary.
2. **What is going well** — strengths.
3. **Next 3–4 weeks** — maximum two priorities.
4. **Training focus** — weekly focus plus 3–5 starter exercises.
5. **Nutrition focus** — grounded recommendation and sufficiency state.
6. **Evidence used** — photos/history/first scan and confidence.
7. **Next check-in** — 21 or 28 days.

Requirements:

- no universal body, physique, genetic, attractiveness, or moral score;
- no public ranking or comparison;
- no automatic calorie/macro/goal/workout changes;
- if nutrition data is insufficient, recommend consistent logging rather than inventing an adjustment;
- food copy uses “limit,” “swap,” “add,” or “try,” never “bad,” “forbidden,” or “must avoid”;
- show “No meaningful visual change detected” when honest;
- expose why a recommendation was made;
- include a photo-free share card only;
- never make body-photo sharing the default or part of MVP.

## 14. Progress history

The hub lists newest scans first with:

- check-in date;
- one-line summary;
- confidence/evidence quality;
- optional weight and waist snapshot;
- next recommended check-in state.

When local photos exist:

- allow front/side/back before-and-after toggles;
- clearly label dates;
- never upload photos merely to browse history.

When local photos are absent:

- keep the cloud analysis result;
- show “Photos unavailable on this device”;
- never imply cross-device photo sync;
- allow deleting the cloud result anyway.

Do not encourage daily body checking. Before 21 days, emphasize the recommended date while allowing a deliberate early check-in.

## 15. Data and persistence

### 15.1 Cloud

Add a timestamped migration for:

#### `body_analysis_preferences`

- user id primary/unique foreign key;
- consent version/timestamp;
- training location;
- experience;
- days available;
- bounded equipment list;
- optional sanitized limitations note;
- preferences/schema version;
- timestamps.

#### `body_scans`

- scan id;
- user id;
- created timestamp;
- previous scan id;
- goal snapshot;
- weight snapshot;
- optional waist snapshot;
- compact nutrition evidence snapshot;
- normalized result JSON;
- schema/model/prompt versions;
- no image columns, URIs, base64, or provider payloads.

#### Body-analysis usage counter

- service-role-only daily counter;
- no authenticated client read/write.

#### AI observability

- add `body_analysis` to feature constraints/types;
- preserve privacy-safe operational-only telemetry.

RLS must let authenticated users select/delete only their own preferences/results. If the Edge Function inserts normalized results through service role, direct authenticated insert/update should not permit forged completed analyses.

Every new row must cascade or be explicitly erased during account deletion.

### 15.2 Device

Store completed body photos under an app-owned document directory grouped by user id and scan id. Maintain a user-scoped AsyncStorage manifest mapping scan id to front/side/back URIs.

Implement reusable helpers to:

- persist all three photos after a successful result;
- handle a partial local write without a false complete manifest;
- load the manifest for the current user only;
- verify file existence;
- delete one scan's photos;
- delete all body photos for one user;
- recover cleanly from missing files;
- clear the manifest during account deletion.

Do not claim application-level encryption unless implemented and tested. MVP copy may say photos remain in the app's private on-device storage.

### 15.3 Deletion

- **Delete scan:** remove the owned cloud row and local photos.
- **Delete local photos only:** optionally allow retaining the text result while deleting photos.
- **Delete all Body Analysis data:** remove preferences/results plus local files after destructive confirmation.
- **Delete account:** update existing server and device cleanup for every new table, manifest, and file directory.
- Update public privacy and account-deletion copy accurately.

## 16. Future Coach compatibility without premature implementation

The MVP must establish clean boundaries for future features:

- body analysis domain types live outside meal types;
- access capabilities live outside individual screens;
- normalized results are versioned;
- `focusAreas` have stable ids/domains;
- `coachHandoff` captures evidence quality and whether adjustment is warranted;
- Body Analysis never writes missions or workout plans directly;
- future Coach code can read results through a repository/service API instead of parsing screen state;
- no multi-agent framework is added.

Do not create speculative tables for missions, workout programs, XP, or plan versions in this task.

## 17. Required states and edge cases

Implement and test:

- signed out or missing profile;
- capability loading and locked state;
- current `pro`, trial, and tester access preserving old behavior;
- under 18;
- consent absent and consent-version change;
- camera permission loading, denied/askable, and permanently denied;
- gallery path without camera permission;
- front/side/back capture, review, and retake;
- app background/unmount during capture or analysis;
- abort/cancel;
- invalid, unsupported, oversized, or partial pose input;
- low-quality retake;
- unsupported/nudity/multiple-person/possible-minor refusal;
- server timeout, 401, 413, 429, provider error, malformed JSON, and empty response;
- successful first scan;
- repeat scan with and without previous local photos;
- first-scan/history loading, refreshing, empty, error, and populated states;
- local files missing while cloud result remains;
- delete local photos only, one scan, all body data, and account deletion;
- light/dark mode, small phone, large text, VoiceOver/TalkBack labels, and minimum tap targets.

## 18. Explicit non-goals

Do not build in this MVP:

- a second Trak app or bundle;
- the future App Store metadata rename;
- new live RevenueCat products/offerings/entitlements;
- a full workout logger, program builder, or generated four-week calendar;
- daily/weekly/monthly mission generation;
- XP, levels, streak changes, or a Games redesign;
- the final future tab/navigation redesign;
- multiple autonomous AI agents;
- AI chat about the scan;
- automatic nutrition or training plan changes;
- social feed, public profiles, leaderboards, or body-photo sharing;
- future-body images, 3D avatars, AR, inferred measurements, posture diagnosis, or exercise-form analysis;
- wearable/Health Connect reads;
- medical or DEXA-equivalent claims;
- universal body/physique/attractiveness scores.

## 19. Expected implementation areas

Codex must inspect definitions and usages before editing. Expected files include:

### Mobile integration

- Modify `src/app/(tabs)/index.tsx`
- Modify `src/app/(tabs)/explore.tsx`
- Modify `src/app/_layout.tsx`
- Modify `src/app/paywall.tsx`
- Modify `src/lib/purchases.tsx`
- Modify existing Nutrition AI gates only through a backward-compatible capability resolver
- Modify `src/lib/types.ts` only for shared exports that genuinely belong there
- Modify `src/lib/account.ts`
- Modify `src/components/icons.tsx` only if needed

### New Body Analysis domain

- Create `src/app/body-analysis/index.tsx`
- Create `src/app/body-analysis/setup.tsx`
- Create `src/app/body-analysis/capture.tsx`
- Create `src/app/body-analysis/result/[id].tsx`
- Create `src/app/body-analysis/privacy.tsx`
- Create `src/lib/access.ts` or an equivalently focused capability module
- Create `src/lib/body-analysis.ts`
- Create `src/lib/body-analysis-store.tsx` or a focused repository/provider
- Create `src/lib/body-photo-store.ts`
- Create pure normalization/evidence/cadence helpers as appropriate

Do not grow `src/lib/store.tsx` into a cross-domain monolith.

### Server/database

- Create `supabase/functions/analyze-body/index.ts`
- Create function-local pure helpers and Deno tests
- Modify `supabase/functions/_shared/nutrition.ts` only for genuinely shared auth/telemetry primitives; do not mix body logic with nutrient enrichment
- Modify `supabase/functions/privacy/index.ts`
- Modify `supabase/functions/delete-account/index.ts`
- Modify `supabase/config.toml`
- Add a timestamped migration under `supabase/migrations/`
- Update `docs/supabase-setup.sql` if it remains the maintained full bootstrap schema

### Tests

- Add focused Node tests matching repository conventions
- Add Deno tests for pure Edge Function behavior
- Update `package.json` test scripts only as necessary

## 20. Testing and verification

### 20.1 Unit tests

Cover:

- capability resolution preserves legacy `pro`, trial, and tester access;
- future entitlement mapping does not remove current access;
- strict result normalization and bounds;
- malformed/unsafe output rejection;
- body-fat visibility rules;
- nutrition sufficiency and bounded adjustment;
- coach handoff cross-reference validation;
- 21/28-day cadence;
- age and consent-version states;
- waist plausibility/unit conversion;
- input-string sanitization;
- per-user local manifest isolation;
- partial writes and missing-file recovery.

### 20.2 Edge Function tests

Cover:

- auth requirement;
- exact image count and size validation;
- user-owned previous scan validation;
- server-derived profile/nutrition/weight context;
- untrusted label sanitization;
- prompt safety contract;
- malformed/empty provider response;
- retake/unsupported result not persisted;
- normalized usable result persisted with no image data;
- body-specific daily limit;
- no-store response headers.

Mock provider calls deterministically. A mock proves contract handling, not model accuracy.

### 20.3 Required commands

Run and fix:

```bash
npm run test
npm run lint
npx tsc --noEmit
npx expo-doctor
```

Run focused Deno tests for the new Edge Function and the strongest feasible Expo production export/build check supported by the repository.

### 20.4 Manual smoke

On at least one native platform/emulator when available:

- gate before permissions;
- under-18 block;
- consent and preferences;
- camera and gallery;
- three-pose review/retake;
- loading, cancel, and errors;
- retake and unsupported states;
- successful result rendering;
- history with/without local photos;
- delete-local-only, delete scan, and delete all;
- dark mode, small screen, and accessibility basics.

Never describe mocked UI output as live Gemini accuracy. If the function is not deployed or cannot make a real provider request, report that boundary.

## 21. Overall acceptance criteria

The MVP is complete only when:

- Body Analysis is an integrated **Trak Progress** feature with no new app or tab;
- access uses a backward-compatible capability resolver and existing customers lose nothing;
- an eligible adult can consent, capture/select and review three standardized photos, then analyze;
- Gemini/provider credentials remain server-side;
- the client receives only a strict normalized, versioned result;
- raw body photos never enter server persistence or logs;
- unsuitable images produce a retake/refusal instead of fabricated analysis;
- results show no more than two evidence-backed focus areas;
- training output remains recommendation-only and future-Coach-compatible;
- nutrition guidance reflects data sufficiency and never silently alters targets;
- repeat scans compare only the user's own history;
- local photos and cloud results can be deleted separately and together;
- account deletion removes all new local/cloud data;
- privacy and paywall copy are accurate;
- no mission engine, full workout product, multi-agent framework, or new store subscription is smuggled into scope;
- the currently published Play Store Nutrition app remains backward compatible with the additive database/shared-server changes;
- tests, lint, typecheck, Deno tests, and feasible production checks pass;
- final reporting separates local/mock verification, live provider verification, native smoke testing, and deployment status.

## 22. Roadmap after this MVP

This roadmap is context, not current implementation scope.

### Phase 2 — Trak Coach foundations

- goal hierarchy: monthly outcome → weekly targets → daily actions;
- minimal workout performance data: exercise, sets, reps, resistance, optional difficulty;
- stable four-week plans and progression;
- weekly review requiring user approval for adjustments.

### Phase 3 — Mission engine

- daily nutrition/training/recovery missions;
- weekly scorecard;
- monthly Progress checkpoint;
- comeback missions rather than punitive streak loss;
- reward controllable behaviors, never body outcomes or unsafe restriction.

### Phase 4 — Unified product experience

- Today becomes mission/Coach home;
- Nutrition, Train, and Progress become primary domains;
- Chat becomes contextual rather than a standalone destination;
- Games mechanics move into real behavior loops;
- launch Nutrition, Coach, and Complete commercial offerings when the corresponding products exist.
