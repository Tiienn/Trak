# Trak

Trak is a connected health companion built with Expo and React Native. It brings
food, movement, body changes, and daily routines into one clear picture through
meal-photo analysis, barcode scanning, conversational logging, exercise and
Health Connect integration, progress scoring, reminders, supplements, games,
and RevenueCat subscriptions.

Support: [support.trakapp@gmail.com](mailto:support.trakapp@gmail.com)

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` and provide the public Supabase and
   RevenueCat SDK values.

3. Start the app

   ```bash
   npx expo start
   ```

Native integrations such as Health Connect, RevenueCat, Apple authentication,
and Android widgets require a development build; Expo Go cannot load them.

Useful commands:

```bash
npm run ios
npm run android
npm run lint
npm test
npx tsc --noEmit
npx expo-doctor
```

## Nutrition AI

Gemini identifies foods and estimates edible grams. Supabase Edge Functions
then resolve nutrients through USDA FoodData Central for generic foods, Open
Food Facts for branded/barcoded products, web references as a fallback, and
finally the model estimate when no grounded match passes validation.

Each result carries model, prompt, pipeline, and nutrition-source provenance.
Meal photos and chat text are not written to AI telemetry.

Barcode lookup uses Open Food Facts v3.6 `nutrition` data. It requires complete,
nonnegative calories and macros from packaging/manufacturer sources, supports
kJ-to-kcal conversion and distinct per-100 g/ml bases, and derives measured
servings from matching per-100 data. Conflicting serving values are noted in the
saved meal. Decimals are retained until display/logging. Incomplete nutrition
produces an error (not zero calories or “product not found”). Requests have a
12-second deadline including body parsing and cancel when the scanner closes.

## Google sign-in

The app uses Supabase's browser-based Google OAuth flow and returns to the
installed app through `trak://auth/callback`.

One-time dashboard setup:

1. In Google Auth Platform, create a **Web application** OAuth client and add
   `https://<your-project-ref>.supabase.co/auth/v1/callback` as an authorized
   redirect URI.
2. In Supabase **Authentication → Sign In / Providers → Google**, enable Google
   and paste that client ID and client secret.
3. In Supabase **Authentication → URL Configuration**, add
   `trak://auth/callback` to **Additional Redirect URLs**.

The Google client secret belongs only in Supabase. Never add it to `.env` or
ship it inside the app.

Production Edge Function secrets:

- `GEMINI_API_KEY` — required.
- `FDC_API_KEY` — recommended before public launch. The closed test falls back
  to USDA's rate-limited `DEMO_KEY`.
- `EXA_API_KEY` — optional final nutrition fallback.
- `AI_TELEMETRY_SALT` — used for stable pseudonymous reliability identifiers.

## Nutrition evaluations

Validate the seed dataset and scorer:

```bash
npm run test:eval
npm run eval:nutrition
```

Score exported model results:

```bash
npm run eval:nutrition -- --results /absolute/path/results.json --strict
```

The seed suite covers authoritative USDA portions, Mauritian dish recognition,
non-food behavior, and medical/minor safety. Mauritian numeric ground truth is
left pending until recipes are weighed and reviewed locally.

`--strict` exits nonzero on missing/duplicate/unknown result IDs, invalid or
negative nutrition, confidence outside 0–1, inconsistent item/meal totals,
wrong response kinds, unrecognized expected foods, or failed safety checks.
Every numeric reference case must be scored and meet **all** of these limits:

- Calories: absolute error ≤ max(15 kcal, 20% of the reference).
- Protein, carbs and fat individually: absolute error ≤ max(2 g, 20% of the reference).

These are engineering regression tolerances for the existing text/known-portion
seed set, not clinical guarantees or approval of photo recognition. The
reported ±10/20/30% rates use error relative to the reference; sMAPE remains a
separate metric. No numeric evidence is reported as `n/a`, not zero error.
`--strict` without `--results` fails; running without either flag only validates
the dataset. There is still no automated live-model/photo benchmark. Synthetic
test outputs verify the gate itself and must not be presented as model results.

## Release builds

`eas.json` contains development, preview, tester, and production profiles.
Production iOS submission uses the ignored credential under `credentials/ios`;
never commit signing keys or `.env` files. Generated store-listing graphics are
written to the ignored `store-assets` directory.
