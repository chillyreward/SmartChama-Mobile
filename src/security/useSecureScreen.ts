import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as ScreenCapture from 'expo-screen-capture';
import { features } from '../config/features';

/**
 * Blocks screenshots, screen recording and the recent-apps preview (Android
 * FLAG_SECURE) while this screen is focused. Use on screens showing balances,
 * statements or payment details. Tab screens stay mounted, so this follows
 * focus rather than mount.
 */
export function useSecureScreen(key: string) {
  useFocusEffect(
    useCallback(() => {
      if (!features.secureScreens) return undefined;
      ScreenCapture.preventScreenCaptureAsync(key).catch(() => {});
      return () => {
        ScreenCapture.allowScreenCaptureAsync(key).catch(() => {});
      };
    }, [key])
  );
}
