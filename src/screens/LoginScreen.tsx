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
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';

const API_BASE_URL = 'https://smart-chama10.vercel.app';

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
    if (!phoneNumber || phoneNumber.length < 9) {
      Alert.alert('Invalid Phone', 'Please enter a valid Kenyan phone number.');
      return;
    }

    setLoading(true);
    try {
      const formatted = formatPhone(phoneNumber);
      const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: formatted }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP code.');
      }

      setStep('otp');
      Alert.alert('OTP Sent', 'Check your phone for the 6-digit verification code.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length < 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const formatted = formatPhone(phoneNumber);
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: formatted, code: otpCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'OTP verification failed.');
      }

      // If magic link token returned, verify OTP with Supabase
      if (data.token_hash) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: 'magiclink',
        });
        if (otpError) throw otpError;
      } else if (data.email) {
        // Fallback for phone-based email mapping
        Alert.alert('Success', 'Verification complete. Logging in...');
      }
    } catch (err: any) {
      Alert.alert('Verification Error', err.message || 'Invalid or expired OTP.');
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Header Banner */}
        <View style={styles.header}>
          <Text style={styles.logoText}>SmartChama</Text>
          <Text style={styles.headerSubtitle}>Kenyan Chama Group Savings & Loans</Text>
        </View>

        {/* Auth Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to access your Chama account</Text>

          {/* Mode Switcher */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.tab, loginMode === 'phone' && styles.tabActive]}
              onPress={() => setLoginMode('phone')}
            >
              <Text style={[styles.tabText, loginMode === 'phone' && styles.tabTextActive]}>
                Phone OTP
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, loginMode === 'email' && styles.tabActive]}
              onPress={() => setLoginMode('email')}
            >
              <Text style={[styles.tabText, loginMode === 'email' && styles.tabTextActive]}>
                Email Sign In
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

          {/* Demo Accounts Quick-Fill Section */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Try a Demo Account</Text>
            <View style={styles.demoGrid}>
              <TouchableOpacity
                style={styles.demoButton}
                onPress={() => handleDemoFill('demo.admin@smartchama.co.ke', 'DemoAdmin2024!')}
              >
                <Text style={styles.demoBtnText}>👑 Admin Demo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.demoButton}
                onPress={() => handleDemoFill('demo.member@smartchama.co.ke', 'DemoMember2024!')}
              >
                <Text style={styles.demoBtnText}>👤 Member Demo</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    fontSize: 14,
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
    fontSize: 14,
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
  demoSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textSecondary.light,
    textAlign: 'center',
    marginBottom: 12,
  },
  demoGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  demoButton: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  demoBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.light,
  },
});
