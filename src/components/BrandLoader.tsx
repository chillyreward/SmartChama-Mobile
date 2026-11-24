import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { fixed } from '../theme/colors';
import { T } from '../ui';

/**
 * Shown once each time the app starts, after the native splash: the mark on its
 * white tile, three coins dropping into place and a bar filling, then a fade.
 * Matches the website's first-load screen.
 */
export function BrandLoader({ onDone }: { onDone: () => void }) {
  const rise = useRef(new Animated.Value(0)).current;
  const coins = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const bar = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [width, setWidth] = useState(180);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) {
        rise.setValue(1); bar.setValue(1); coins.forEach((c) => c.setValue(1));
        setTimeout(onDone, 300);
        return;
      }
      Animated.sequence([
        Animated.parallel([
          Animated.timing(rise, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.stagger(160, coins.map((c) => Animated.spring(c, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }))),
          Animated.timing(bar, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.timing(fade, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start(() => onDone());
    });
    return () => { cancelled = true; };
  }, [bar, coins, fade, onDone, rise]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.wrap, { opacity: fade }]} accessibilityLabel="Loading Akibora" accessibilityRole="progressbar">
      <Animated.View style={{ alignItems: 'center', opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        <View style={styles.tile}>
          <Image source={require('../../assets/logo-mark.png')} style={{ width: 56, height: 56 }} resizeMode="contain" />
        </View>
        <T v="hero" tone="onForest" style={{ marginTop: 18 }}>akibora</T>
      </Animated.View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 30 }}>
        {coins.map((c, i) => (
          <Animated.View
            key={i}
            style={[styles.coin, { opacity: c, transform: [{ translateY: c.interpolate({ inputRange: [0, 1], outputRange: [-26, 0] }) }] }]}
          />
        ))}
      </View>

      <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <Animated.View
          style={[styles.fill, { width, transform: [{ translateX: bar.interpolate({ inputRange: [0, 1], outputRange: [-width, 0] }) }] }]}
        />
      </View>

      <T v="small" tone="onForest3" style={{ marginTop: 22 }}>akiba, savings. bora, the best of it.</T>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: fixed.forest, alignItems: 'center', justifyContent: 'center', zIndex: 1000, elevation: 1000 },
  tile: { width: 76, height: 76, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  coin: { width: 14, height: 14, borderRadius: 7, backgroundColor: fixed.mint },
  track: { width: 180, height: 3, borderRadius: 2, backgroundColor: '#234235', overflow: 'hidden', marginTop: 28 },
  fill: { height: 3, borderRadius: 2, backgroundColor: fixed.mint },
});
