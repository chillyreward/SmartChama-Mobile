import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { features } from '../config/features';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ContributionsScreen } from '../screens/ContributionsScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { useTheme } from '../contexts/ThemeContext';

const Tab = createBottomTabNavigator();

type IconName = keyof typeof Ionicons.glyphMap;

const tabIconNames: Record<string, { active: IconName; inactive: IconName }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Contribute: { active: 'card', inactive: 'card-outline' },
  Wallet: { active: 'wallet', inactive: 'wallet-outline' },
  Chat: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  More: { active: 'grid', inactive: 'grid-outline' },
};

export const MainTabs: React.FC = () => {
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? '#64748B' : '#94A3B8',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          paddingBottom: 4,
        },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = tabIconNames[route.name] || { active: 'appstore', inactive: 'appstore-outline' };
          const iconName = focused ? icons.active : icons.inactive;
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Contribute" component={ContributionsScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      {features.groupChat && <Tab.Screen name="Chat" component={ChatScreen} />}
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
};
