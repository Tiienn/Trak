# Trak

Trak is an international calorie and nutrition tracker built with Expo and
React Native. It supports meal-photo analysis, barcode scanning, conversational
logging, exercise and Health Connect integration, progress scoring, nutrition
games, reminders, supplements, and RevenueCat subscriptions.

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

## Release builds

`eas.json` contains development, preview, tester, and production profiles.
Production iOS submission uses the ignored credential under `credentials/ios`;
never commit signing keys or `.env` files. Generated store-listing graphics are
written to the ignored `store-assets` directory.
