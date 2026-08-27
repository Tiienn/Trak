import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { useAuth } from './auth';
import { dayKey } from './store';
import { supabase } from './supabase';

/** A supplement in the user's checklist. */
export type Supplement = { id: string; name: string; createdAt: string };

/** A single "taken" check-off: one supplement on one calendar day. */
export type SupplementCheck = { supplementId: string; day: string };

/** Longest allowed supplement name (kept in sync with the add/rename UI). */
const MAX_NAME = 40;

export type SupplementsContextValue = {
  /** False until the first per-user load settles. */
  loaded: boolean;
  /** Active supplements, oldest first. Empty array when signed out. */
  supplements: Supplement[];
  /** All loaded historical check-offs, used by History and personal records. */
  checks: SupplementCheck[];
  /** supplement id -> true when checked today. */
  checkedToday: Record<string, boolean>;
  /** How many supplements are checked today. */
  takenCount: number;
  /** Consecutive perfect days (see rule below), ending today or yesterday. */
  streak: number;
  /** Add by name (trimmed, 1..40 chars). Throws with a friendly Error message on failure. */
  addSupplement: (name: string) => Promise<void>;
  /** Rename. Throws on failure. */
  renameSupplement: (id: string, name: string) => Promise<void>;
  /** Delete (checks cascade server-side). Optimistic with rollback; throws on failure. */
  removeSupplement: (id: string) => Promise<void>;
  /** Check/uncheck today. Optimistic with rollback; throws on failure. */
  toggleTaken: (id: string) => Promise<void>;
};

/** Map a Supabase row to our client type. */
function rowToSupplement(r: any): Supplement {
  return {
    id: r.id,
    name: r.name,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}

/** Trim + validate a name, returning the clean value or a friendly error. */
function cleanName(name: string): { value: string } | { error: string } {
  const value = name.trim();
  if (value.length < 1 || value.length > MAX_NAME) {
    return { error: `Please enter a name between 1 and ${MAX_NAME} characters.` };
  }
  return { value };
}

/**
 * Consecutive "perfect" days ending today or yesterday. A day is perfect when
 * every currently-active supplement has a check for that day. Zero active
 * supplements means no streak. Walk backward from today; if today isn't perfect
 * yet, allow the streak to end yesterday so it doesn't reset mid-morning.
 */
function computeStreak(supplements: Supplement[], checksByDay: Map<string, Set<string>>): number {
  if (supplements.length === 0) return 0;
  const ids = supplements.map((s) => s.id);
  const isPerfect = (day: string) => {
    const taken = checksByDay.get(day);
    return taken != null && ids.every((id) => taken.has(id));
  };
  const cursor = new Date();
  if (!isPerfect(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!isPerfect(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (isPerfect(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const SupplementsContext = createContext<SupplementsContextValue | null>(null);

export function SupplementsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { user } = useAuth();
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  /** Raw check rows for the streak window; today's toggles mutate this too so
   * the streak reacts live without a refetch. */
  const [checks, setChecks] = useState<SupplementCheck[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState(dayKey());

  // Keep "today" honest across midnight: refresh when the app comes to the
  // foreground and once a minute while it stays open.
  useEffect(() => {
    const refresh = () => setToday((prev) => (dayKey() === prev ? prev : dayKey()));
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    const timer = setInterval(refresh, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  // Load the signed-in user's supplements + their recent check history whenever
  // the user changes.
  useEffect(() => {
    let active = true;
    if (!user) {
      Promise.resolve().then(() => {
        if (!active) return;
        setSupplements([]);
        setChecks([]);
        setLoaded(true);
      });
      return () => {
        active = false;
      };
    }
    (async () => {
      await Promise.resolve();
      if (!active) return;
      setLoaded(false);
      const [supRes, checkRes] = await Promise.all([
        supabase
          .from('supplements')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('supplement_checks')
          .select('supplement_id, day')
          .eq('user_id', user.id)
          .order('day', { ascending: false }),
      ]);
      if (!active) return;
      // A missing table or error just means empty state — supplements are an
      // additive feature and must never block the rest of the app.
      setSupplements(supRes.error ? [] : (supRes.data ?? []).map(rowToSupplement));
      setChecks(
        checkRes.error
          ? []
          : (checkRes.data ?? []).map((r: any) => ({ supplementId: r.supplement_id, day: r.day }))
      );
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  // When the calendar day rolls over, refetch the check window so the new day
  // starts unchecked and the streak reflects the fresh boundary. checkedToday
  // derives from `today`, so it clears on its own the moment the day flips.
  useEffect(() => {
    if (!user || !loaded) return;
    let active = true;
    supabase
      .from('supplement_checks')
      .select('supplement_id, day')
      .eq('user_id', user.id)
      .order('day', { ascending: false })
      .then(({ data, error }) => {
        if (active && !error && data) {
          setChecks(data.map((r: any) => ({ supplementId: r.supplement_id, day: r.day })));
        }
      });
    return () => {
      active = false;
    };
    // Intentionally only on day change — the initial load already fetched checks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  const addSupplement = useCallback(
    async (name: string) => {
      if (!user) return;
      const result = cleanName(name);
      if ('error' in result) throw new Error(result.error);
      const { data, error } = await supabase
        .from('supplements')
        .insert({ user_id: user.id, name: result.value })
        .select()
        .single();
      if (error || !data) {
        throw new Error('Could not save your supplement. Please try again.');
      }
      // Append: the list is oldest-first, and this is the newest row.
      setSupplements((prev) => [...prev, rowToSupplement(data)]);
    },
    [user]
  );

  const renameSupplement = useCallback(async (id: string, name: string) => {
    const result = cleanName(name);
    if ('error' in result) throw new Error(result.error);
    let previous: Supplement | undefined;
    setSupplements((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        previous = s;
        return { ...s, name: result.value };
      })
    );
    const { error } = await supabase.from('supplements').update({ name: result.value }).eq('id', id);
    if (error && previous) {
      const back = previous;
      setSupplements((prev) => prev.map((s) => (s.id === id ? back : s)));
      throw new Error('Could not rename your supplement. Please try again.');
    }
  }, []);

  const removeSupplement = useCallback(async (id: string) => {
    // Optimistic: drop the supplement and its checks, remembering both so we
    // can restore them if the server rejects the delete.
    let removed: Supplement | undefined;
    let at = -1;
    let removedChecks: SupplementCheck[] = [];
    setSupplements((prev) => {
      at = prev.findIndex((s) => s.id === id);
      removed = at >= 0 ? prev[at] : undefined;
      return prev.filter((s) => s.id !== id);
    });
    setChecks((prev) => {
      removedChecks = prev.filter((c) => c.supplementId === id);
      return prev.filter((c) => c.supplementId !== id);
    });
    const { error } = await supabase.from('supplements').delete().eq('id', id);
    if (error && removed) {
      const back = removed;
      const index = at;
      const backChecks = removedChecks;
      setSupplements((prev) => {
        const next = [...prev];
        next.splice(Math.min(Math.max(index, 0), next.length), 0, back);
        return next;
      });
      setChecks((prev) => [...prev, ...backChecks]);
      throw new Error('Could not remove your supplement. Please try again.');
    }
  }, []);

  const toggleTaken = useCallback(
    async (id: string) => {
      if (!user) return;
      const day = today;
      const isChecked = checks.some((c) => c.supplementId === id && c.day === day);
      // Optimistic flip of the raw rows (checkedToday derives from these).
      setChecks((prev) =>
        isChecked
          ? prev.filter((c) => !(c.supplementId === id && c.day === day))
          : [...prev, { supplementId: id, day }]
      );
      const { error } = isChecked
        ? await supabase
            .from('supplement_checks')
            .delete()
            .eq('user_id', user.id)
            .eq('supplement_id', id)
            .eq('day', day)
        : await supabase.from('supplement_checks').upsert(
            { user_id: user.id, supplement_id: id, day },
            { onConflict: 'user_id,supplement_id,day' }
          );
      if (error) {
        // Roll back the optimistic flip.
        setChecks((prev) =>
          isChecked
            ? [...prev, { supplementId: id, day }]
            : prev.filter((c) => !(c.supplementId === id && c.day === day))
        );
        throw new Error('Could not update your supplement. Please try again.');
      }
    },
    [user, checks, today]
  );

  const value = useMemo<SupplementsContextValue>(() => {
    // day -> set of supplement ids taken that day (drives streak + checkedToday).
    const checksByDay = new Map<string, Set<string>>();
    for (const c of checks) {
      let set = checksByDay.get(c.day);
      if (!set) {
        set = new Set();
        checksByDay.set(c.day, set);
      }
      set.add(c.supplementId);
    }
    const takenToday = checksByDay.get(today) ?? new Set<string>();
    const checkedToday: Record<string, boolean> = {};
    for (const s of supplements) {
      if (takenToday.has(s.id)) checkedToday[s.id] = true;
    }
    return {
      loaded,
      supplements,
      checks,
      checkedToday,
      takenCount: supplements.reduce((n, s) => (takenToday.has(s.id) ? n + 1 : n), 0),
      streak: computeStreak(supplements, checksByDay),
      addSupplement,
      renameSupplement,
      removeSupplement,
      toggleTaken,
    };
  }, [
    loaded,
    supplements,
    checks,
    today,
    addSupplement,
    renameSupplement,
    removeSupplement,
    toggleTaken,
  ]);

  return <SupplementsContext.Provider value={value}>{children}</SupplementsContext.Provider>;
}

export function useSupplements(): SupplementsContextValue {
  const ctx = useContext(SupplementsContext);
  if (!ctx) {
    throw new Error('useSupplements must be used inside a <SupplementsProvider>');
  }
  return ctx;
}
