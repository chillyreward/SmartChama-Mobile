import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persistOptions } from './src/lib/queryClient';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { OfflineBanner } from './src/components/OfflineBanner';
import { AppLock } from './src/security/AppLock';
import { initIntegrations, integrations } from './src/integrations';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});
initIntegrations();

// Versions before 1.1 persisted every query (balances, statements) unencrypted
// under the default React Query key. Remove it on first launch of this version.
AsyncStorage.removeItem('REACT_QUERY_OFFLINE_CACHE').catch(() => {});

function MainApp() {
  const { isDark } = useTheme();
  const { session, signOut } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 500);
    // Download any OTA fix in the background; it applies on next launch
    integrations.appUpdates.checkAndApply().catch(() => {});
    return () => clearTimeout(timer);
  }, []);

  return (
    <AppLock enabled={!!session} onSignOut={signOut}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <OfflineBanner />
      <AppNavigator />
    </AppLock>
  );
}

export default function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <MainApp />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}
