import { Link, type Href, usePathname } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { RingMark } from '@/components/logo';
import { MarketingColors as C, MarketingFonts as F } from '@/components/marketing/marketing-theme';

const CHANNELS = [
  { label: 'Home', href: '/landing' },
  { label: 'Email', href: '/email' },
  { label: 'Instagram', href: '/instagram' },
  { label: 'TikTok', href: '/tiktok' },
] as const;

const SUPPORT_EMAIL = 'support.trakapp@gmail.com';

function NavLink({ label, href, compact }: { label: string; href: string; compact: boolean }) {
  const pathname = usePathname();
  const active = pathname === href;
  if (compact && !active) return null;

  return (
    <Link href={href as Href} asChild>
      <Pressable
        accessibilityRole="link"
        style={StyleSheet.flatten([styles.navLink, active && styles.navLinkActive])}>
        <Text style={[styles.navLinkText, active && styles.navLinkTextActive]}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export function MarketingHeader({ dark = false }: { dark?: boolean }) {
  const { width } = useWindowDimensions();
  const compact = width < 680;

  return (
    <View style={[styles.header, { borderBottomColor: dark ? '#26312C' : C.line }]}>
      <Link href={'/landing' as Href} asChild>
        <Pressable accessibilityRole="link" accessibilityLabel="Trak campaign home" style={styles.brand}>
          <RingMark size={29} color={dark ? C.mint : C.green} />
          <Text style={[styles.brandName, { color: dark ? C.white : C.ink }]}>trak</Text>
        </Pressable>
      </Link>
      <View style={styles.nav}>
        {CHANNELS.map((item) => (
          <NavLink key={item.href} {...item} compact={compact} />
        ))}
      </View>
      <Link href={'/email' as Href} asChild>
        <Pressable
          accessibilityRole="link"
          style={StyleSheet.flatten([styles.headerCta, dark && styles.headerCtaDark])}>
          <Text style={[styles.headerCtaText, dark && { color: C.ink }]}>{compact ? 'Join' : 'Get early access'}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

export function MarketingPage({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: dark ? C.black : C.canvas }}
      contentContainerStyle={styles.scrollContent}>
      <MarketingHeader dark={dark} />
      {children}
      <MarketingFooter dark={dark} />
    </ScrollView>
  );
}

export function MarketingFooter({ dark = false }: { dark?: boolean }) {
  return (
    <View style={[styles.footer, { borderTopColor: dark ? '#26312C' : C.line }]}>
      <View style={styles.footerBrand}>
        <RingMark size={22} color={dark ? C.mint : C.green} />
        <Text style={[styles.footerWordmark, { color: dark ? C.white : C.ink }]}>trak</Text>
      </View>
      <Text style={[styles.footerCopy, { color: dark ? '#92A198' : C.muted }]}>Your health, connected.</Text>
      <Link href={`mailto:${SUPPORT_EMAIL}` as Href} asChild>
        <Pressable accessibilityRole="link" accessibilityLabel={`Email Trak support at ${SUPPORT_EMAIL}`} style={styles.footerEmailLink}>
          <Text selectable style={[styles.footerEmail, { color: dark ? C.mint : C.greenDark }]}>{SUPPORT_EMAIL}</Text>
        </Pressable>
      </Link>
      <Text style={[styles.footerCopy, { color: dark ? '#92A198' : C.muted }]}>© 2026 Trak</Text>
    </View>
  );
}

export function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <View style={[styles.eyebrow, dark && { borderColor: '#405047' }]}>
      <View style={[styles.eyebrowDot, dark && { backgroundColor: C.mint }]} />
      <Text style={[styles.eyebrowText, dark && { color: C.mint }]}>{children}</Text>
    </View>
  );
}

export function ArrowButton({ children, href, secondary = false }: { children: ReactNode; href: string; secondary?: boolean }) {
  return (
    <Link href={href as Href} asChild>
      <Pressable
        accessibilityRole="link"
        style={StyleSheet.flatten([styles.button, secondary && styles.buttonSecondary])}>
        <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{children}</Text>
        <Text style={[styles.buttonArrow, secondary && styles.buttonTextSecondary]}>↗</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  scrollContent: { minHeight: '100%' },
  header: {
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
    minHeight: 82,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    gap: 14,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandName: { fontFamily: F.display, fontSize: 25, letterSpacing: -1.2 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navLink: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 99 },
  navLinkActive: { backgroundColor: 'rgba(53, 98, 74, 0.12)' },
  navLinkText: { color: C.muted, fontFamily: F.strong, fontSize: 13 },
  navLinkTextActive: { color: C.greenDark },
  headerCta: { backgroundColor: C.green, borderRadius: 99, paddingHorizontal: 17, paddingVertical: 11 },
  headerCtaDark: { backgroundColor: C.mint },
  headerCtaText: { color: C.white, fontFamily: F.strong, fontSize: 13 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.98 }] },
  footer: {
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  footerBrand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  footerWordmark: { fontFamily: F.display, fontSize: 19, letterSpacing: -0.8 },
  footerCopy: { fontFamily: F.body, fontSize: 12 },
  footerEmailLink: { paddingVertical: 8 },
  footerEmail: { fontFamily: F.strong, fontSize: 12, textDecorationLine: 'underline' },
  eyebrow: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#AABAD3',
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  eyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  eyebrowText: { color: C.greenDark, fontFamily: F.strong, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  button: {
    minHeight: 50,
    borderRadius: 99,
    paddingHorizontal: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    backgroundColor: C.green,
  },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#96A8C1' },
  buttonText: { color: C.white, fontFamily: F.strong, fontSize: 15 },
  buttonTextSecondary: { color: C.ink },
  buttonArrow: { color: C.white, fontSize: 18, lineHeight: 20 },
});
