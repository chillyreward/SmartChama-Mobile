import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { features } from '../config/features';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ContributionsScreen } from '../screens/ContributionsScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { useTheme } from '../contexts/ThemeContext';
import { fonts } from '../theme/fonts';

const Tab = createBottomTabNavigator();

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: Record<string, { label: string; icon: IconName; active: IconName }> = {
  Home: { label: 'Home', icon: 'home-outline', active: 'home' },
  Wallet: { label: 'Wallet', icon: 'wallet-outline', active: 'wallet' },
  Contribute: { label: 'Pay', icon: 'add', active: 'add' },
  Chat: { label: 'Chat', icon: 'chatbubble-outline', active: 'chatbubble' },
  More: { label: 'Everything', icon: 'grid-outline', active: 'grid' },
};

/**
 * Floating forest pill with a mint Pay button in the middle. The pill stays
 * forest in both themes, like the web sidebar, so it reads as the app's spine.
 */
function AkiboraTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={[styles.pill, { backgroundColor: colors.forest, borderColor: colors.canopy }]} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const t = TABS[route.name] ?? { label: route.name, icon: 'ellipse-outline' as IconName, active: 'ellipse' as IconName };
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.name === 'Contribute' ? { pay: Date.now() } : undefined);
            }
          };

          if (route.name === 'Contribute') {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel="Pay a contribution"
                style={({ pressed }) => [styles.pay, { backgroundColor: colors.mint, opacity: pressed ? 0.85 : 1 }]}
              >
                <Ionicons name="add" size={30} color={colors.forest} />
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={t.label}
              style={styles.tab}
            >
              <View style={[styles.iconWrap, focused && { backgroundColor: colors.canopy }]}>
                <Ionicons name={focused ? t.active : t.icon} size={21} color={focused ? colors.mint : colors.onForest3} />
              </View>
              <Text style={[styles.label, { color: focused ? colors.onForest : colors.onForest3, fontFamily: focused ? fonts.semibold : fonts.medium }]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator tabBar={(props) => <AkiboraTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Contribute" component={ContributionsScreen} />
      {features.groupChat && <Tab.Screen name="Chat" component={ChatScreen} />}
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 34,
    borderWidth: 1,
    height: 70,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 56 },
  iconWrap: { width: 44, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11 },
  pay: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
});
