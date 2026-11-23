import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Button, Field, Notice, T, Logo } from '../ui';
import { supabase } from '../lib/supabase';
import { endpoints } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export const CompleteProfileScreen: React.FC = () => {
  const { session, refreshAuth, signOut } = useAuth();
  const { colors } = useTheme();

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 22, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <Logo />
          <T v="hero" style={{ marginTop: 36 }}>{codeSentTo ? 'Check your messages' : 'One more step'}</T>
          <T v="body" tone="ink2" style={{ marginTop: 10 }}>
            {codeSentTo
              ? `We sent a 6-digit code to ${codeSentTo}. It can take a minute.`
              : 'Add your M-Pesa number. Payment prompts go to it, and you can sign in with it.'}
          </T>

          <View style={{ gap: 16, marginTop: 28 }}>
            {!codeSentTo ? (
              <>
                <Field label="Full name, as on your ID" placeholder="Grace Wanjiku" autoCapitalize="words" autoComplete="name" value={fullName} onChangeText={setFullName} />
                <Field label="M-Pesa number" placeholder="0712 345 678" keyboardType="phone-pad" autoComplete="tel" maxLength={13} value={phoneNumber} onChangeText={setPhoneNumber} hint="We text a code to confirm it is yours." />
                <Button label="Text me a code" size="lg" loading={loading} onPress={handleSendCode} />
              </>
            ) : (
              <>
                <Field label="6-digit code" placeholder="123456" keyboardType="number-pad" maxLength={6} autoComplete="sms-otp" textContentType="oneTimeCode" value={code} onChangeText={setCode} />
                <Button label="Confirm number" size="lg" loading={loading} onPress={handleVerify} />
                <Button label="Use a different number" variant="ghost" onPress={() => { setCodeSentTo(null); setCode(''); }} />
              </>
            )}
          </View>

          <View style={{ flex: 1, minHeight: 32 }} />
          <Notice tone="info">Your number is only shown to your group&apos;s officials.</Notice>
          <Button label="Sign out" variant="ghost" style={{ marginTop: 8 }} onPress={signOut} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
