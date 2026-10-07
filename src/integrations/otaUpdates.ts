import * as Updates from 'expo-updates';
import type { AppUpdates } from './types';

// Over-the-air JavaScript updates through EAS Update (expo-updates). These only
// carry JS/asset fixes for the same native build (runtimeVersion = app version),
// which Google Play allows. Native changes still need a new Play release; Play's
// in-app updates API can be added behind this same interface.
export const otaUpdates: AppUpdates = {
  name: 'eas-update',
  async checkAndApply() {
    if (__DEV__ || !Updates.isEnabled) return false;
    try {
      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) return false;
      await Updates.fetchUpdateAsync();
      // Applied on next cold start, so a member is never interrupted mid-payment.
      return true;
    } catch {
      return false;
    }
  },
};
