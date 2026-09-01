// Trak — public privacy policy page.
// The app stores (Google Play / App Store) require a publicly reachable privacy
// policy URL. This function serves that page. It is intentionally PUBLIC
// (verify_jwt = false in config.toml): the stores' review crawlers fetch it with
// no auth, and there's nothing sensitive here.

import { corsHeaders } from '../_shared/nutrition.ts';

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Trak Privacy Policy</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
    color: #1a1a1a;
    background: #f7f8fa;
    padding: 24px;
  }
  main {
    max-width: 640px;
    margin: 40px auto;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 32px;
  }
  h1 { font-size: 1.6rem; margin: 0 0 8px; }
  h2 { font-size: 1.15rem; margin: 28px 0 8px; }
  p { margin: 0 0 12px; }
  ol, ul { margin: 0 0 12px; padding-left: 22px; }
  li { margin-bottom: 6px; }
  strong { color: #10B981; }
  a { color: #10B981; }
  .accent { height: 4px; width: 48px; background: #10B981; border-radius: 2px; margin: 0 0 20px; }
  .muted { color: #6b7280; font-size: 0.9rem; margin-top: 28px; }
  @media (prefers-color-scheme: dark) {
    body { color: #e5e7eb; background: #0b0f14; }
    main { background: #111820; border-color: #1f2937; }
    .muted { color: #9ca3af; }
  }
</style>
</head>
<body>
  <main>
    <div class="accent"></div>
    <h1>Trak Privacy Policy</h1>
    <p class="muted" style="margin-top: 0;">Effective August 2026</p>

    <h2>Who we are</h2>
    <p>Trak is a calorie- and nutrition-tracking app. This policy covers the Trak Android and iOS app.</p>

    <h2>Account data</h2>
    <p>To create your account we collect your email address and password (handled by <strong>Supabase Auth</strong>).</p>

    <h2>Data you log</h2>
    <p>The information you enter is stored in your account (on Supabase, encrypted in transit):</p>
    <ul>
      <li>Your profile: age, sex, height, weight, activity level, and goal</li>
      <li>Meals and their nutrition estimates</li>
      <li>Corrections you make to meal nutrition estimates</li>
      <li>Weight history</li>
      <li>Water intake</li>
      <li>Exercise entries</li>
      <li>Supplements and daily check-offs</li>
      <li>Body Analysis preferences, written results, and the goal, weight, or optional waist measurement used for a check-in</li>
    </ul>

    <h2>Meal photos</h2>
    <p>When you scan a meal, the photo is sent to our server and forwarded to Google's <strong>Gemini API</strong> solely to estimate nutrition. We do not store your photos on our servers &mdash; photos are kept only on your device.</p>

    <h2>Body Analysis photos</h2>
    <p>If you choose Body Analysis, your three adult progress photos are resized on your device, sent securely through our server, and forwarded to Google's <strong>Gemini API</strong> for that analysis. We also send limited context needed for the result: your goal, recent weight trend, optional waist measurement, training preferences, summarized nutrition evidence, and an earlier written check-in when available. Trak does not store these photos in its database or application logs. The progress copies shown later are stored only in the app's private cache on that device, are excluded from device backup, do not sync to another device, and can be deleted separately from the written result. Your device may clear cached copies when it needs space.</p>
    <p>We store the written Body Analysis result, your analysis preferences, the goal and measurements used for the check-in, and model and prompt versions. We also store a report if you report an inaccurate, unsafe, or other problematic analysis. Body Analysis is restricted to adults and is designed to refuse unsupported or unsafe image requests.</p>

    <h2>Chat</h2>
    <p>Messages you type to the assistant are processed by Google's <strong>Gemini API</strong> to answer you. Recent conversation context is kept on your device, not on our servers.</p>

    <h2>Third-party services we use</h2>
    <ul>
      <li><strong>Supabase</strong> &mdash; database and authentication</li>
      <li><strong>Google Gemini API</strong> &mdash; photo and text analysis</li>
      <li><strong>USDA FoodData Central</strong> &mdash; generic food nutrient lookups (food names only)</li>
      <li><strong>RevenueCat</strong> and <strong>Google Play</strong> &mdash; subscription billing. We never see your payment details.</li>
      <li><strong>Open Food Facts</strong> &mdash; barcode and food lookups (food names only)</li>
      <li><strong>Exa</strong> &mdash; web nutrition lookups (food names only)</li>
      <li><strong>Health Connect</strong> (Android, optional) &mdash; if you enable it, we write your logged meals' nutrition and your logged workouts (exercise session and active calories burned) to Health Connect. Trak does not read data from Health Connect.</li>
    </ul>

    <h2>Rate limiting</h2>
    <p>We count your daily AI requests (a number tied to your account) to prevent abuse.</p>

    <h2>AI reliability data</h2>
    <p>To improve reliability, we record technical details such as the AI model and prompt version, data source, response time, success or error status, and a pseudonymous account identifier. This technical log does not contain your meal or Body Analysis photo, chat text, food name, email address, nutrition totals, body measurements, or Health Connect data.</p>

    <h2>Nutrition estimates</h2>
    <p>Trak provides approximate nutrition and general wellness information, not medical advice, diagnosis, or treatment. Consult a qualified healthcare professional for medical or dietary care.</p>

    <h2>What we don't do</h2>
    <p>We do <strong>not</strong> sell your data, show ads, or share personal data with advertisers.</p>

    <h2>Data deletion</h2>
    <p>You can delete individual Body Analysis photos or results, erase all Body Analysis data, or delete your account in-app. Account deletion is available at <strong>Profile &rarr; Delete account</strong> and permanently erases your account and server-side account data. Trak also attempts to remove local Body Analysis photos from the current device. You can also see <a href="https://tqhgdnmzhuczuyyrmvzx.supabase.co/functions/v1/deletion-info">our account-deletion page</a>.</p>

    <h2>Children</h2>
    <p>Trak is not directed at children under 18. Calorie tracking is not appropriate for young children.</p>

    <h2>Changes</h2>
    <p>We'll update this page when our practices change.</p>

    <h2>Contact</h2>
    <p>Questions? Email <a href="mailto:support.trakapp@gmail.com">support.trakapp@gmail.com</a>.</p>
  </main>
</body>
</html>`;

Deno.serve((req: Request) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed.', { status: 405, headers: corsHeaders });
  }
  return new Response(PAGE, {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  });
});
