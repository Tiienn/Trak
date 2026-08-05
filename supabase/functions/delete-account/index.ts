// Trak — account deletion (destructive, irreversible).
// This runs on Supabase Edge Functions (Deno). A signed-in user hits this to
// permanently erase their account and every row of data we hold on them. It uses
// the service-role key (never shipped to the app) so it can delete across tables
// and remove the auth user itself.
//
// Ordering matters. We delete the user's data rows EXPLICITLY, children before
// parents, and only remove the auth user LAST. Two reasons:
//   1) Most tables have ON DELETE CASCADE from auth.users, so deleting the auth
//      user would clean them up — but `ai_usage` has NO foreign key and would be
//      left orphaned. Deleting everything explicitly is belt-and-braces: it also
//      protects us if a cascade is ever dropped in a future migration.
//   2) If any data delete fails we ABORT before touching the auth user, so the
//      account still exists and the user can safely retry. We never want a
//      half-deleted state where the login is gone but data lingers.

import { corsHeaders, json, jwtPayload } from '../_shared/nutrition.ts';

// Children before parents. supplement_checks references supplements; the rest are
// independent user-data tables. profiles last as the "parent" identity row.
const USER_TABLES = [
  'supplement_checks',
  'supplements',
  'saved_meals',
  'exercises',
  'water',
  'weights',
  'meals',
  'ai_usage',
  'profiles',
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  try {
    // verify_jwt has already checked the token SIGNATURE at the gateway, but the
    // public anon key is itself a valid JWT (role "anon"). Require a real
    // signed-in user so nobody can delete an account they aren't signed into.
    let userId = '';
    try {
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
      const payload = jwtPayload(token);
      userId = String(payload?.sub ?? '');
      if (payload?.role !== 'authenticated') {
        return json({ error: 'Please sign in to delete your account.' }, 401);
      }
    } catch {
      return json({ error: 'Please sign in to delete your account.' }, 401);
    }
    if (!userId) {
      return json({ error: 'Please sign in to delete your account.' }, 401);
    }

    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!url || !key) {
      // Without the service-role key we can't delete anything — fail loudly
      // server-side, generic message to the client.
      console.error('delete-account misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return json({ error: 'Server is not configured to delete accounts.' }, 500);
    }

    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const admin = createClient(url, key);

    // 1) Wipe the user's data rows first, in dependency order. A single failed
    //    table ABORTS the whole delete before the auth user is touched, so the
    //    account survives intact and the user can retry.
    for (const table of USER_TABLES) {
      const { error } = await admin.from(table).delete().eq('user_id', userId);
      if (error) {
        console.error('delete-account data delete failed', table, error.message);
        return json({ error: 'Could not delete your data. Please try again.' }, 500);
      }
    }

    // 2) Data is gone — now remove the auth user itself. Done last so a failure
    //    above never leaves a login without its data.
    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error('delete-account auth delete failed', authError.message);
      return json({ error: 'Could not finish deleting your account. Please try again.' }, 500);
    }

    return json({ ok: true }, 200);
  } catch (e) {
    console.error('delete-account error', (e as Error)?.message);
    return json({ error: 'Unexpected server error. Please try again.' }, 500);
  }
});
