import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import { SvgXml } from 'react-native-svg';

/* Hammy, the Akibora guide. Same artwork as the website. */

export type HammyPose = 'wave' | 'run' | 'think' | 'celebrate';

const SVG: Record<HammyPose, string> = {
  wave: `
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      
      <ellipse cx="60" cy="80" rx="32" ry="28" fill="#C4956A"/>
      <ellipse cx="60" cy="85" rx="24" ry="20" fill="#E8C49A"/>
      
      <circle cx="60" cy="52" r="26" fill="#C4956A"/>
      
      <ellipse cx="60" cy="58" rx="18" ry="14" fill="#E8C49A"/>
      
      <circle cx="52" cy="50" r="4" fill="#1a1a1a"/>
      <circle cx="68" cy="50" r="4" fill="#1a1a1a"/>
      <circle cx="53" cy="49" r="1.5" fill="white"/>
      <circle cx="69" cy="49" r="1.5" fill="white"/>
      
      <ellipse cx="60" cy="56" rx="3" ry="2" fill="#D4607A"/>
      
      <ellipse cx="46" cy="57" rx="7" ry="5" fill="#E8C49A" opacity="0.7"/>
      <ellipse cx="74" cy="57" rx="7" ry="5" fill="#E8C49A" opacity="0.7"/>
      
      <circle cx="38" cy="33" r="10" fill="#C4956A"/>
      <circle cx="38" cy="33" r="6" fill="#E8A0A0"/>
      <circle cx="82" cy="33" r="10" fill="#C4956A"/>
      <circle cx="82" cy="33" r="6" fill="#E8A0A0"/>
      
      <ellipse cx="92" cy="65" rx="6" ry="14" fill="#C4956A" transform="rotate(-40 92 65)"/>
      <circle cx="100" cy="55" r="6" fill="#C4956A"/>
      
      <ellipse cx="28" cy="75" rx="6" ry="12" fill="#C4956A"/>
      
      <ellipse cx="48" cy="104" rx="8" ry="6" fill="#C4956A"/>
      <ellipse cx="72" cy="104" rx="8" ry="6" fill="#C4956A"/>
      
      <ellipse cx="88" cy="92" rx="8" ry="5" fill="#E8C49A"/>
    </svg>
  `,
  run: `
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="65" cy="78" rx="30" ry="24" fill="#C4956A"/>
      <ellipse cx="65" cy="82" rx="22" ry="17" fill="#E8C49A"/>
      <circle cx="60" cy="50" r="26" fill="#C4956A"/>
      <ellipse cx="60" cy="56" rx="18" ry="14" fill="#E8C49A"/>
      <circle cx="52" cy="48" r="4" fill="#1a1a1a"/>
      <circle cx="68" cy="48" r="4" fill="#1a1a1a"/>
      <circle cx="53" cy="47" r="1.5" fill="white"/>
      <circle cx="69" cy="47" r="1.5" fill="white"/>
      <ellipse cx="60" cy="54" rx="3" ry="2" fill="#D4607A"/>
      <ellipse cx="46" cy="55" rx="7" ry="5" fill="#E8C49A" opacity="0.7"/>
      <ellipse cx="74" cy="55" rx="7" ry="5" fill="#E8C49A" opacity="0.7"/>
      <circle cx="37" cy="32" r="10" fill="#C4956A"/>
      <circle cx="37" cy="32" r="6" fill="#E8A0A0"/>
      <circle cx="82" cy="32" r="10" fill="#C4956A"/>
      <circle cx="82" cy="32" r="6" fill="#E8A0A0"/>
      
      <ellipse cx="86" cy="68" rx="5" ry="13" fill="#C4956A" transform="rotate(30 86 68)"/>
      <ellipse cx="34" cy="68" rx="5" ry="13" fill="#C4956A" transform="rotate(-30 34 68)"/>
      
      <ellipse cx="50" cy="100" rx="7" ry="8" fill="#C4956A" transform="rotate(-20 50 100)"/>
      <ellipse cx="76" cy="102" rx="7" ry="8" fill="#C4956A" transform="rotate(20 76 102)"/>
    </svg>
  `,
  think: `
    <svg viewBox="0 0 130 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="80" rx="32" ry="28" fill="#C4956A"/>
      <ellipse cx="60" cy="85" rx="24" ry="20" fill="#E8C49A"/>
      <circle cx="60" cy="50" r="26" fill="#C4956A"/>
      <ellipse cx="60" cy="56" rx="18" ry="14" fill="#E8C49A"/>
      <circle cx="51" cy="47" r="4" fill="#1a1a1a"/>
      <circle cx="70" cy="47" r="4" fill="#1a1a1a"/>
      
      <circle cx="52" cy="46" r="1.5" fill="white"/>
      <circle cx="71" cy="46" r="1.5" fill="white"/>
      <ellipse cx="60" cy="54" rx="3" ry="2" fill="#D4607A"/>
      <ellipse cx="46" cy="57" rx="7" ry="5" fill="#E8C49A" opacity="0.7"/>
      <ellipse cx="74" cy="57" rx="7" ry="5" fill="#E8C49A" opacity="0.7"/>
      <circle cx="37" cy="30" r="10" fill="#C4956A"/>
      <circle cx="37" cy="30" r="6" fill="#E8A0A0"/>
      <circle cx="82" cy="30" r="10" fill="#C4956A"/>
      <circle cx="82" cy="30" r="6" fill="#E8A0A0"/>
      
      <ellipse cx="86" cy="70" rx="5" ry="16" fill="#C4956A" transform="rotate(-15 86 70)"/>
      <circle cx="92" cy="56" r="6" fill="#C4956A"/>
      
      <circle cx="105" cy="42" r="4" fill="#3FA673" opacity="0.6"/>
      <circle cx="112" cy="30" r="6" fill="#3FA673" opacity="0.7"/>
      <circle cx="116" cy="18" r="8" fill="#3FA673" opacity="0.8"/>
      <text x="111" y="23" font-size="9" text-anchor="middle" fill="white">💡</text>
      
      <ellipse cx="48" cy="104" rx="8" ry="6" fill="#C4956A"/>
      <ellipse cx="72" cy="104" rx="8" ry="6" fill="#C4956A"/>
    </svg>
  `,
  celebrate: `
    <svg viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      
      <rect x="20" y="10" width="6" height="6" fill="#3FA673" rx="1" transform="rotate(20 20 10)"/>
      <rect x="100" y="15" width="5" height="5" fill="#F59E0B" rx="1" transform="rotate(-15 100 15)"/>
      <rect x="30" y="30" width="4" height="4" fill="#3B82F6" rx="1" transform="rotate(40 30 30)"/>
      <rect x="90" y="8" width="4" height="7" fill="#EF4444" rx="1" transform="rotate(10 90 8)"/>
      <circle cx="15" cy="45" r="3" fill="#8B5CF6"/>
      <circle cx="108" cy="40" r="3" fill="#3FA673"/>
      
      <ellipse cx="65" cy="88" rx="32" ry="28" fill="#C4956A"/>
      <ellipse cx="65" cy="93" rx="24" ry="20" fill="#E8C49A"/>
      
      <circle cx="65" cy="58" r="26" fill="#C4956A"/>
      <ellipse cx="65" cy="64" rx="18" ry="14" fill="#E8C49A"/>
      
      <path d="M 55 55 Q 57 52 59 55" stroke="#1a1a1a" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M 70 55 Q 72 52 74 55" stroke="#1a1a1a" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      
      <path d="M 53 65 Q 65 75 77 65" stroke="#D4607A" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <ellipse cx="51" cy="63" rx="7" ry="5" fill="#E8C49A" opacity="0.7"/>
      <ellipse cx="79" cy="63" rx="7" ry="5" fill="#E8C49A" opacity="0.7"/>
      <circle cx="42" cy="38" r="10" fill="#C4956A"/>
      <circle cx="42" cy="38" r="6" fill="#E8A0A0"/>
      <circle cx="88" cy="38" r="10" fill="#C4956A"/>
      <circle cx="88" cy="38" r="6" fill="#E8A0A0"/>
      
      <ellipse cx="30" cy="68" rx="5" ry="14" fill="#C4956A" transform="rotate(35 30 68)"/>
      <circle cx="22" cy="57" r="6" fill="#C4956A"/>
      <ellipse cx="100" cy="68" rx="5" ry="14" fill="#C4956A" transform="rotate(-35 100 68)"/>
      <circle cx="108" cy="57" r="6" fill="#C4956A"/>
      
      <text x="17" y="60" font-size="10">⭐</text>
      <text x="105" y="60" font-size="10">🎊</text>
      
      <ellipse cx="53" cy="112" rx="8" ry="6" fill="#C4956A"/>
      <ellipse cx="77" cy="112" rx="8" ry="6" fill="#C4956A"/>
    </svg>
  `,
};

export function Hammy({ pose, size = 110 }: { pose: HammyPose; size?: number }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled || reduced || pose === 'think') return;
      const ms = pose === 'wave' ? 500 : 300;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(t, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(t, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => { cancelled = true; loop?.stop(); t.setValue(0); };
  }, [pose, t]);

  const transform =
    pose === 'wave'
      ? [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) }]
      : pose === 'celebrate'
        ? [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }, { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }]
        : [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }];

  return (
    <Animated.View style={{ width: size, height: size, transform }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={SVG[pose]} width={size} height={size} />
    </Animated.View>
  );
}
