import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  Animated,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Slide {
  id: string;
  badge: string;
  title: string;
  description: string;
  image: any;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    badge: 'GROUP SAVINGS',
    title: 'Transparent Chama Savings',
    description:
      'Track contributions, interest, and chama pool balances in real-time with 100% financial transparency.',
    image: require('../../assets/welcome_bg_1.jpg'),
  },
  {
    id: '2',
    badge: 'WELFARE FUND',
    title: 'Support When It Matters',
    description:
      'Help members through emergencies with a transparent welfare fund and a multi-officer approval workflow.',
    image: require('../../assets/welcome_bg_2.jpg'),
  },
  {
    id: '3',
    badge: 'MERRY-GO-ROUND',
    title: 'Automated Payout Schedules',
    description:
      'Rotate monthly payouts seamlessly among members with automated reminders and instant trust scoring.',
    image: require('../../assets/icon.png'),
  },
];

interface WelcomeScreenProps {
  navigation: any;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<any>(null);

  const handleFinishOnboarding = async (mode: 'signup' | 'login') => {
    try {
      await AsyncStorage.setItem('has_seen_onboarding', 'true');
    } catch (e) {
      console.error('Failed to save onboarding state', e);
    }
    navigation.replace('Login', { mode });
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Dynamic Background Image standard transition */}
      <ImageBackground
        source={SLIDES[currentIndex]?.image || SLIDES[0].image}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Dark Airbnb-style Gradient Overlay */}
        <LinearGradient
          colors={['rgba(15, 23, 42, 0.1)', 'rgba(15, 23, 42, 0.65)', 'rgba(15, 23, 42, 0.95)', '#0F172A']}
          locations={[0, 0.4, 0.75, 1]}
          style={styles.gradientOverlay}
        >
          <SafeAreaView style={styles.safeArea}>
            {/* Top Brand Header */}
            <View style={styles.topHeader}>
              <View style={styles.brandRow}>
                <View style={styles.logoBadge}>
                  <Ionicons name="people" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.brandName}>Akibora</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleFinishOnboarding('login')}
                style={styles.skipButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>

            {/* Slider Content */}
            <View style={styles.sliderContainer}>
              <Animated.FlatList
                ref={slidesRef}
                data={SLIDES}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                keyExtractor={(item) => item.id}
                onScroll={handleScroll}
                onViewableItemsChanged={handleViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                renderItem={({ item }) => (
                  <View style={styles.slideItem}>
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                    <Text style={styles.mainTitle}>Save Together,{'\n'}Grow Together.</Text>
                    <Text style={styles.slideTitle}>{item.title}</Text>
                    <Text style={styles.slideDescription}>{item.description}</Text>
                  </View>
                )}
              />
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              {/* Pagination Dots */}
              <View style={styles.paginationRow}>
                {SLIDES.map((_, index) => {
                  const inputRange = [
                    (index - 1) * SCREEN_WIDTH,
                    index * SCREEN_WIDTH,
                    (index + 1) * SCREEN_WIDTH,
                  ];

                  const dotWidth = scrollX.interpolate({
                    inputRange,
                    outputRange: [8, 24, 8],
                    extrapolate: 'clamp',
                  });

                  const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.4, 1, 0.4],
                    extrapolate: 'clamp',
                  });

                  return (
                    <Animated.View
                      key={index.toString()}
                      style={[
                        styles.dot,
                        { width: dotWidth, opacity },
                        currentIndex === index && styles.activeDot,
                      ]}
                    />
                  );
                })}
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.getStartedButton}
                  onPress={() => handleFinishOnboarding('signup')}
                  activeOpacity={0.88}
                >
                  <Text style={styles.getStartedText}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={() => handleFinishOnboarding('login')}
                  activeOpacity={0.88}
                >
                  <Text style={styles.loginText}>Log In</Text>
                </TouchableOpacity>
              </View>

              {/* Footer Trust Note */}
              <Text style={styles.footerNote}>
                🔒 Secure M-Pesa integration • Bank-grade encryption
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  backgroundImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  gradientOverlay: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 30) + 10 : 10,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  skipButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  sliderContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  slideItem: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 24,
    paddingBottom: 20,
    justifyContent: 'flex-end',
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    marginBottom: 12,
  },
  badgeText: {
    color: '#4ADE80',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  mainTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 40,
    letterSpacing: -0.8,
    marginBottom: 12,
  },
  slideTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  slideDescription: {
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 22,
    maxWidth: '92%',
  },
  bottomControls: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  activeDot: {
    backgroundColor: '#22C55E',
  },
  buttonContainer: {
    gap: 12,
  },
  getStartedButton: {
    backgroundColor: '#22C55E',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  loginButton: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerNote: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 18,
  },
});
