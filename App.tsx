import React, { useCallback, useEffect, useState } from 'react';
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
import { useAppFonts } from './src/theme/fonts';
import { BrandLoader } from './src/components/BrandLoader';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});
initIntegrations();

// Versions before 1.1 persisted every query (balances, statements) unencrypted
// under the default React Query key. Remove it on first launch of this version.
AsyncStorage.removeItem('REACT_QUERY_OFFLINE_CACHE').catch(() => {});

function MainApp() {
  const { isDark } = useTheme();
  const { session, signOut } = useAuth();
  const [loaderDone, setLoaderDone] = useState(false);
  const finishLoader = useCallback(() => setLoaderDone(true), []);

  useEffect(() => {
    // Hand over from the native splash to the animated brand screen
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 50);
    // Download any OTA fix in the background; it applies on next launch
    integrations.appUpdates.checkAndApply().catch(() => {});
    return () => clearTimeout(timer);
  }, []);

  return (
    <AppLock enabled={!!session} onSignOut={signOut}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <OfflineBanner />
      <AppNavigator />
      {!loaderDone ? <BrandLoader onDone={finishLoader} /> : null}
    </AppLock>
  );
}

export default function App() {
  // Hold the splash screen until the brand fonts are ready, so text never
  // jumps from the system font to Onest and Newsreader. If a font fails to
  // load, carry on with the system font rather than blocking the app.
  const [fontsLoaded, fontError] = useAppFonts();
  if (!fontsLoaded && !fontError) return null;

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
