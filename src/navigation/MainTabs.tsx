import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ContributionsScreen } from '../screens/ContributionsScreen';
import { LoansScreen } from '../screens/LoansScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

const tabIcons: Record<string, string> = {
  Home: '🏠',
  Contribute: '💳',
  Loans: '🏦',
  Wallet: '👛',
  More: '⣿',
};

export const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: colors.border.light,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarIcon: () => (
          <Text style={{ fontSize: 20 }}>{tabIcons[route.name] || '📱'}</Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Contribute" component={ContributionsScreen} />
      <Tab.Screen name="Loans" component={LoansScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
};
