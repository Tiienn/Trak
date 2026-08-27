import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { RingMark } from '@/components/logo';
import { ArrowButton, Eyebrow, MarketingPage } from '@/components/marketing/marketing-shell';
import { MarketingColors as C, MarketingFonts as F, marketingShadow } from '@/components/marketing/marketing-theme';

function GridPost({ index }: { index: number }) {
  if (index === 0) return <View style={[styles.post, { backgroundColor: C.orange }]}><Text style={styles.postKicker}>WHY YOUR SCORE MOVED</Text><Text style={styles.postBig}>+8</Text><Text style={styles.postSmall}>THREE SIGNALS, CONNECTED →</Text></View>;
  if (index === 1) return <View style={[styles.post, { backgroundColor: C.green }]}><Text style={[styles.postBig, { color: C.mint, fontSize: 35 }]}>Your week,{`\n`}connected.</Text><View style={styles.miniLabel}><Text style={styles.miniLabelText}>FOOD · MOVE · BODY · ROUTINE</Text></View></View>;
  if (index === 2) return <View style={[styles.post, { backgroundColor: C.yellow }]}><Text style={styles.postKicker}>THE SIGNAL THAT CHANGED</Text><Text style={[styles.postBig, { fontSize: 44 }]}>+2</Text><Text style={styles.postSmall}>ACTIVE DAYS THIS WEEK</Text></View>;
  if (index === 3) return <View style={[styles.post, { backgroundColor: '#DCE8D6' }]}><View style={styles.postPlate}><View style={styles.postFoodA} /><View style={styles.postFoodB} /><View style={styles.postFoodC} /><View style={styles.postScanLine} /></View><Text style={styles.scanCaption}>POINT · SCAN · KNOW</Text></View>;
  if (index === 4) return <View style={[styles.post, { backgroundColor: C.blue }]}><Text style={styles.postKicker}>NO PERFECT DAYS.{`\n`}NO FAILED DAYS.</Text><Text style={[styles.postBig, { fontSize: 32 }]}>Just patterns.</Text><RingMark size={34} color={C.cobalt} /></View>;
  return <View style={[styles.post, { backgroundColor: C.paper }]}><Text style={styles.postKicker}>YOUR 4 SIGNALS</Text><View style={styles.threeParts}><View style={[styles.part, { backgroundColor: C.orange }]} /><View style={[styles.part, { backgroundColor: C.cobalt }]} /><View style={[styles.part, { backgroundColor: C.green }]} /><View style={[styles.part, { backgroundColor: C.yellow }]} /></View><Text style={styles.postSmall}>FOOD · MOVE · BODY · ROUTINE</Text></View>;
}

export function InstagramPage() {
  const { width } = useWindowDimensions();
  const narrow = width < 790;

  return (
    <MarketingPage>
      <View style={styles.page}>
        <View style={styles.intro}>
          <Eyebrow>Instagram</Eyebrow>
          <Text style={[styles.title, narrow && styles.titleNarrow]}>Your health, made visible.</Text>
          <Text style={styles.subtitle}>A visual field guide to the patterns connecting food, movement, body changes, and the routines that shape your week.</Text>
        </View>

        <View style={[styles.profile, narrow && styles.profileNarrow]}>
          <View style={[styles.profileTop, narrow && { flexDirection: 'column', alignItems: 'flex-start' }]}>
            <View style={styles.avatar}><RingMark size={58} color={C.mint} /></View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}><Text style={styles.handle}>trak.app</Text><View style={styles.verified}><Text style={styles.check}>✓</Text></View></View>
              <View style={styles.stats}><Text style={styles.stat}><Text style={styles.statStrong}>128</Text>{`\n`}posts</Text><Text style={styles.stat}><Text style={styles.statStrong}>24.8k</Text>{`\n`}following along</Text><Text style={styles.stat}><Text style={styles.statStrong}>3 sec</Text>{`\n`}to start a scan</Text></View>
              <Text style={styles.bio}><Text style={{ fontFamily: F.strong }}>Trak · Your health, connected</Text>{`\n`}Food. Movement. Body. Routines. One clear picture.{`\n`}↓ Understand what’s working.</Text>
            </View>
            <View style={styles.follow}><ArrowButton href="/landing">Follow</ArrowButton></View>
          </View>

          <View style={styles.highlights}>
            {['START HERE', 'YOUR SCORE', 'FOOD', 'MOVEMENT', 'BODY'].map((item, index) => (
              <View key={item} style={styles.highlight}><View style={[styles.highlightCircle, { backgroundColor: [C.mint, C.orange, C.blue, C.yellow, '#D9D1F1'][index] }]}><Text style={styles.highlightNumber}>{index + 1}</Text></View><Text style={styles.highlightLabel}>{item}</Text></View>
            ))}
          </View>

          <View style={styles.tabBar}><Text style={styles.tabActive}>▦ POSTS</Text><Text style={styles.tab}>▷ REELS</Text><Text style={styles.tab}>⌑ GUIDES</Text></View>
          <View style={styles.grid}>{Array.from({ length: 6 }, (_, index) => <GridPost key={index} index={index} />)}</View>
        </View>

        <View style={[styles.series, narrow && { flexDirection: 'column' }]}>
          <View style={styles.seriesIntro}><Text style={styles.seriesKicker}>REPEATABLE SERIES</Text><Text style={styles.seriesTitle}>A feed with a job to do.</Text></View>
          <View style={styles.seriesList}>
            {[
              ['Score shifts', 'What moved, why it moved, and what matters next.'],
              ['Signals connected', 'The relationship between food, movement, body, and routine.'],
              ['Meals decoded', 'One powerful capability, explained with every assumption visible.'],
            ].map(([name, copy], index) => <View key={name} style={styles.seriesRow}><Text style={styles.seriesNum}>0{index + 1}</Text><View><Text style={styles.seriesName}>{name}</Text><Text style={styles.seriesCopy}>{copy}</Text></View></View>)}
          </View>
        </View>
      </View>
    </MarketingPage>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 80, paddingBottom: 100, gap: 58 },
  intro: { maxWidth: 760, gap: 22 },
  title: { color: C.ink, fontFamily: F.display, fontSize: 66, lineHeight: 63, letterSpacing: -3.6 },
  titleNarrow: { fontSize: 45, lineHeight: 44, letterSpacing: -2.3 },
  subtitle: { color: C.muted, fontFamily: F.body, fontSize: 17, lineHeight: 27, maxWidth: 650 },
  profile: { backgroundColor: C.white, borderRadius: 28, borderCurve: 'continuous', padding: 38, boxShadow: marketingShadow },
  profileNarrow: { padding: 16 },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 26, paddingBottom: 32 },
  avatar: { width: 112, height: 112, borderRadius: 56, backgroundColor: C.green, borderWidth: 4, borderColor: C.white, outlineWidth: 2, outlineColor: C.orange, alignItems: 'center', justifyContent: 'center' },
  profileInfo: { flex: 1, gap: 13 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  handle: { color: C.ink, fontFamily: F.strong, fontSize: 21 },
  verified: { width: 16, height: 16, borderRadius: 8, backgroundColor: C.cobalt, alignItems: 'center', justifyContent: 'center' },
  check: { color: C.white, fontSize: 10 },
  stats: { flexDirection: 'row', gap: 27 },
  stat: { color: C.muted, fontFamily: F.body, fontSize: 10, lineHeight: 15 },
  statStrong: { color: C.ink, fontFamily: F.strong, fontSize: 13 },
  bio: { color: C.ink, fontFamily: F.body, fontSize: 12, lineHeight: 18 },
  follow: { alignSelf: 'flex-start' },
  highlights: { flexDirection: 'row', gap: 25, paddingVertical: 24, overflow: 'hidden' },
  highlight: { alignItems: 'center', gap: 8 },
  highlightCircle: { width: 65, height: 65, borderRadius: 33, borderWidth: 3, borderColor: C.white, outlineWidth: 1, outlineColor: '#C9D3C9', alignItems: 'center', justifyContent: 'center' },
  highlightNumber: { color: C.ink, fontFamily: F.display, fontSize: 20 },
  highlightLabel: { color: C.muted, fontFamily: F.mono, fontSize: 7, letterSpacing: 0.4 },
  tabBar: { height: 46, borderTopWidth: 1, borderTopColor: '#DDE3DD', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 45 },
  tabActive: { color: C.ink, fontFamily: F.strong, fontSize: 9, letterSpacing: 0.8 },
  tab: { color: '#9AA59F', fontFamily: F.strong, fontSize: 9, letterSpacing: 0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  post: { width: '33%', aspectRatio: 1, padding: 19, justifyContent: 'space-between', overflow: 'hidden' },
  postKicker: { color: C.ink, fontFamily: F.mono, fontSize: 8, lineHeight: 12, letterSpacing: 0.8 },
  postBig: { color: C.ink, fontFamily: F.display, fontSize: 50, lineHeight: 47, letterSpacing: -2 },
  postSmall: { color: C.ink, fontFamily: F.mono, fontSize: 7, letterSpacing: 0.5 },
  miniLabel: { alignSelf: 'flex-start', padding: 7, borderRadius: 5, backgroundColor: C.mint },
  miniLabelText: { color: C.greenDark, fontFamily: F.mono, fontSize: 7 },
  postPlate: { alignSelf: 'center', width: '78%', aspectRatio: 1, borderRadius: 999, borderWidth: 8, borderColor: C.white, backgroundColor: '#ECE2C9', overflow: 'hidden' },
  postFoodA: { position: 'absolute', width: '55%', height: '55%', borderRadius: 99, backgroundColor: C.yellow, top: 5, left: 3 },
  postFoodB: { position: 'absolute', width: '55%', height: '58%', borderRadius: 99, backgroundColor: C.green, top: 2, right: 2 },
  postFoodC: { position: 'absolute', width: '67%', height: '42%', borderRadius: 99, backgroundColor: C.orange, left: '18%', bottom: 5 },
  postScanLine: { position: 'absolute', left: 0, right: 0, top: '50%', height: 2, backgroundColor: C.white },
  scanCaption: { color: C.ink, fontFamily: F.mono, fontSize: 7, textAlign: 'center' },
  threeParts: { flexDirection: 'row', gap: 5 },
  part: { flex: 1, aspectRatio: 0.8, borderRadius: 99 },
  series: { backgroundColor: C.ink, borderRadius: 28, borderCurve: 'continuous', padding: 38, flexDirection: 'row', gap: 55 },
  seriesIntro: { flex: 0.75, gap: 16 },
  seriesKicker: { color: C.mint, fontFamily: F.mono, fontSize: 9, letterSpacing: 1.1 },
  seriesTitle: { color: C.white, fontFamily: F.display, fontSize: 40, lineHeight: 39, letterSpacing: -2 },
  seriesList: { flex: 1, gap: 2 },
  seriesRow: { borderBottomWidth: 1, borderBottomColor: '#36463E', paddingVertical: 14, flexDirection: 'row', gap: 16 },
  seriesNum: { color: '#718179', fontFamily: F.mono, fontSize: 9, paddingTop: 3 },
  seriesName: { color: C.white, fontFamily: F.strong, fontSize: 15 },
  seriesCopy: { color: '#A4B2AA', fontFamily: F.body, fontSize: 11, lineHeight: 16, paddingTop: 4 },
});
