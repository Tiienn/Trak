import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ArrowButton, Eyebrow, MarketingPage } from '@/components/marketing/marketing-shell';
import { MarketingColors as C, MarketingFonts as F, marketingShadow } from '@/components/marketing/marketing-theme';

export function EmailPage() {
  const { width } = useWindowDimensions();
  const narrow = width < 800;

  return (
    <MarketingPage>
      <View style={styles.page}>
        <View style={styles.intro}>
          <Eyebrow>Email</Eyebrow>
          <Text style={[styles.title, narrow && styles.titleNarrow]}>One useful signal from your week.</Text>
          <Text style={styles.subtitle}>A weekly note from Trak. Brief, practical, and designed to help you understand your health—not obsess over it.</Text>
        </View>

        <View style={[styles.workspace, narrow && styles.workspaceNarrow]}>
          <View style={styles.inboxRail}>
            <View style={styles.inboxDotRow}><View style={[styles.windowDot, { backgroundColor: '#F57869' }]} /><View style={[styles.windowDot, { backgroundColor: '#F6C45B' }]} /><View style={[styles.windowDot, { backgroundColor: '#58C681' }]} /></View>
            <Text style={styles.railLabel}>INBOX / TRAK</Text>
            <View style={styles.mailItemActive}>
              <View style={styles.unreadDot} />
              <View style={{ flex: 1 }}><Text style={styles.mailSender}>Trak</Text><Text style={styles.mailSubject}>Your week, connected.</Text></View>
              <Text style={styles.mailTime}>8:02</Text>
            </View>
            {['Why your energy felt steadier', 'The habit that held', 'What your weight trend really says'].map((subject) => (
              <View key={subject} style={styles.mailItem}><View style={{ flex: 1 }}><Text style={styles.mailSenderMuted}>Trak</Text><Text style={styles.mailSubjectMuted}>{subject}</Text></View><Text style={styles.mailTime}>Tue</Text></View>
            ))}
          </View>

          <View style={styles.emailFrame}>
            <View style={styles.emailMeta}>
              <View><Text style={styles.emailFrom}>TRAK WEEKLY</Text><Text style={styles.emailTo}>to: you, the person deciding what’s for dinner</Text></View>
              <Text style={styles.issue}>ISSUE 004</Text>
            </View>
            <View style={styles.emailHero}>
              <View style={styles.emailHeroCopy}><Text style={styles.emailKicker}>THIS WEEK’S SIGNAL</Text><Text style={[styles.emailTitle, narrow && styles.emailTitleNarrow]}>Your week,<Text style={{ color: C.orange }}> connected.</Text></Text></View>
              <View style={styles.plateMini}>
                <View style={styles.signalOrbitOne} /><View style={styles.signalOrbitTwo} />
                <Text style={styles.signalScore}>+6</Text><Text style={styles.signalScoreLabel}>TRAK SCORE</Text>
              </View>
            </View>
            <View style={styles.emailBody}>
              <Text style={styles.emailGreeting}>Hey—</Text>
              <Text style={styles.emailParagraph}>Your score moved up six points. Not because one day was perfect, but because three ordinary signals started working together.</Text>
              <View style={[styles.formula, narrow && { flexDirection: 'column' }]}>
                <View style={styles.formulaItem}><Text style={styles.formulaNumber}>3</Text><Text style={styles.formulaLabel}>STEADIER MEALS</Text></View>
                <Text style={styles.plus}>+</Text>
                <View style={styles.formulaItem}><Text style={styles.formulaNumber}>4</Text><Text style={styles.formulaLabel}>ACTIVE DAYS</Text></View>
                <Text style={styles.plus}>+</Text>
                <View style={styles.formulaItem}><Text style={styles.formulaNumber}>5</Text><Text style={styles.formulaLabel}>ROUTINES KEPT</Text></View>
              </View>
              <Text style={styles.emailParagraph}>That’s the point of Trak: fewer isolated numbers, more understanding of what they mean together.</Text>
              <View style={{ alignSelf: 'flex-start' }}><ArrowButton href="/landing">See your whole picture</ArrowButton></View>
            </View>
            <View style={styles.emailFooter}><Text style={styles.emailFooterText}>NO GUILT. NO PERFECT DAYS. JUST A CLEARER PICTURE.</Text></View>
          </View>
        </View>

        <View style={styles.promise}>
          <Text style={styles.promiseTitle}>The inbox promise</Text>
          <View style={[styles.promiseItems, narrow && { flexDirection: 'column' }]}>
            <Text style={styles.promiseItem}>01 · One email a week</Text>
            <Text style={styles.promiseItem}>02 · Useful in under 3 minutes</Text>
            <Text style={styles.promiseItem}>03 · Leave in one click</Text>
          </View>
        </View>
      </View>
    </MarketingPage>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 80, paddingBottom: 110, gap: 64 },
  intro: { maxWidth: 760, gap: 22 },
  title: { color: C.ink, fontFamily: F.display, fontSize: 66, lineHeight: 63, letterSpacing: -3.7 },
  titleNarrow: { fontSize: 45, lineHeight: 44, letterSpacing: -2.3 },
  subtitle: { color: C.muted, fontFamily: F.body, fontSize: 17, lineHeight: 27, maxWidth: 650 },
  workspace: { flexDirection: 'row', backgroundColor: '#D6E0EF', borderRadius: 28, borderCurve: 'continuous', padding: 16, gap: 16, boxShadow: marketingShadow },
  workspaceNarrow: { flexDirection: 'column', padding: 8 },
  inboxRail: { width: 270, backgroundColor: '#E8EEF7', borderRadius: 19, borderCurve: 'continuous', padding: 16, gap: 8 },
  inboxDotRow: { flexDirection: 'row', gap: 6, paddingBottom: 19 },
  windowDot: { width: 9, height: 9, borderRadius: 5 },
  railLabel: { color: '#75859E', fontFamily: F.mono, fontSize: 9, letterSpacing: 1, paddingBottom: 8 },
  mailItemActive: { backgroundColor: C.white, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.cobalt },
  mailItem: { paddingHorizontal: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: '#D3DDEA' },
  mailSender: { color: C.ink, fontFamily: F.strong, fontSize: 11 },
  mailSubject: { color: C.ink, fontFamily: F.body, fontSize: 10, paddingTop: 2 },
  mailSenderMuted: { color: '#617087', fontFamily: F.strong, fontSize: 10 },
  mailSubjectMuted: { color: '#7A899D', fontFamily: F.body, fontSize: 9, paddingTop: 2 },
  mailTime: { color: '#8593A6', fontFamily: F.mono, fontSize: 8 },
  emailFrame: { flex: 1, backgroundColor: C.paper, borderRadius: 19, borderCurve: 'continuous', overflow: 'hidden' },
  emailMeta: { minHeight: 76, paddingHorizontal: 24, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#E0E5DC', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  emailFrom: { color: C.green, fontFamily: F.strong, fontSize: 11, letterSpacing: 1.1 },
  emailTo: { color: C.muted, fontFamily: F.body, fontSize: 9, paddingTop: 5 },
  issue: { color: C.muted, fontFamily: F.mono, fontSize: 8 },
  emailHero: { minHeight: 260, backgroundColor: C.mint, padding: 28, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 20, overflow: 'hidden' },
  emailHeroCopy: { flex: 1, minWidth: 230, gap: 12, zIndex: 2 },
  emailKicker: { color: C.greenDark, fontFamily: F.mono, fontSize: 9, letterSpacing: 1.3 },
  emailTitle: { color: C.ink, fontFamily: F.display, fontSize: 54, lineHeight: 51, letterSpacing: -2.5 },
  emailTitleNarrow: { fontSize: 39, lineHeight: 38 },
  plateMini: { width: 190, height: 190, borderRadius: 95, borderWidth: 11, borderColor: C.white, backgroundColor: '#F1E8D0', overflow: 'hidden', transform: [{ rotate: '8deg' }] },
  signalOrbitOne: { position: 'absolute', width: 122, height: 122, borderRadius: 61, borderWidth: 16, borderColor: C.green, top: 23, left: 23 },
  signalOrbitTwo: { position: 'absolute', width: 76, height: 76, borderRadius: 38, borderWidth: 5, borderColor: C.orange, top: 46, left: 46 },
  signalScore: { color: C.ink, fontFamily: F.display, fontSize: 38, textAlign: 'center', paddingTop: 53 },
  signalScoreLabel: { color: C.greenDark, fontFamily: F.mono, fontSize: 7, letterSpacing: 0.6, textAlign: 'center' },
  emailBody: { padding: 30, gap: 20 },
  emailGreeting: { color: C.ink, fontFamily: F.strong, fontSize: 18 },
  emailParagraph: { color: '#405148', fontFamily: F.body, fontSize: 14, lineHeight: 23, maxWidth: 690 },
  formula: { backgroundColor: '#EEF1E9', borderRadius: 16, borderCurve: 'continuous', padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 12 },
  formulaItem: { flex: 1, alignItems: 'center', gap: 6 },
  formulaNumber: { color: C.green, fontFamily: F.display, fontSize: 28 },
  formulaLabel: { color: C.muted, fontFamily: F.mono, fontSize: 8, textAlign: 'center', letterSpacing: 0.6 },
  plus: { color: '#99A39D', fontFamily: F.body, fontSize: 18 },
  emailFooter: { backgroundColor: C.ink, padding: 18, alignItems: 'center' },
  emailFooterText: { color: C.mint, fontFamily: F.mono, fontSize: 8, letterSpacing: 1 },
  promise: { backgroundColor: C.blue, borderRadius: 24, borderCurve: 'continuous', padding: 30, gap: 25 },
  promiseTitle: { color: C.ink, fontFamily: F.display, fontSize: 31 },
  promiseItems: { flexDirection: 'row', gap: 28 },
  promiseItem: { color: C.ink, fontFamily: F.mono, fontSize: 10, letterSpacing: 0.4 },
});
