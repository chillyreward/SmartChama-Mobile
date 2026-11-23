import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Button, Field, Notice, Segmented, T, Logo } from '../ui';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { endpoints } from '../lib/api';
import { env } from '../config/env';
import { features } from '../config/features';
import { useEnabledSocialProviders, SocialProvider } from '../lib/authProviders';

// Required: warm up the browser on Android for a faster OAuth open
WebBrowser.maybeCompleteAuthSession();

export const LoginScreen: React.FC<{ route?: any; navigation?: any }> = ({ route, navigation }) => {
  const { colors } = useTheme();
  const isSignup = route?.params?.mode === 'signup';
  const [info, setInfo] = useState('');
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
      setInfo(`We sent a 6-digit code to ${phoneNumber}. It can take a minute.`);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <Logo />

          <T v="hero" style={{ marginTop: 36 }}>{isSignup ? 'Join your group' : 'Welcome back'}</T>
          <T v="body" tone="ink2" style={{ marginTop: 10 }}>
            {isSignup
              ? 'Create your account with Google or Apple, then type the group code your chair or treasurer shared.'
              : loginMode === 'phone'
                ? 'Sign in with the phone number on your account. We will text you a code.'
                : 'Sign in with your email and password.'}
          </T>

          {isSignup ? (
            <View style={{ marginTop: 24, gap: 10 }}>
              {socialButtons()}
              <Button label="Sign up with my phone number" variant="ghost" icon="open-outline" onPress={() => WebBrowser.openBrowserAsync(`${env.apiBaseUrl}/signup?role=member`).catch(() => {})} />
              <T v="caption" tone="ink3" style={{ textAlign: 'center' }}>Phone sign-up opens on the Akibora website. Come back here to sign in afterwards.</T>
            </View>
          ) : null}

          {!isSignup ? (
            <View style={{ marginTop: 24 }}>
              <Segmented
                value={loginMode}
                onChange={(m) => { setLoginMode(m); setInfo(''); }}
                items={[{ value: 'phone', label: 'Phone' }, { value: 'email', label: 'Email' }]}
              />
              <View style={{ gap: 16, marginTop: 20 }}>
                {loginMode === 'phone' ? (
                  step === 'phone' ? (
                    <>
                      <Field label="Phone number" placeholder="0712 345 678" keyboardType="phone-pad" autoComplete="tel" value={phoneNumber} onChangeText={setPhoneNumber} />
                      <Button label="Text me a code" size="lg" loading={loading} onPress={handleSendOTP} />
                    </>
                  ) : (
                    <>
                      {info ? <Notice tone="ok">{info}</Notice> : null}
                      <Field label="6-digit code" placeholder="123456" keyboardType="number-pad" maxLength={6} autoComplete="sms-otp" textContentType="oneTimeCode" value={otpCode} onChangeText={setOtpCode} />
                      <Button label="Sign in" size="lg" loading={loading} onPress={handleVerifyOTP} />
                      <Button label="Use a different number" variant="ghost" onPress={() => { setStep('phone'); setOtpCode(''); setInfo(''); }} />
                    </>
                  )
                ) : (
                  <>
                    <Field label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} />
                    <Field label="Password" secureTextEntry autoComplete="password" value={password} onChangeText={setPassword} />
                    <Button label="Sign in" size="lg" loading={loading} onPress={handleEmailLogin} />
                  </>
                )}
              </View>
            </View>
          ) : null}

          {!isSignup && enabledSocial.length > 0 ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
                <T v="caption" tone="ink3">or</T>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
              </View>
              <View style={{ gap: 10 }}>{socialButtons()}</View>
            </>
          ) : null}

          {features.demoLogin && demoAccounts.length > 0 ? (
            <View style={{ marginTop: 24, gap: 8 }}>
              <Pressable onPress={() => setShowDemoDrawer(!showDemoDrawer)} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T v="smallStrong" tone="ink2">Development accounts</T>
                <Ionicons name={showDemoDrawer ? 'chevron-up' : 'chevron-down'} size={18} color={colors.ink3} />
              </Pressable>
              {showDemoDrawer ? demoAccounts.map((a) => (
                <Button key={a.label} label={a.label} variant="outline" size="sm" onPress={() => handleDemoFill(a.email, a.password)} />
              )) : null}
            </View>
          ) : null}

          <View style={{ flex: 1, minHeight: 24 }} />
          <Pressable onPress={() => navigation?.setParams({ mode: isSignup ? 'login' : 'signup' })} accessibilityRole="button" style={{ alignItems: 'center', paddingVertical: 10 }}>
            <T v="small" tone="ink2">
              {isSignup ? 'Already have an account? ' : 'New to Akibora? '}
              <T v="smallStrong" tone="brand">{isSignup ? 'Sign in' : 'Join your group'}</T>
            </T>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  function socialButtons() {
    return (
      <>
        {enabledSocial.includes('google') ? (
          <Button label="Continue with Google" variant="outline" size="lg" icon="logo-google" disabled={loading} onPress={() => handleOAuthSignIn('google')} />
        ) : null}
        {enabledSocial.includes('apple') ? (
          <Button label="Continue with Apple" variant="primary" size="lg" icon="logo-apple" disabled={loading} onPress={() => handleOAuthSignIn('apple')} />
        ) : null}
      </>
    );
  }
};
