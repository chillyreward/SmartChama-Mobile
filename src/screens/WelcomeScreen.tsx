import React, { useRef, useState } from 'react';
import { FlatList, StatusBar, useWindowDimensions, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { Button, Ring, T, type Seat, Logo } from '../ui';

const SLIDES = [
  {
    id: 'book',
    title: "Your group's book, open to everyone",
    body: 'Every contribution shows who paid, when, and the M-Pesa reference. Nobody has to ask the treasurer for the numbers.',
  },
  {
    id: 'pay',
    title: 'Pay with M-Pesa in two taps',
    body: 'Approve the prompt on your phone with your PIN. The group record updates once Safaricom confirms it.',
  },
  {
    id: 'turns',
    title: 'Merry-go-round and welfare, written down',
    body: 'See the order, your turn and what is in the welfare fund, and ask for support when you need it.',
  },
];

// An example ring for the welcome screen, labelled as an example
const EXAMPLE: Seat[] = [
  { initials: 'WK', state: 'received' },
  { initials: 'KC', state: 'received' },
  { initials: 'NK', state: 'current' },
  { initials: 'BW', state: 'upcoming' },
  { initials: 'AO', state: 'me' },
  { initials: 'JO', state: 'upcoming' },
  { initials: 'PM', state: 'upcoming' },
  { initials: 'GW', state: 'upcoming' },
];

export const WelcomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const finish = async (mode: 'signup' | 'login') => {
    try { await AsyncStorage.setItem('has_seen_onboarding', 'true'); } catch {}
    navigation.replace('Login', { mode });
  };

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
  }).current;

  const ring = Math.min(width - 96, 300);

  return (
    <View style={{ flex: 1, backgroundColor: colors.forest }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingTop: 8 }}>
          <Logo tone="onForest" />
          <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: colors.moss }}>
            <T v="caption" tone="onForest2">Early access</T>
          </View>
        </View>

        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <Ring size={ring} seats={EXAMPLE} label="An example group of eight members">
            <T v="caption" tone="onForest3">An example group</T>
            <T v="display" tone="mint" style={{ marginTop: 2 }}>KSh 56,000</T>
            <T v="caption" tone="onForest2">round 3 of 8</T>
          </Ring>
        </View>

        <FlatList
          data={SLIDES}
          keyExtractor={(s) => s.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          style={{ flexGrow: 0, marginTop: 28 }}
          renderItem={({ item }) => (
            <View style={{ width, paddingHorizontal: 22 }}>
              <T v="display" tone="onForest">{item.title}</T>
              <T v="body" tone="onForest2" style={{ marginTop: 10 }}>{item.body}</T>
            </View>
          )}
        />

        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 22, marginTop: 18 }} accessibilityLabel={`Slide ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((s, i) => (
            <View key={s.id} style={{ height: 6, width: i === index ? 28 : 10, borderRadius: 3, backgroundColor: i === index ? colors.mint : colors.moss }} />
          ))}
        </View>

        <View style={{ flex: 1 }} />
        <View style={{ paddingHorizontal: 22, paddingBottom: 16, gap: 10 }}>
          <Button label="Join my group" variant="mint" size="lg" onPress={() => finish('signup')} />
          <Button label="I already have an account" variant="onForest" size="lg" onPress={() => finish('login')} />
        </View>
      </SafeAreaView>
    </View>
  );
};
