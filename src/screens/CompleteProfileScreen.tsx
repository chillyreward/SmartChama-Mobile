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
import { supabase } from '../lib/supabase';
import { endpoints } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/colors';

export const CompleteProfileScreen: React.FC = () => {
  const { session, refreshAuth } = useAuth();

  // Pre-fill full_name from Google metadata if available
  const googleName: string =
    session?.user?.user_metadata?.full_name ??
    session?.user?.user_metadata?.name ??
    '';

  const [fullName, setFullName] = useState(googleName);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  // Set once the SMS code has been sent; the number is saved only after the
  // code is confirmed (the database refuses direct phone writes).
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');

  // Format to standard 254XXXXXXXXX
  const formatPhone = (raw: string): string => {
    let cleaned = raw.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.slice(1);
    } else if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    return cleaned;
  };

  const isValidPhone = (raw: string): boolean => {
    const formatted = formatPhone(raw);
    // Kenyan numbers: 254 + 9 digits = 12 digits total
    return /^254[17]\d{8}$/.test(formatted);
  };

  const handleSendCode = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    if (!phoneNumber || !isValidPhone(phoneNumber)) {
      Alert.alert('Invalid Number', 'Please enter a valid Kenyan M-Pesa number (e.g. 0712345678).');
      return;
    }
    if (!session?.user?.id) {
      Alert.alert('Error', 'Session expired. Please sign in again.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', session.user.id);
      if (error) throw error;

      const res = await endpoints.sendPhoneCode('+' + formatPhone(phoneNumber));
      setCodeSentTo(res.phone);
      setCode('');
    } catch (err: any) {
      Alert.alert('Could not send code', err.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!codeSentTo || !/^\d{6}$/.test(code)) {
      Alert.alert('Enter the code', 'Type the 6-digit code from the SMS.');
      return;
    }
    setLoading(true);
    try {
      await endpoints.verifyPhone(codeSentTo, code);
      // refreshAuth re-runs fetchUserData: needsPhoneNumber becomes false and
      // AppNavigator moves on to the next screen
      await refreshAuth();
    } catch (err: any) {
      Alert.alert('Not verified', err.message || 'That code did not work. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.iconWrapper}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-add-outline" size={36} color={colors.primary} />
          </View>
        </View>

        <Text style={styles.title}>One more step</Text>
        <Text style={styles.subtitle}>
          We need your M-Pesa number to complete your Akibora profile.
          This is used for contributions and payouts.
        </Text>

        {/* Form card */}
        <View style={styles.card}>

          {/* Full name */}
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Jane Wanjiru"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
          />

          {!codeSentTo ? (
            <>
              {/* Phone number */}
              <Text style={[styles.label, { marginTop: 16 }]}>M-Pesa Phone Number</Text>
              <View style={styles.phoneRow}>
                <View style={styles.prefixBox}>
                  <Text style={styles.prefixText}>+254</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="712 345 678"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  maxLength={12}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  accessibilityLabel="M-Pesa phone number"
                />
              </View>
              <Text style={styles.hint}>
                We'll text a code to confirm it's your number. It receives M-Pesa prompts for payments.
              </Text>

              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleSendCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Send code</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.label, { marginTop: 16 }]}>Code sent to {codeSentTo}</Text>
              <TextInput
                style={[styles.input, { letterSpacing: 8, fontSize: 20, textAlign: 'center' }]}
                placeholder="123456"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                maxLength={6}
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
                accessibilityLabel="Verification code"
              />

              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleVerify}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.saveButtonText}>Verify & Continue</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.signOutLink} onPress={handleSendCode} disabled={loading}>
                <Text style={styles.signOutText}>Resend code</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.signOutLink} onPress={() => setCodeSentTo(null)} disabled={loading}>
                <Text style={styles.signOutText}>Use a different number</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Sign-out escape hatch */}
        <TouchableOpacity
          style={styles.signOutLink}
          onPress={async () => {
            await supabase.auth.signOut();
          }}
        >
          <Text style={styles.signOutText}>Sign out and use a different account</Text>
        </TouchableOpacity>

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
    padding: 24,
  },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text.light,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary.light,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: colors.card.light,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textSecondary.light,
    marginBottom: 8,
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
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    height: 52,
  },
  prefixBox: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border.light,
    backgroundColor: '#F1F5F9',
  },
  prefixText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text.light,
  },
  hint: {
    fontSize: 11,
    color: colors.textSecondary.light,
    marginTop: 6,
    lineHeight: 16,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signOutLink: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 8,
  },
  signOutText: {
    fontSize: 13,
    color: colors.textSecondary.light,
    textDecorationLine: 'underline',
  },
});
