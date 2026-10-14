import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { endpoints } from '../lib/api';
import { env } from '../config/env';
import { features } from '../config/features';
import { useEnabledSocialProviders, SocialProvider } from '../lib/authProviders';
import { colors } from '../theme/colors';

// Required: warm up the browser on Android for a faster OAuth open
WebBrowser.maybeCompleteAuthSession();

export const LoginScreen: React.FC = () => {
  const [loginMode, setLoginMode] = useState<'phone' | 'email'>('phone');
  
  // Phone OTP State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  // Email/Password State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);

  // Format phone number to standard 254XXXXXXXXX
  const formatPhone = (raw: string) => {
    let cleaned = raw.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.slice(1);
    } else if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    return cleaned;
  };

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 9) {
      Alert.alert('Invalid Phone', 'Please enter a valid Kenyan phone number.');
      return;
    }

    setLoading(true);
    try {
      await endpoints.sendOtp(formatPhone(phoneNumber));
      setStep('otp');
      Alert.alert('Code sent', 'Check your SMS for the 6-digit verification code.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not send the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!/^\d{6}$/.test(otpCode)) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const data = await endpoints.verifyOtp(formatPhone(phoneNumber), otpCode);
      if (data.isNewUser || !data.token_hash) {
        Alert.alert(
          'No account for this number',
          'This phone number is not linked to an Akibora account yet. Sign up with email or Google first, then add your phone number.'
        );
        return;
      }
      // Exchange the one-time hash for a session (triggers onAuthStateChange)
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'magiclink',
      });
      if (otpError) throw otpError;
    } catch (err: any) {
      Alert.alert('Verification Error', err.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Required Fields', 'Please fill in both email and password.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Development builds only (features.demoLogin is always false in production).
  // Credentials come from the developer's .env, never from source code.
  const demoAccounts = [
    { label: 'Admin Demo', email: process.env.EXPO_PUBLIC_DEMO_ADMIN_EMAIL, password: process.env.EXPO_PUBLIC_DEMO_ADMIN_PASSWORD },
    { label: 'Member Demo', email: process.env.EXPO_PUBLIC_DEMO_MEMBER_EMAIL, password: process.env.EXPO_PUBLIC_DEMO_MEMBER_PASSWORD },
  ].filter((a) => a.email && a.password) as Array<{ label: string; email: string; password: string }>;

  const handleDemoFill = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoginMode('email');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPass,
      });
      if (error) throw error;
    } catch (err: any) {
      Alert.alert('Demo Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Only providers switched on in Supabase (and allowed by feature flags) are shown
  const enabledSocial = useEnabledSocialProviders().filter(
    (p) => (p === 'google' && features.googleSignIn) || (p === 'apple' && features.appleSignIn)
  );

  const handleOAuthSignIn = async (provider: SocialProvider) => {
    setLoading(true);
    try {
      // akibora://auth/callback (must be in Supabase Auth -> Redirect URLs)
      const redirectUri = makeRedirectUri({ scheme: env.scheme, path: 'auth/callback' });

      // PKCE: Supabase keeps a code verifier on the device and the redirect
      // carries a one-time code instead of tokens.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUri, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('No sign-in URL returned.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
      if (result.type !== 'success' || !result.url) return; // cancelled or dismissed

      const { queryParams } = Linking.parse(result.url);
      const oauthError = typeof queryParams?.error_description === 'string' ? queryParams.error_description : null;
      if (oauthError) throw new Error(oauthError);
      const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
      if (!code) throw new Error('Sign-in was not completed. Please try again.');

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
    } catch (err: any) {
      Alert.alert(`${provider === 'google' ? 'Google' : 'Apple'} sign-in failed`, err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Header Banner */}
        <View style={styles.header}>
          <Text style={styles.logoText}>Akibora</Text>
          <Text style={styles.headerSubtitle}>Kenyan Chama Group Savings</Text>
        </View>

        {/* Auth Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>
            {loginMode === 'phone'
              ? 'Members sign in with registered M-Pesa number'
              : 'Chama Admins sign in with email credentials'}
          </Text>

          {/* Mode Switcher */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.tab, loginMode === 'phone' && styles.tabActive]}
              onPress={() => setLoginMode('phone')}
            >
              <Text style={[styles.tabText, loginMode === 'phone' && styles.tabTextActive]}>
                📱 Phone OTP
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, loginMode === 'email' && styles.tabActive]}
              onPress={() => setLoginMode('email')}
            >
              <Text style={[styles.tabText, loginMode === 'email' && styles.tabTextActive]}>
                🔑 Admin Sign In
              </Text>
            </TouchableOpacity>
          </View>

          {loginMode === 'phone' ? (
            step === 'phone' ? (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.phoneInputContainer}>
                  <Text style={styles.prefix}>+254</Text>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="712345678"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                  />
                </View>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleSendOTP}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send OTP Code</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Enter 6-Digit OTP Code</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="123456"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={setOtpCode}
                />
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleVerifyOTP}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify & Sign In</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryLink}
                  onPress={() => setStep('phone')}
                >
                  <Text style={styles.secondaryLinkText}>Change Phone Number</Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleEmailLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Google Sign-In Divider + Button */}
          {enabledSocial.length > 0 && (<>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {enabledSocial.includes('google') && (
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => handleOAuthSignIn('google')}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#374151" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#EA4335" style={styles.googleIcon} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
          )}

          {enabledSocial.includes('apple') && (
          <TouchableOpacity
            style={[styles.googleButton, styles.appleButton]}
            onPress={() => handleOAuthSignIn('apple')}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={20} color="#FFFFFF" style={styles.googleIcon} />
                <Text style={[styles.googleButtonText, { color: '#FFFFFF' }]}>Continue with Apple</Text>
              </>
            )}
          </TouchableOpacity>
          )}
          </>)}

          {/* Demo accounts: development builds only */}
          {features.demoLogin && demoAccounts.length > 0 && (
          <View style={styles.demoDrawerContainer}>
            <TouchableOpacity
              style={styles.demoAccordionHeader}
              onPress={() => setShowDemoDrawer(!showDemoDrawer)}
              activeOpacity={0.7}
            >
              <View style={styles.demoHeaderLeft}>
                <Ionicons name="flash-outline" size={16} color="#16A34A" />
                <Text style={styles.demoAccordionTitle}>Quick Demo Access (Testers)</Text>
              </View>
              <Ionicons
                name={showDemoDrawer ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#6B7280"
              />
            </TouchableOpacity>

            {showDemoDrawer && (
              <View style={styles.demoGrid}>
                {demoAccounts.map((a) => (
                  <TouchableOpacity
                    key={a.label}
                    style={styles.demoButton}
                    onPress={() => handleDemoFill(a.email, a.password)}
                  >
                    <Text style={styles.demoBtnText}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary.light,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.card.light,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.light,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary.light,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary.light,
  },
  tabTextActive: {
    color: colors.primary,
  },
  formGroup: {
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textSecondary.light,
    letterSpacing: 0.5,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    height: 52,
  },
  prefix: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.light,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    height: 56,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    color: colors.text.light,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    height: 52,
    fontSize: 16,
    color: colors.text.light,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryLinkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  demoDrawerContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  demoAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  demoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoAccordionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#15803D',
  },
  demoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  demoButton: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  demoBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: colors.textSecondary.light,
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    height: 52,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
});
