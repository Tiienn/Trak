// Trak — public "how to delete your account" page.
// The app stores (Google Play / App Store) require a publicly reachable URL that
// explains how users request account and data deletion. This function serves that
// page. It is intentionally PUBLIC (verify_jwt = false in config.toml): the stores'
// review crawlers fetch it with no auth, and there's nothing sensitive here.

import { corsHeaders } from '../_shared/nutrition.ts';

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Delete your Trak account</title>
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
    max-width: 600px;
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
    <h1>Delete your Trak account</h1>
    <p>You can permanently delete your Trak account and all of your data at any time. There are two ways to do it.</p>

    <h2>1. In the app</h2>
    <p>Open Trak and go to <strong>Profile &rarr; Delete account</strong>. This permanently erases your account and all logged data immediately. This cannot be undone.</p>

    <h2>2. If you can't access the app</h2>
    <p>Email <a href="mailto:tien820@gmail.com">tien820@gmail.com</a> from the email address on your account and we'll delete it for you.</p>

    <h2>What gets deleted</h2>
    <ul>
      <li>Your account and sign-in</li>
      <li>Your meals and food logs</li>
      <li>Your weight, water, and exercise logs</li>
      <li>Your supplements</li>
      <li>Your preferences and settings</li>
    </ul>

    <p class="muted">Deletion is immediate and permanent. We keep no backup copy of your data once your account is deleted.</p>
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
