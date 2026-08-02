import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { JoinChamaScreen } from '../screens/JoinChamaScreen';
import { PendingScreen } from '../screens/PendingScreen';
import { MembersScreen } from '../screens/MembersScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { TrustScoreScreen } from '../screens/TrustScoreScreen';
import { AlertsScreen } from '../screens/AlertsScreen';
import { SmartGrowScreen } from '../screens/SmartGrowScreen';
import { WelfareScreen } from '../screens/WelfareScreen';
import { MerryGoRoundScreen } from '../screens/MerryGoRoundScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { MainTabs } from './MainTabs';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

export const AppNavigator: React.FC = () => {
  const { session, member, group, isLoading } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('has_seen_onboarding')
      .then((val) => {
        setHasSeenOnboarding(val === 'true');
      })
      .catch(() => {
        setHasSeenOnboarding(false);
      });
  }, []);

  if (isLoading || hasSeenOnboarding === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          // Unauthenticated Stack
          hasSeenOnboarding ? (
            <Stack.Group>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
            </Stack.Group>
          ) : (
            <Stack.Group>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
            </Stack.Group>
          )
        ) : !group ? (
          // Authenticated but no Chama membership
          <Stack.Screen name="JoinChama" component={JoinChamaScreen} />
        ) : member?.status === 'pending' ? (
          // Membership pending admin approval
          <Stack.Screen name="PendingApproval" component={PendingScreen} />
        ) : (
          // Authenticated & Active Chama Member
          <Stack.Group>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Members" component={MembersScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
            <Stack.Screen name="TrustScore" component={TrustScoreScreen} />
            <Stack.Screen name="Alerts" component={AlertsScreen} />
            <Stack.Screen name="SmartGrow" component={SmartGrowScreen} />
            <Stack.Screen name="Welfare" component={WelfareScreen} />
            <Stack.Screen name="MerryGoRound" component={MerryGoRoundScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
