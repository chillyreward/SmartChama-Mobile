import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, asyncStoragePersister } from './src/lib/queryClient';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { OfflineBanner } from './src/components/OfflineBanner';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});

function MainApp() {
  const { isDark } = useTheme();

  useEffect(() => {
    // Hide splash screen after initialization
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <OfflineBanner />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
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
