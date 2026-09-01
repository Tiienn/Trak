import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useAuth } from './auth';
import type { DailyMissionKey } from './missions';
import { supabase } from './supabase';

export type RewardKind = 'shield' | 'badge' | 'frame' | 'theme';

export type RewardCatalogItem = {
  key: string;
  kind: RewardKind;
  title: string;
  description: string;
  cost: number;
  accent: string | null;
  tint: string | null;
};

export type PointLedgerEntry = {
  id: string;
  amount: number;
  source: 'mission' | 'reward';
  missionKey: DailyMissionKey | null;
  day: string | null;
  rewardKey: string | null;
  createdAt: string;
};

export type RewardInventoryItem = { rewardKey: string; quantity: number };
export type RewardEquipment = { badgeKey: string | null; frameKey: string | null; themeKey: string | null };

const FALLBACK_CATALOG: RewardCatalogItem[] = [
  { key: 'streak_shield', kind: 'shield', title: 'Streak Shield', description: 'Bank one shield for a future missed-day save.', cost: 200, accent: '#3D6B4F', tint: '#E3EAD7' },
  { key: 'trailblazer_badge', kind: 'badge', title: 'Trailblazer badge', description: 'Show a green achievement mark on your profile.', cost: 300, accent: '#3D6B4F', tint: '#E3EAD7' },
  { key: 'forest_frame', kind: 'frame', title: 'Forest frame', description: 'Add a deep forest ring around your profile avatar.', cost: 450, accent: '#2C5039', tint: '#E3EAD7' },
  { key: 'sunrise_missions', kind: 'theme', title: 'Sunrise missions', description: 'Warm terracotta styling for your Daily Missions card.', cost: 600, accent: '#D97843', tint: '#F5E2D4' },
  { key: 'golden_missions', kind: 'theme', title: 'Golden missions', description: 'A soft gold Daily Missions card theme.', cost: 800, accent: '#A67A16', tint: '#F4E8BD' },
];

type TrakPointsContextValue = {
  loaded: boolean;
  balance: number;
  catalog: RewardCatalogItem[];
  ledger: PointLedgerEntry[];
  inventory: RewardInventoryItem[];
  equipment: RewardEquipment;
  syncDaily: (day: string, completedKeys: DailyMissionKey[]) => Promise<void>;
  purchase: (rewardKey: string) => Promise<void>;
  equip: (rewardKey: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const EMPTY_EQUIPMENT: RewardEquipment = { badgeKey: null, frameKey: null, themeKey: null };
const TrakPointsContext = createContext<TrakPointsContextValue | null>(null);

export function TrakPointsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [catalog, setCatalog] = useState<RewardCatalogItem[]>(FALLBACK_CATALOG);
  const [ledger, setLedger] = useState<PointLedgerEntry[]>([]);
  const [inventory, setInventory] = useState<RewardInventoryItem[]>([]);
  const [equipment, setEquipment] = useState<RewardEquipment>(EMPTY_EQUIPMENT);
  const syncSignature = useRef('');

  const refresh = useCallback(async () => {
    await Promise.resolve();
    if (!user) {
      setLedger([]);
      setBalance(0);
      setInventory([]);
      setEquipment(EMPTY_EQUIPMENT);
      setLoadedUserId(null);
      setLoaded(true);
      return;
    }
    const [catalogResult, ledgerResult, inventoryResult, equipmentResult, balanceResult] = await Promise.all([
      supabase.from('trak_reward_catalog').select('key, kind, title, description, cost, accent, tint').eq('active', true).order('cost'),
      supabase.from('trak_point_ledger').select('id, amount, source, mission_key, day, reward_key, created_at').order('created_at', { ascending: false }).limit(100),
      supabase.from('trak_reward_inventory').select('reward_key, quantity'),
      supabase.from('trak_reward_equipment').select('badge_key, frame_key, theme_key').maybeSingle(),
      supabase.rpc('get_trak_points_balance'),
    ]);
    if (!catalogResult.error && catalogResult.data?.length) {
      setCatalog(catalogResult.data.map((row: any) => ({ ...row, cost: Number(row.cost) })));
    }
    if (!ledgerResult.error) {
      setLedger((ledgerResult.data ?? []).map((row: any) => ({
        id: row.id,
        amount: Number(row.amount),
        source: row.source,
        missionKey: row.mission_key,
        day: row.day,
        rewardKey: row.reward_key,
        createdAt: row.created_at,
      })));
    }
    if (!inventoryResult.error) {
      setInventory((inventoryResult.data ?? []).map((row: any) => ({ rewardKey: row.reward_key, quantity: Number(row.quantity) })));
    }
    if (!equipmentResult.error && equipmentResult.data) {
      setEquipment({ badgeKey: equipmentResult.data.badge_key, frameKey: equipmentResult.data.frame_key, themeKey: equipmentResult.data.theme_key });
    }
    if (!balanceResult.error) setBalance(Number(balanceResult.data) || 0);
    setLoadedUserId(user.id);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    syncSignature.current = '';
    const timeout = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timeout);
  }, [refresh]);

  const syncDaily = useCallback(async (day: string, completedKeys: DailyMissionKey[]) => {
    if (!user || completedKeys.length === 0) return;
    const signature = `${day}:${[...completedKeys].sort().join(',')}`;
    if (syncSignature.current === signature) return;
    syncSignature.current = signature;
    const { data, error } = await supabase.rpc('sync_daily_trak_missions', { p_day: day });
    if (error) {
      syncSignature.current = '';
      return;
    }
    const awarded = Array.isArray(data?.awarded) ? data.awarded : [];
    if (awarded.length > 0) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    await refresh();
  }, [refresh, user]);

  const purchase = useCallback(async (rewardKey: string) => {
    const { error } = await supabase.rpc('purchase_trak_reward', { p_reward_key: rewardKey });
    if (error) throw new Error(error.message || 'Could not redeem this reward.');
    await refresh();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [refresh]);

  const equip = useCallback(async (rewardKey: string) => {
    const { error } = await supabase.rpc('equip_trak_reward', { p_reward_key: rewardKey });
    if (error) throw new Error(error.message || 'Could not equip this reward.');
    await refresh();
    await Haptics.selectionAsync().catch(() => {});
  }, [refresh]);

  const sessionMatches = loadedUserId === (user?.id ?? null);
  const value = useMemo<TrakPointsContextValue>(() => ({
    loaded: loaded && sessionMatches,
    balance: sessionMatches ? balance : 0,
    catalog,
    ledger: sessionMatches ? ledger : [],
    inventory: sessionMatches ? inventory : [],
    equipment: sessionMatches ? equipment : EMPTY_EQUIPMENT,
    syncDaily,
    purchase,
    equip,
    refresh,
  }), [loaded, sessionMatches, balance, catalog, ledger, inventory, equipment, syncDaily, purchase, equip, refresh]);

  return <TrakPointsContext.Provider value={value}>{children}</TrakPointsContext.Provider>;
}

export function useTrakPoints(): TrakPointsContextValue {
  const value = useContext(TrakPointsContext);
  if (!value) throw new Error('useTrakPoints must be used inside <TrakPointsProvider>');
  return value;
}
