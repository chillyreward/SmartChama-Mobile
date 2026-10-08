import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import type { PushNotifications } from './types';

// Expo push (FCM underneath on Android). The server sends via
// src/lib/push-notifications.ts in the web repo using profile_private.push_token
// (owner-only: fellow members can't read it and spam notifications).

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Payments and group updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#22C55E',
  });
}

export const expoPush: PushNotifications = {
  name: 'expo',

  async register(userId) {
    if (!Device.isDevice) return null;
    await ensureChannel();

    // Android 13+ shows the runtime POST_NOTIFICATIONS prompt here.
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted' && existing.canAskAgain) {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

    await supabase
      .from('profile_private')
      .upsert({ profile_id: userId, push_token: token, updated_at: new Date().toISOString() }, { onConflict: 'profile_id' });
    return token;
  },

  async unregister(userId) {
    await supabase.from('profile_private').update({ push_token: null }).eq('profile_id', userId);
  },
};
