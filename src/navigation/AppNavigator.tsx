import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { JoinChamaScreen } from '../screens/JoinChamaScreen';
import { PendingScreen } from '../screens/PendingScreen';
import { MembersScreen } from '../screens/MembersScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MainTabs } from './MainTabs';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

export const AppNavigator: React.FC = () => {
  const { session, member, group, isLoading } = useAuth();

  if (isLoading) {
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
          <Stack.Screen name="Login" component={LoginScreen} />
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
