import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { RingMark } from '@/components/logo';
import { ArrowButton, Eyebrow, MarketingPage } from '@/components/marketing/marketing-shell';
import { MarketingColors as C, MarketingFonts as F } from '@/components/marketing/marketing-theme';

function Action({ symbol, count }: { symbol: string; count: string }) {
  return <View style={styles.action}><View style={styles.actionCircle}><Text style={styles.actionSymbol}>{symbol}</Text></View><Text style={styles.actionCount}>{count}</Text></View>;
}

export function TikTokPage() {
  const { width } = useWindowDimensions();
  const narrow = width < 820;

  return (
    <MarketingPage dark>
      <View style={styles.page}>
        <View style={[styles.hero, narrow && styles.heroNarrow]}>
          <View style={styles.intro}>
            <Eyebrow dark>TikTok</Eyebrow>
            <Text style={[styles.title, narrow && styles.titleNarrow]}>Health patterns at scroll speed.</Text>
            <Text style={styles.subtitle}>Thirty-second explanations that connect the signals shaping your health—before the next video starts.</Text>
            <View style={{ alignSelf: 'flex-start' }}><ArrowButton href="/landing">Follow @trak.app</ArrowButton></View>
            <View style={styles.contentTags}>{['SCORE SHIFTS', 'SIGNAL EXPLAINS', 'REAL-LIFE PATTERNS'].map((tag) => <Text key={tag} style={styles.contentTag}>{tag}</Text>)}</View>
          </View>

          <View style={styles.videoStage}>
            <View style={styles.echoOne} /><View style={styles.echoTwo} />
            <View style={styles.phone}>
              <View style={styles.videoTop}><Text style={styles.topText}>Following</Text><Text style={styles.topTextActive}>For You</Text><Text style={styles.search}>⌕</Text></View>
              <View style={styles.hook}><Text style={styles.hookSmall}>YOUR SCORE MOVED +8</Text><Text style={styles.hookBig}>What actually{`\n`}changed?</Text></View>
              <View style={styles.plate}>
                <View style={styles.foodA} /><View style={styles.foodB} /><View style={styles.foodC} /><View style={styles.foodD} />
                <View style={styles.scoreCenter}><Text style={styles.scoreNumber}>78</Text><Text style={styles.scoreLabel}>TRAK SCORE</Text></View>
              </View>
              <View style={styles.answer}><Text style={styles.answerLabel}>TRAK CONNECTED</Text><Text style={styles.answerValue}>4 <Text style={styles.answerUnit}>signals</Text></Text></View>
              <View style={styles.actions}><Action symbol="♥" count="18.4K" /><Action symbol="◉" count="326" /><Action symbol="↗" count="Share" /><View style={styles.record}><RingMark size={22} color={C.mint} /></View></View>
              <View style={styles.caption}><Text style={styles.captionHandle}>@trak.app</Text><Text style={styles.captionCopy}>It wasn’t one perfect day. Food, movement, body, and routine lined up ↓</Text><Text style={styles.sound}>♫ original sound · trak.app</Text></View>
            </View>
            <View style={styles.swipeNote}><Text style={styles.swipeNoteText}>THE REVEAL LANDS{`\n`}BEFORE 0:08</Text></View>
          </View>
        </View>

        <View style={styles.formatSection}>
          <Text style={styles.formatKicker}>THREE FORMATS. ONE PROMISE.</Text>
          <Text style={[styles.formatTitle, narrow && styles.titleNarrow]}>Leave knowing something.</Text>
          <View style={[styles.formatGrid, narrow && { flexDirection: 'column' }]}>
            {[
              ['00:08', 'Notice', 'Open with the change someone can already feel.'],
              ['00:18', 'Connect', 'Show which everyday signals shaped the result.'],
              ['00:30', 'Understand', 'End with one idea they can use this week.'],
            ].map(([time, name, copy], index) => <View key={time} style={[styles.formatCard, { backgroundColor: [C.orange, C.mint, C.blue][index] }]}><Text style={styles.formatTime}>{time}</Text><View><Text style={styles.formatName}>{name}</Text><Text style={styles.formatCopy}>{copy}</Text></View></View>)}
          </View>
        </View>
      </View>
    </MarketingPage>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 70, paddingBottom: 110, gap: 110 },
  hero: { minHeight: 680, flexDirection: 'row', alignItems: 'center', gap: 50 },
  heroNarrow: { flexDirection: 'column', alignItems: 'stretch', gap: 80 },
  intro: { flex: 1, alignItems: 'flex-start', gap: 25, zIndex: 2 },
  title: { color: C.white, fontFamily: F.display, fontSize: 72, lineHeight: 68, letterSpacing: -4, maxWidth: 650 },
  titleNarrow: { fontSize: 45, lineHeight: 44, letterSpacing: -2.3 },
  subtitle: { color: '#A7B5AD', fontFamily: F.body, fontSize: 18, lineHeight: 28, maxWidth: 540 },
  contentTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 12 },
  contentTag: { color: '#7E8E85', fontFamily: F.mono, fontSize: 8, letterSpacing: 0.8, borderWidth: 1, borderColor: '#35423B', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7 },
  videoStage: { flex: 0.8, minHeight: 660, alignItems: 'center', justifyContent: 'center' },
  echoOne: { position: 'absolute', width: 340, height: 580, borderRadius: 36, backgroundColor: C.cobalt, transform: [{ rotate: '9deg' }, { translateX: 32 }] },
  echoTwo: { position: 'absolute', width: 340, height: 580, borderRadius: 36, backgroundColor: C.orange, transform: [{ rotate: '-7deg' }, { translateX: -25 }] },
  phone: { width: 330, height: 610, borderRadius: 34, borderCurve: 'continuous', borderWidth: 7, borderColor: '#202822', backgroundColor: '#16251D', overflow: 'hidden', boxShadow: '0 25px 70px rgba(0,0,0,0.5)' },
  videoTop: { position: 'absolute', zIndex: 5, top: 20, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 18 },
  topText: { color: '#B1BBB5', fontFamily: F.strong, fontSize: 11 },
  topTextActive: { color: C.white, fontFamily: F.strong, fontSize: 11, borderBottomWidth: 2, borderBottomColor: C.white, paddingBottom: 5 },
  search: { position: 'absolute', right: 17, color: C.white, fontSize: 19 },
  hook: { position: 'absolute', top: 76, left: 19, right: 19, zIndex: 3, gap: 8 },
  hookSmall: { color: C.mint, fontFamily: F.mono, fontSize: 8, letterSpacing: 1.1 },
  hookBig: { color: C.white, fontFamily: F.display, fontSize: 37, lineHeight: 34, letterSpacing: -1.8 },
  plate: { position: 'absolute', width: 276, height: 276, borderRadius: 138, backgroundColor: '#DDE8DF', borderWidth: 12, borderColor: C.white, top: 209, left: -17, overflow: 'hidden', transform: [{ rotate: '-8deg' }], alignItems: 'center', justifyContent: 'center' },
  foodA: { position: 'absolute', width: 126, height: 126, borderRadius: 63, borderWidth: 21, borderColor: C.orange, top: 8, left: 8 },
  foodB: { position: 'absolute', width: 126, height: 126, borderRadius: 63, borderWidth: 21, borderColor: C.cobalt, top: 8, right: 8 },
  foodC: { position: 'absolute', width: 126, height: 126, borderRadius: 63, borderWidth: 21, borderColor: C.green, bottom: 8, left: 8 },
  foodD: { position: 'absolute', width: 126, height: 126, borderRadius: 63, borderWidth: 21, borderColor: C.yellow, bottom: 8, right: 8 },
  scoreCenter: { width: 112, height: 112, borderRadius: 56, backgroundColor: C.ink, zIndex: 2, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '8deg' }] },
  scoreNumber: { color: C.white, fontFamily: F.display, fontSize: 43, lineHeight: 43 },
  scoreLabel: { color: C.mint, fontFamily: F.mono, fontSize: 7, letterSpacing: 0.7 },
  answer: { position: 'absolute', zIndex: 3, right: 12, top: 253, backgroundColor: C.yellow, borderRadius: 14, borderCurve: 'continuous', paddingHorizontal: 12, paddingVertical: 10, transform: [{ rotate: '4deg' }] },
  answerLabel: { color: C.ink, fontFamily: F.mono, fontSize: 7, letterSpacing: 0.8 },
  answerValue: { color: C.ink, fontFamily: F.display, fontSize: 23 },
  answerUnit: { fontFamily: F.body, fontSize: 9 },
  actions: { position: 'absolute', right: 9, bottom: 69, zIndex: 4, gap: 12, alignItems: 'center' },
  action: { alignItems: 'center', gap: 3 },
  actionCircle: { width: 37, height: 37, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.38)', alignItems: 'center', justifyContent: 'center' },
  actionSymbol: { color: C.white, fontSize: 17 },
  actionCount: { color: C.white, fontFamily: F.strong, fontSize: 7 },
  record: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#101713', borderWidth: 5, borderColor: '#404743', alignItems: 'center', justifyContent: 'center' },
  caption: { position: 'absolute', left: 15, right: 60, bottom: 20, zIndex: 3, gap: 5 },
  captionHandle: { color: C.white, fontFamily: F.strong, fontSize: 10 },
  captionCopy: { color: C.white, fontFamily: F.body, fontSize: 9, lineHeight: 13 },
  sound: { color: '#CCD3CF', fontFamily: F.body, fontSize: 8 },
  swipeNote: { position: 'absolute', right: -25, bottom: 23, backgroundColor: C.mint, borderRadius: 13, padding: 11, transform: [{ rotate: '5deg' }] },
  swipeNoteText: { color: C.greenDark, fontFamily: F.mono, fontSize: 8, lineHeight: 12, letterSpacing: 0.6 },
  formatSection: { gap: 27 },
  formatKicker: { color: C.mint, fontFamily: F.mono, fontSize: 9, letterSpacing: 1.2 },
  formatTitle: { color: C.white, fontFamily: F.display, fontSize: 55, lineHeight: 53, letterSpacing: -2.8 },
  formatGrid: { flexDirection: 'row', gap: 15 },
  formatCard: { flex: 1, minHeight: 245, borderRadius: 24, borderCurve: 'continuous', padding: 23, justifyContent: 'space-between' },
  formatTime: { color: C.ink, fontFamily: F.mono, fontSize: 11, letterSpacing: 0.8 },
  formatName: { color: C.ink, fontFamily: F.display, fontSize: 30 },
  formatCopy: { color: '#35463D', fontFamily: F.body, fontSize: 12, lineHeight: 18, paddingTop: 7 },
});
