import { StyleSheet, Text, View } from 'react-native';

import { RingMark } from '@/components/logo';
import { MarketingColors as C, MarketingFonts as F, marketingShadow } from '@/components/marketing/marketing-theme';

function Signal({ color, label, value, note }: { color: string; label: string; value: string; note: string }) {
  return (
    <View style={styles.signal}>
      <View style={[styles.signalBar, { backgroundColor: color }]} />
      <Text style={styles.signalLabel}>{label}</Text>
      <Text style={styles.signalValue}>{value}</Text>
      <Text style={styles.signalNote}>{note}</Text>
    </View>
  );
}

export function HealthOverviewPhone({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.phone, compact && styles.phoneCompact]}>
      <View style={styles.phoneTop}>
        <View style={styles.brand}>
          <RingMark size={18} color={C.green} />
          <Text style={styles.brandText}>trak</Text>
        </View>
        <Text style={styles.date}>TODAY · AUG 27</Text>
      </View>

      <View style={styles.greeting}>
        <Text style={styles.eyebrow}>YOUR HEALTH, TOGETHER</Text>
        <Text style={styles.title}>Good morning.</Text>
        <Text style={styles.subtitle}>Here’s what your signals are saying.</Text>
      </View>

      <View style={styles.scoreCard}>
        <View style={styles.scoreRingOuter}>
          <View style={styles.scoreRingGap} />
          <View style={styles.scoreRingInner}>
            <Text style={styles.scoreValue}>78</Text>
            <Text style={styles.scoreLabel}>TRAK SCORE</Text>
          </View>
        </View>
        <View style={styles.scoreCopy}>
          <View style={styles.upPill}><Text style={styles.upPillText}>↑ 6 THIS WEEK</Text></View>
          <Text style={styles.scoreTitle}>You’re building momentum.</Text>
          <Text style={styles.scoreBody}>Meals were steadier and you moved more often.</Text>
        </View>
      </View>

      <View style={styles.signalGrid}>
        <Signal color={C.orange} label="FOOD" value="On track" note="3 meals logged" />
        <Signal color={C.cobalt} label="MOVE" value="42 min" note="12 min above usual" />
        <Signal color={C.green} label="BODY" value="Steady" note="Trend, not a day" />
        <Signal color={C.yellow} label="ROUTINE" value="4 / 5" note="Daily habits done" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phone: { width: 350, backgroundColor: C.paper, borderRadius: 39, borderCurve: 'continuous', borderWidth: 8, borderColor: C.ink, padding: 17, gap: 18, transform: [{ rotate: '2.5deg' }], boxShadow: marketingShadow },
  phoneCompact: { width: 300, transform: [{ rotate: '0deg' }] },
  phoneTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  brandText: { color: C.ink, fontFamily: F.display, fontSize: 16, letterSpacing: -0.6 },
  date: { color: C.muted, fontFamily: F.mono, fontSize: 7, letterSpacing: 0.6 },
  greeting: { gap: 4 },
  eyebrow: { color: C.green, fontFamily: F.mono, fontSize: 7, letterSpacing: 0.9 },
  title: { color: C.ink, fontFamily: F.display, fontSize: 27, letterSpacing: -1.2 },
  subtitle: { color: C.muted, fontFamily: F.body, fontSize: 10 },
  scoreCard: { backgroundColor: C.mint, borderRadius: 24, borderCurve: 'continuous', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 15 },
  scoreRingOuter: { width: 116, height: 116, borderRadius: 58, borderWidth: 11, borderColor: C.green, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-18deg' }] },
  scoreRingGap: { position: 'absolute', right: -12, bottom: 7, width: 22, height: 30, backgroundColor: C.mint, transform: [{ rotate: '18deg' }] },
  scoreRingInner: { alignItems: 'center', transform: [{ rotate: '18deg' }] },
  scoreValue: { color: C.ink, fontFamily: F.display, fontSize: 36, lineHeight: 37, fontVariant: ['tabular-nums'] },
  scoreLabel: { color: C.greenDark, fontFamily: F.mono, fontSize: 6, letterSpacing: 0.7 },
  scoreCopy: { flex: 1, alignItems: 'flex-start', gap: 7 },
  upPill: { backgroundColor: C.green, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 5 },
  upPillText: { color: C.white, fontFamily: F.mono, fontSize: 6, letterSpacing: 0.4 },
  scoreTitle: { color: C.ink, fontFamily: F.strong, fontSize: 14, lineHeight: 16 },
  scoreBody: { color: '#3F584B', fontFamily: F.body, fontSize: 9, lineHeight: 13 },
  signalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  signal: { width: '48.5%', minHeight: 91, backgroundColor: '#EFF2EA', borderRadius: 15, borderCurve: 'continuous', padding: 11, overflow: 'hidden' },
  signalBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  signalLabel: { color: C.muted, fontFamily: F.mono, fontSize: 6, letterSpacing: 0.8, paddingTop: 3 },
  signalValue: { color: C.ink, fontFamily: F.strong, fontSize: 15, paddingTop: 7 },
  signalNote: { color: C.muted, fontFamily: F.body, fontSize: 7, paddingTop: 3 },
});
