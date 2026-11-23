import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { endpoints } from '../lib/api';
import { fonts } from '../theme/fonts';
import { Button, Notice, T } from '../ui';
import { WaitingForApproval } from './PendingScreen';

export const JoinChamaScreen: React.FC = () => {
  const { member, group, signOut, refreshAuth } = useAuth();
  const { colors } = useTheme();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingNote, setPendingNote] = useState('');

  const join = async () => {
    if (code.trim().length < 4) return setError('Type the group code or invite code you were given.');
    setLoading(true);
    setError('');
    try {
      // Group code -> request awaiting an official's approval;
      // personal invite token -> joins straight away.
      const data = await endpoints.joinChama(code.trim().toUpperCase());
      if (data.pending) setPendingNote(`Your request to join ${data.chamaName || 'the group'} is with its officials. The group opens for you once one of them approves it.`);
      await refreshAuth();
    } catch (e: any) {
      setError(e?.message || 'That code did not work. Check it with your official and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (member?.status === 'pending' || pendingNote) {
    return <WaitingForApproval groupName={group?.name} note={pendingNote || undefined} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 22, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <T v="title">Akibora</T>
          <T v="hero" style={{ marginTop: 36 }}>Join your group</T>
          <T v="body" tone="ink2" style={{ marginTop: 10 }}>Type the code your chair or treasurer shared. An official approves each new member.</T>

          <View style={{ marginTop: 28, gap: 8 }}>
            <T v="smallStrong">Group code</T>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 14))}
              placeholder="TUJ-7Q4K"
              placeholderTextColor={colors.ink3}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Group code"
              style={{ height: 68, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, textAlign: 'center', fontFamily: fonts.monoMedium, fontSize: 26, letterSpacing: 4, color: colors.ink }}
            />
          </View>
          {error ? <View style={{ marginTop: 14 }}><Notice tone="danger">{error}</Notice></View> : null}
          <Button label="Join the group" size="lg" loading={loading} disabled={!code.trim()} style={{ marginTop: 18 }} onPress={join} />

          <View style={{ flex: 1, minHeight: 32 }} />
          <T v="small" tone="ink2" style={{ textAlign: 'center' }}>No code? Ask an official in your group.</T>
          <Button label="Sign out" variant="ghost" onPress={signOut} style={{ marginTop: 6 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
