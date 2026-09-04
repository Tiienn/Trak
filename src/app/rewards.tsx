import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon, FlameIcon, SparklesIcon, TargetIcon, TrophyIcon, UserIcon } from '@/components/icons';
import { Brand, Colors, Spacing, Type, type ThemeColors } from '@/constants/theme';
import { useAppScheme } from '@/lib/theme';
import { type RewardCatalogItem, useTrakPoints } from '@/lib/trak-points';

const KIND_LABEL: Record<RewardCatalogItem['kind'], string> = {
  shield: 'UTILITY',
  badge: 'BADGE',
  frame: 'AVATAR FRAME',
  theme: 'MISSION THEME',
};

function RewardIcon({ kind, color }: { kind: RewardCatalogItem['kind']; color: string }) {
  if (kind === 'shield') return <FlameIcon size={23} color={color} />;
  if (kind === 'badge') return <TrophyIcon size={23} color={color} />;
  if (kind === 'frame') return <UserIcon size={23} color={color} />;
  return <SparklesIcon size={23} color={color} />;
}

function RewardCard({ reward, colors }: { reward: RewardCatalogItem; colors: ThemeColors }) {
  const { balance, inventory, equipment, purchase, equip } = useTrakPoints();
  const owned = inventory.find((item) => item.rewardKey === reward.key);
  const equipped = equipment.badgeKey === reward.key || equipment.frameKey === reward.key || equipment.themeKey === reward.key;
  const canEquip = reward.kind !== 'shield' && !!owned;
  const canAfford = balance >= reward.cost;
  const accent = reward.accent ?? Brand.green;
  const tint = reward.tint ?? colors.greenTint;

  async function runPurchase() {
    try {
      await purchase(reward.key);
    } catch (error: any) {
      Alert.alert('Couldn’t redeem reward', error?.message ?? 'Please try again.');
    }
  }

  function confirmPurchase() {
    Alert.alert('Redeem reward?', `${reward.title} costs ${reward.cost} Trak Points.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Redeem', onPress: () => void runPurchase() },
    ]);
  }

  async function runEquip() {
    try {
      await equip(reward.key);
    } catch (error: any) {
      Alert.alert('Couldn’t equip reward', error?.message ?? 'Please try again.');
    }
  }

  const actionLabel = equipped
    ? 'Equipped'
    : canEquip
      ? 'Equip'
      : owned && reward.kind === 'shield'
        ? `${owned.quantity} owned`
        : `${reward.cost} points`;

  return (
    <View style={[styles.rewardCard, { backgroundColor: colors.backgroundElement }]}>
      <View style={[styles.rewardIcon, { backgroundColor: tint }]}><RewardIcon kind={reward.kind} color={accent} /></View>
      <View style={styles.rewardCopy}>
        <Text style={[styles.rewardKind, { color: accent }]}>{KIND_LABEL[reward.kind]}</Text>
        <Text style={[styles.rewardTitle, { color: colors.text }]}>{reward.title}</Text>
        <Text style={[styles.rewardDescription, { color: colors.textSecondary }]}>{reward.description}</Text>
      </View>
      <Pressable
        disabled={equipped || (!canEquip && !canAfford)}
        onPress={canEquip ? () => void runEquip() : confirmPurchase}
        style={({ pressed }) => [
          styles.rewardAction,
          { backgroundColor: equipped ? tint : canEquip || canAfford ? accent : colors.backgroundSelected, opacity: pressed ? 0.72 : 1 },
        ]}>
        <Text style={[styles.rewardActionText, { color: equipped || canEquip || canAfford ? '#FFFFFF' : colors.textSecondary }]}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

export default function RewardsScreen() {
  const colors = Colors[useAppScheme()];
  const insets = useSafeAreaInsets();
  const { balance, catalog, ledger } = useTrakPoints();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Trak Rewards</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Turn consistency into things you can use.</Text>
          </View>
          <Pressable accessibilityLabel="Close rewards" hitSlop={10} onPress={() => router.back()} style={[styles.close, { backgroundColor: colors.backgroundElement }]}><CloseIcon size={22} color={colors.textSecondary} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.balanceCard, { backgroundColor: Brand.green }]}>
            <TargetIcon size={28} color="#FFFFFF" />
            <View style={styles.balanceCopy}>
              <Text style={styles.balanceValue}>{balance.toLocaleString()}</Text>
              <Text style={styles.balanceLabel}>Trak Points available</Text>
            </View>
            <Text style={styles.balanceRate}>Missions +{`\n`}daily games</Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Reward catalog</Text>
            <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>No loot boxes. You always see the cost.</Text>
          </View>
          {catalog.map((reward) => <RewardCard key={reward.key} reward={reward} colors={colors} />)}

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Points history</Text>
            <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>Every earned and spent point is stored on your account.</Text>
          </View>
          <View style={[styles.historyCard, { backgroundColor: colors.backgroundElement }]}>
            {ledger.length === 0 ? <Text style={[styles.empty, { color: colors.textSecondary }]}>Complete a mission to earn your first 20 points.</Text> : ledger.slice(0, 12).map((entry, index) => {
              const reward = catalog.find((item) => item.key === entry.rewardKey);
              const gameLabel = entry.gameKey === 'daily_build'
                ? 'Daily Build challenge'
                : entry.gameKey
                  ? `${entry.gameKey[0].toUpperCase() + entry.gameKey.slice(1)} game`
                  : 'Game reward';
              const label = entry.source === 'mission'
                ? `${entry.missionKey ? entry.missionKey[0].toUpperCase() + entry.missionKey.slice(1) : 'Daily'} mission`
                : entry.source === 'game'
                  ? gameLabel
                  : reward?.title ?? 'Reward';
              return (
                <View key={entry.id} style={[styles.historyRow, index > 0 && { borderTopColor: colors.backgroundSelected, borderTopWidth: StyleSheet.hairlineWidth }]}>
                  <View>
                    <Text style={[styles.historyTitle, { color: colors.text }]}>{label}</Text>
                    <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{entry.day ?? new Date(entry.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <Text style={[styles.historyAmount, { color: entry.amount > 0 ? Brand.green : colors.text }]}>{entry.amount > 0 ? '+' : ''}{entry.amount}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  header: { marginBottom: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  title: { fontFamily: Type.display, fontSize: 30, lineHeight: 35, fontWeight: '700' },
  subtitle: { marginTop: 2, fontSize: 13, lineHeight: 18 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: Spacing.five, gap: Spacing.three },
  balanceCard: { borderRadius: 24, padding: Spacing.four, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  balanceCopy: { flex: 1 },
  balanceValue: { color: '#FFFFFF', fontFamily: Type.display, fontSize: 38, lineHeight: 42, fontWeight: '700' },
  balanceLabel: { color: '#E8F1E8', fontSize: 12, fontWeight: '700' },
  balanceRate: { color: '#E8F1E8', fontSize: 11, lineHeight: 16, fontWeight: '800', textAlign: 'right' },
  sectionHeader: { marginTop: Spacing.two },
  sectionTitle: { fontFamily: Type.display, fontSize: 22, lineHeight: 27, fontWeight: '700' },
  sectionCaption: { marginTop: 2, fontSize: 12, lineHeight: 17 },
  rewardCard: { borderRadius: 20, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rewardIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rewardCopy: { flex: 1 },
  rewardKind: { fontSize: 9, lineHeight: 12, letterSpacing: 0.7, fontWeight: '900' },
  rewardTitle: { marginTop: 2, fontSize: 15, lineHeight: 19, fontWeight: '900' },
  rewardDescription: { marginTop: 2, fontSize: 11, lineHeight: 15 },
  rewardAction: { minWidth: 82, minHeight: 38, borderRadius: 19, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  rewardActionText: { fontSize: 11, fontWeight: '900' },
  historyCard: { borderRadius: 20, paddingHorizontal: Spacing.three },
  historyRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyTitle: { fontSize: 13, fontWeight: '800' },
  historyDate: { marginTop: 2, fontSize: 10, fontWeight: '600' },
  historyAmount: { fontSize: 15, fontWeight: '900' },
  empty: { paddingVertical: Spacing.four, textAlign: 'center', fontSize: 13, lineHeight: 19 },
});
