import { Tabs } from 'expo-router';
import { StyleSheet, useWindowDimensions, View, type ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, Colors } from '@/constants/theme';
import { useAppScheme } from '@/lib/theme';

type TabIconName = 'home' | 'chat' | 'games' | 'progress';

function TabIcon({ name, color, focused }: { name: TabIconName; color: ColorValue; focused: boolean }) {
  const fill = focused ? color : 'none';

  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {name === 'home' ? (
        <>
          <Path d="m3.5 10 8.5-7 8.5 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M5.5 9.2V21h13V9.2M9.5 21v-6h5v6" fill={fill} stroke={color} strokeWidth={2} strokeLinejoin="round" />
        </>
      ) : name === 'chat' ? (
        <Path d="M4 4.5h16v12H9l-5 4v-16Z" fill={fill} stroke={color} strokeWidth={2} strokeLinejoin="round" />
      ) : name === 'games' ? (
        <Path
          d="M8 8h8a4 4 0 0 1 3.8 2.8l1.4 4.5a3 3 0 0 1-5.1 2.9L14.5 16h-5l-1.6 2.2a3 3 0 0 1-5.1-2.9l1.4-4.5A4 4 0 0 1 8 8Z"
          fill={fill}
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ) : (
        <Path
          d="m4 17 5-5 3.5 3.5 7-7m-4.5 0h4.5V13"
          stroke={color}
          strokeWidth={focused ? 2.5 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

function ScanFrameIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Path
        d="M4 12V7a3 3 0 0 1 3-3h5M20 4h5a3 3 0 0 1 3 3v5M28 20v5a3 3 0 0 1-3 3h-5M12 28H7a3 3 0 0 1-3-3v-5"
        stroke="#fff"
        strokeWidth={3.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function AppTabs() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const largeTextExtra = Math.min(24, Math.max(0, fontScale - 1) * 22);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 62 + insets.bottom + largeTextExtra,
          paddingTop: 7,
          paddingBottom: Math.max(insets.bottom, 7),
          backgroundColor: colors.background,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.backgroundSelected,
          overflow: 'visible',
        },
        tabBarLabelStyle: styles.label,
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
          tabBarButtonTestID: 'tab-home',
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarAccessibilityLabel: 'Chat tab',
          tabBarButtonTestID: 'tab-chat',
          tabBarIcon: ({ color, focused }) => <TabIcon name="chat" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="scan-tab"
        options={{
          title: 'Scan',
          tabBarAccessibilityLabel: 'Scan a meal',
          tabBarLabel: () => null,
          tabBarIcon: () => (
            <View style={[styles.scanButton, { borderColor: colors.background }]}>
              <ScanFrameIcon />
            </View>
          ),
          tabBarItemStyle: styles.scanItem,
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'Games',
          tabBarAccessibilityLabel: 'Games tab',
          tabBarButtonTestID: 'tab-games',
          tabBarIcon: ({ color, focused }) => <TabIcon name="games" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarAccessibilityLabel: 'Progress tab',
          tabBarButtonTestID: 'tab-progress',
          tabBarIcon: ({ color, focused }) => <TabIcon name="progress" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '600' },
  scanItem: { overflow: 'visible' },
  scanButton: {
    position: 'absolute',
    top: -23,
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.green,
    borderWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
});
