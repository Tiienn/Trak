import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { HealthOverviewPhone } from '@/components/marketing/health-overview';
import { ArrowButton, Eyebrow, MarketingPage } from '@/components/marketing/marketing-shell';
import { MarketingColors as C, MarketingFonts as F } from '@/components/marketing/marketing-theme';

const FEATURES = [
  { tag: 'CONNECT', title: 'Bring the signals together.', body: 'Food, movement, body changes, and daily routines finally make sense in one place.', color: C.mint },
  { tag: 'NOTICE', title: 'See the pattern, not the noise.', body: 'Trak turns everyday entries into trends you can understand—without judging a single day.', color: C.blue },
  { tag: 'ACT', title: 'Know what matters next.', body: 'Get one clear focus from your Trak Score instead of another dashboard full of numbers.', color: C.yellow },
] as const;

const CHANNELS = [
  { title: 'A useful email', copy: 'One signal from your week, explained without the noise.', href: '/email', mark: '↗' },
  { title: 'Health, made visible', copy: 'Saveable lessons about food, movement, body, and habits.', href: '/instagram', mark: '◎' },
  { title: '30-second clarity', copy: 'Fast explanations for the patterns shaping your health.', href: '/tiktok', mark: '♪' },
] as const;

export function LandingPage() {
  const { width } = useWindowDimensions();
  const narrow = width < 820;

  return (
    <MarketingPage>
      <View style={[styles.hero, narrow && styles.heroNarrow]}>
        <View style={[styles.heroCopy, narrow && styles.heroCopyNarrow]}>
          <Eyebrow>Your health, connected</Eyebrow>
          <Text style={[styles.heroTitle, narrow && styles.heroTitleNarrow]}>See your whole picture.</Text>
          <Text style={styles.heroBody}>Trak connects what you eat, how you move, your body’s changes, and the routines you keep—so you can understand what’s working and what to do next.</Text>
          <View style={styles.heroActions}>
            <ArrowButton href="/email">Get early access</ArrowButton>
            <ArrowButton href="/instagram" secondary>See it in action</ArrowButton>
          </View>
          <View style={styles.trustRow}>
            <View style={styles.avatarStack}>
              <View style={[styles.avatar, { backgroundColor: C.orange }]}><Text style={styles.avatarText}>M</Text></View>
              <View style={[styles.avatar, { backgroundColor: C.cobalt }]}><Text style={styles.avatarText}>A</Text></View>
              <View style={[styles.avatar, { backgroundColor: C.green }]}><Text style={styles.avatarText}>J</Text></View>
            </View>
            <Text style={styles.trustText}>Built for real life, not perfect routines.</Text>
          </View>
        </View>
        <View style={[styles.heroVisual, narrow && styles.heroVisualNarrow]}>
          <View style={styles.scanWord}><Text style={styles.scanWordText}>SYNC</Text></View>
          <View style={styles.orbitOne} />
          <View style={styles.orbitTwo} />
          <HealthOverviewPhone compact={width < 390} />
          <View style={styles.floatingNote}>
            <Text style={styles.floatingNoteTop}>TODAY IN SYNC</Text>
            <Text style={styles.floatingNoteMain}>4 signals · 1 clear picture</Text>
          </View>
        </View>
      </View>

      <View style={styles.proofStrip}>
        <Text style={styles.proofLead}>Built around your day</Text>
        {['FOOD', 'MOVEMENT', 'BODY', 'ROUTINES', 'TRAK SCORE'].map((item) => <Text key={item} style={styles.proofItem}>{item}</Text>)}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Eyebrow>How Trak helps</Eyebrow>
          <Text style={[styles.sectionTitle, narrow && styles.sectionTitleNarrow]}>Less guessing.{narrow ? ' ' : '\n'}More understanding.</Text>
        </View>
        <View style={[styles.featureGrid, narrow && styles.stack]}>
          {FEATURES.map((feature) => (
            <View key={feature.tag} style={[styles.featureCard, { backgroundColor: feature.color }]}>
              <Text style={styles.featureTag}>{feature.tag}</Text>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureBody}>{feature.body}</Text>
              <View style={styles.featureRule} />
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.channelSection, narrow && styles.channelSectionNarrow]}>
        <View style={styles.channelIntro}>
          <Text style={styles.channelKicker}>TRAK, IN THE WILD</Text>
          <Text style={[styles.channelTitle, narrow && styles.sectionTitleNarrow]}>Follow the idea, not an algorithm.</Text>
          <Text style={styles.channelBody}>Each channel has one job. Pick the way you like to learn.</Text>
        </View>
        <View style={styles.channelList}>
          {CHANNELS.map((channel, index) => (
            <View key={channel.title} style={styles.channelRow}>
              <View style={styles.channelNumber}><Text style={styles.channelNumberText}>0{index + 1}</Text></View>
              <View style={styles.channelCopy}>
                <Text style={styles.channelName}>{channel.title}</Text>
                <Text style={styles.channelDescription}>{channel.copy}</Text>
              </View>
              <ArrowButton href={channel.href} secondary>{channel.mark}</ArrowButton>
            </View>
          ))}
        </View>
      </View>
    </MarketingPage>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', maxWidth: 1240, alignSelf: 'center', minHeight: 690, paddingHorizontal: 40, paddingVertical: 70, flexDirection: 'row', alignItems: 'center', gap: 44 },
  heroNarrow: { flexDirection: 'column', paddingHorizontal: 20, paddingVertical: 48, gap: 64 },
  heroCopy: { flex: 1, alignItems: 'flex-start', gap: 25, zIndex: 2 },
  heroCopyNarrow: { width: '100%', maxWidth: 680 },
  heroTitle: { color: C.ink, fontFamily: F.display, fontSize: 76, lineHeight: 72, letterSpacing: -4.3, maxWidth: 620 },
  heroTitleNarrow: { fontSize: 50, lineHeight: 48, letterSpacing: -2.8 },
  heroBody: { color: C.muted, fontFamily: F.body, fontSize: 18, lineHeight: 29, maxWidth: 560 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarStack: { flexDirection: 'row', paddingLeft: 2 },
  avatar: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: C.canvas, alignItems: 'center', justifyContent: 'center', marginLeft: -5 },
  avatarText: { color: C.white, fontFamily: F.strong, fontSize: 10 },
  trustText: { color: C.muted, fontFamily: F.body, fontSize: 12 },
  heroVisual: { flex: 0.85, minHeight: 555, alignItems: 'center', justifyContent: 'center' },
  heroVisualNarrow: { width: '100%', flex: 0, minHeight: 520 },
  scanWord: { position: 'absolute', transform: [{ rotate: '-90deg' }], left: -15, top: 224 },
  scanWordText: { color: '#D4DFEF', fontFamily: F.display, fontSize: 94, letterSpacing: 5 },
  orbitOne: { position: 'absolute', width: 430, height: 430, borderRadius: 215, borderWidth: 1, borderColor: '#C9D5E7' },
  orbitTwo: { position: 'absolute', width: 520, height: 520, borderRadius: 260, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D4DEED' },
  floatingNote: { position: 'absolute', right: 0, bottom: 54, backgroundColor: C.orange, borderRadius: 17, borderCurve: 'continuous', paddingHorizontal: 15, paddingVertical: 12, transform: [{ rotate: '-4deg' }], boxShadow: '0 10px 28px rgba(56, 51, 41, 0.14)' },
  floatingNoteTop: { color: '#572B1A', fontFamily: F.mono, fontSize: 8, letterSpacing: 0.8 },
  floatingNoteMain: { color: '#3D2117', fontFamily: F.strong, fontSize: 13, paddingTop: 4 },
  proofStrip: { backgroundColor: C.ink, minHeight: 80, paddingHorizontal: 28, paddingVertical: 22, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 28 },
  proofLead: { color: C.mint, fontFamily: F.strong, fontSize: 13 },
  proofItem: { color: '#A7B7AF', fontFamily: F.mono, fontSize: 10, letterSpacing: 1.4 },
  section: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 110, gap: 52 },
  sectionHeading: { gap: 24 },
  sectionTitle: { color: C.ink, fontFamily: F.display, fontSize: 58, lineHeight: 55, letterSpacing: -3 },
  sectionTitleNarrow: { fontSize: 40, lineHeight: 40, letterSpacing: -2 },
  featureGrid: { flexDirection: 'row', gap: 16 },
  stack: { flexDirection: 'column' },
  featureCard: { flex: 1, minHeight: 315, padding: 26, borderRadius: 26, borderCurve: 'continuous', justifyContent: 'flex-end', gap: 14 },
  featureTag: { position: 'absolute', top: 25, left: 26, color: C.ink, fontFamily: F.mono, fontSize: 9, letterSpacing: 1.3 },
  featureTitle: { color: C.ink, fontFamily: F.display, fontSize: 31, lineHeight: 31, letterSpacing: -1.4 },
  featureBody: { color: '#34463E', fontFamily: F.body, fontSize: 14, lineHeight: 21 },
  featureRule: { height: 3, width: 36, backgroundColor: C.ink, marginTop: 7 },
  channelSection: { width: '100%', maxWidth: 1240, alignSelf: 'center', marginBottom: 100, padding: 50, borderRadius: 34, borderCurve: 'continuous', backgroundColor: C.paper, flexDirection: 'row', gap: 60 },
  channelSectionNarrow: { marginHorizontal: 18, width: 'auto', padding: 25, flexDirection: 'column', gap: 35 },
  channelIntro: { flex: 0.75, gap: 18 },
  channelKicker: { color: C.green, fontFamily: F.mono, fontSize: 10, letterSpacing: 1.2 },
  channelTitle: { color: C.ink, fontFamily: F.display, fontSize: 44, lineHeight: 43, letterSpacing: -2.2 },
  channelBody: { color: C.muted, fontFamily: F.body, fontSize: 15, lineHeight: 22 },
  channelList: { flex: 1, gap: 2 },
  channelRow: { minHeight: 91, borderBottomWidth: 1, borderBottomColor: '#DCE3DD', flexDirection: 'row', alignItems: 'center', gap: 14 },
  channelNumber: { width: 35 },
  channelNumberText: { color: '#9CA9A2', fontFamily: F.mono, fontSize: 10 },
  channelCopy: { flex: 1, gap: 4 },
  channelName: { color: C.ink, fontFamily: F.strong, fontSize: 17 },
  channelDescription: { color: C.muted, fontFamily: F.body, fontSize: 11, lineHeight: 16 },
});
