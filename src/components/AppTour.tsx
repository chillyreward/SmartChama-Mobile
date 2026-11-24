import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Modal, Pressable, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { fixed } from '../theme/colors';
import { Button, T, type IconName } from '../ui';
import { Hammy, type HammyPose } from './Hammy';

type Step = { title: string; body: string; pose: HammyPose; tab?: { icon: IconName; label: string } };

const STEPS: Step[] = [
  { title: 'Karibu Akibora', body: "I'm Hammy. Let me show you round your group. It takes thirty seconds.", pose: 'wave' },
  { title: 'Home', body: 'Your group at a glance: what you have saved, what is due next and whose turn it is on the merry-go-round.', pose: 'think', tab: { icon: 'home', label: 'Home' } },
  { title: 'Pay', body: 'The big green button. Pay your contribution and M-Pesa sends a prompt to your phone. It shows up in the record once it goes through.', pose: 'run', tab: { icon: 'add', label: 'Pay' } },
  { title: 'Wallet', body: "The group's money, which everyone can see. Money only leaves when members vote for it.", pose: 'think', tab: { icon: 'wallet', label: 'Wallet' } },
  { title: 'Chat', body: 'Talk to your group in one place, next to the money.', pose: 'run', tab: { icon: 'chatbubble-ellipses', label: 'Chat' } },
  { title: 'Everything else', body: 'Merry-go-round, welfare, your trust score, your other groups and settings.', pose: 'think', tab: { icon: 'ellipsis-horizontal', label: 'More' } },
  { title: "You're set", body: 'Take this tour again any time from your profile.', pose: 'celebrate' },
];

const EVENT = 'ak:tour';
export const startTour = () => DeviceEventEmitter.emit(EVENT);

export function AppTour() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const key = `ak_tour_v1_${session?.user?.id ?? 'anon'}`;
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    AsyncStorage.getItem(key).then((seen) => {
      if (!seen) t = setTimeout(() => { setI(0); setOpen(true); }, 2200);
    }).catch(() => {});
    return () => { if (t) clearTimeout(t); };
  }, [key, session?.user?.id]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(EVENT, () => { setI(0); setOpen(true); });
    return () => sub.remove();
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    AsyncStorage.setItem(key, '1').catch(() => {});
  }, [key]);

  const s = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(8,18,13,0.66)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close the tour" />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', paddingBottom: 34 }}>
          <View style={{ backgroundColor: fixed.forest, height: 170, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 36, backgroundColor: fixed.canopy }} />
            <Hammy pose={s.pose} size={124} />
            <T v="caption" tone="onForest3" style={{ position: 'absolute', top: 16, left: 18 }}>{i + 1} of {STEPS.length}</T>
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close the tour" hitSlop={10} style={{ position: 'absolute', top: 10, right: 12, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={22} color={fixed.onForest3} />
            </Pressable>
            {s.tab ? (
              <View style={{ position: 'absolute', top: 14, right: 58, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: fixed.canopy, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Ionicons name={s.tab.icon} size={16} color={fixed.mint} />
                <T v="caption" tone="mint">{s.tab.label} tab</T>
              </View>
            ) : null}
          </View>

          <View style={{ paddingHorizontal: 22, paddingTop: 20 }}>
            <T v="display">{s.title}</T>
            <T v="body" tone="ink2" style={{ marginTop: 8, minHeight: 72 }}>{s.body}</T>
          </View>

          <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 22, marginTop: 10 }}>
            {STEPS.map((_, n) => (
              <View key={n} style={{ height: 6, borderRadius: 3, width: n === i ? 26 : 10, backgroundColor: n === i ? colors.brand : n < i ? colors.moss : colors.line }} />
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 22, marginTop: 20 }}>
            {i > 0
              ? <Button label="Back" variant="ghost" onPress={() => setI(i - 1)} />
              : <Button label="Skip" variant="ghost" onPress={close} />}
            <View style={{ flex: 1 }} />
            <Button label={last ? "Let's go" : 'Next'} icon={last ? undefined : 'arrow-forward'} onPress={() => (last ? close() : setI(i + 1))} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
