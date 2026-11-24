import React, { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Switch, View } from 'react-native';
import * as Application from 'expo-application';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, type ThemeMode } from '../contexts/ThemeContext';
import { env } from '../config/env';
import { endpoints } from '../lib/api';
import { allowSensitiveAction } from '../security/biometric';
import { supabase } from '../lib/supabase';
import { Avatar, Button, Chip, Field, Notice, Panel, ROLE_LABEL, Row, Screen, SectionTitle, Segmented, T, shortDate } from '../ui';
import { startTour } from '../components/AppTour';

// Same keys and defaults as the web settings page, saved on profiles.notification_prefs
const PREFS = [
  { key: 'contribution_reminders', label: 'Contribution reminders', hint: 'Before and on the day a payment is due' },
  { key: 'late_payment_alerts', label: 'Late payment alerts', hint: 'If a payment is missed or a fine is added' },
  { key: 'new_member_joins', label: 'New members', hint: 'When someone joins the group' },
  { key: 'sms_notifications', label: 'By SMS', hint: 'Works on any phone' },
] as const;
const DEFAULTS: Record<string, boolean> = {
  contribution_reminders: true, late_payment_alerts: true, monthly_report: true, new_member_joins: true,
  whatsapp_notifications: false, sms_notifications: true, email_notifications: false,
};

export const ProfileScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { session, member, group, signOut, refreshAuth, userMemberships, switchActiveGroup } = useAuth();
  const { mode, setThemeMode, colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(member?.profiles?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULTS);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from('profiles').select('notification_prefs').eq('id', session.user.id).maybeSingle().then(({ data }) => {
      if (data?.notification_prefs) setPrefs({ ...DEFAULTS, ...data.notification_prefs });
    });
  }, [session?.user?.id]);

  const togglePref = async (key: string) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    const { error } = await supabase.from('profiles').update({ notification_prefs: next }).eq('id', session!.user.id);
    if (error) {
      setPrefs(prefs);
      Alert.alert('Not saved', 'Check your connection and try again.');
    }
  };

  const saveName = async () => {
    setNameError('');
    if (!fullName.trim()) return setNameError('Enter your name.');
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim(), updated_at: new Date().toISOString() }).eq('id', session!.user.id);
    setSaving(false);
    if (error) return setNameError(error.message || 'Could not save.');
    setEditing(false);
    refreshAuth();
  };

  // Google Play requires in-app account deletion. Personal details are erased;
  // the group's financial records are kept (see /account/delete on the web).
  const performDelete = async () => {
    if (!(await allowSensitiveAction('Confirm account deletion'))) return;
    setDeleting(true);
    try {
      await endpoints.deleteAccount();
      Alert.alert('Account deleted', 'Your personal details are erased and you are signed out.');
      await signOut();
    } catch (err: any) {
      Alert.alert('Could not delete your account', err.message || 'Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete your account?',
      "We erase your name, phone number, email, ID number and photo, and you can't sign in again. Your group keeps the record of your contributions for its accounts. This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Learn more', onPress: () => Linking.openURL(env.deleteAccountUrl).catch(() => {}) },
        { text: 'Delete account', style: 'destructive', onPress: () => Alert.alert('Are you sure?', 'This permanently deletes your Akibora account.', [{ text: 'Keep my account', style: 'cancel' }, { text: 'Yes, delete', style: 'destructive', onPress: performDelete }]) },
      ],
    );
  };

  const name = member?.profiles?.full_name || 'Your name';

  return (
    <Screen title="Profile and settings" onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}>
      <Panel tone="forest" style={{ padding: 22, borderRadius: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar name={name} size={60} tone="mint" />
          <View style={{ flex: 1 }}>
            <T v="title" tone="onForest" numberOfLines={1}>{name}</T>
            <T v="small" tone="onForest2">{member?.profiles?.phone_number || member?.profiles?.email || ''}</T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 24, marginTop: 18 }}>
          <View><T v="caption" tone="onForest3">Role</T><T v="smallStrong" tone="onForest">{ROLE_LABEL[member?.role ?? 'member'] ?? member?.role}</T></View>
          <View><T v="caption" tone="onForest3">Trust score</T><T v="smallStrong" tone="mint">{Number(member?.trust_score ?? 0)} /100</T></View>
          <View><T v="caption" tone="onForest3">Since</T><T v="smallStrong" tone="onForest">{shortDate((member as any)?.joined_at || member?.created_at, { month: 'short', year: 'numeric' }) || '—'}</T></View>
        </View>
        <Button label="Edit name" variant="onForest" size="sm" icon="create-outline" style={{ marginTop: 18, alignSelf: 'flex-start' }} onPress={() => { setFullName(name); setNameError(''); setEditing(true); }} />
      </Panel>
      <T v="caption" tone="ink3" style={{ marginTop: 10 }}>To change your phone number, use Settings on the Akibora website.</T>

      <SectionTitle action="Join another" onAction={() => navigation?.navigate?.('JoinAnother')}>Your groups</SectionTitle>
      <T v="small" tone="ink2" style={{ marginTop: -6, marginBottom: 10 }}>One account works for every chama you're in. Tap one to open it.</T>
      <Panel style={{ paddingVertical: 4 }}>
        {userMemberships.filter((m) => m.chamas_v2).map((m, i, all) => {
          const ch = m.chamas_v2!;
          const on = ch.id === group?.id;
          const pending = m.status === 'pending';
          return (
            <Row
              key={ch.id}
              icon={on ? 'checkmark-circle' : 'people-outline'}
              title={ch.name}
              subtitle={pending ? 'Waiting for approval' : `${ROLE_LABEL[m.role] ?? m.role}${on ? ' · open now' : ''}`}
              right={pending ? <Chip kind="late" label="Pending" /> : undefined}
              onPress={pending || on ? undefined : () => switchActiveGroup(ch.id)}
              last={i === all.length - 1}
            />
          );
        })}
      </Panel>

      <SectionTitle>Notifications</SectionTitle>
      <Panel style={{ paddingVertical: 4 }}>
        {PREFS.map((p, i) => (
          <Row
            key={p.key}
            title={p.label}
            subtitle={p.hint}
            right={<Switch value={!!prefs[p.key]} onValueChange={() => togglePref(p.key)} trackColor={{ false: colors.raised, true: colors.moss }} thumbColor={prefs[p.key] ? colors.mint : '#fff'} accessibilityLabel={p.label} />}
            last={i === PREFS.length - 1}
          />
        ))}
      </Panel>

      <SectionTitle>Appearance</SectionTitle>
      <Segmented<ThemeMode> value={mode} onChange={setThemeMode} items={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'Phone setting' }]} />

      <SectionTitle>About</SectionTitle>
      <Panel style={{ paddingVertical: 4 }}>
        <Row icon="sparkles-outline" title="Take the tour again" onPress={startTour} />
        <Row icon="document-text-outline" title="Privacy" onPress={() => Linking.openURL(env.privacyPolicyUrl).catch(() => {})} />
        <Row icon="reader-outline" title="Terms" onPress={() => Linking.openURL(env.termsUrl).catch(() => {})} />
        <Row icon="information-circle-outline" title="Version" right={<T v="small" tone="ink2">{Application.nativeApplicationVersion ?? '-'} ({Application.nativeBuildVersion ?? '-'})</T>} last />
      </Panel>

      <Button label="Sign out" variant="outline" size="lg" icon="log-out-outline" style={{ marginTop: 28 }} onPress={() => Alert.alert('Sign out?', '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: signOut }])} />
      <Button label="Delete my account" variant="danger" size="lg" loading={deleting} style={{ marginTop: 12 }} onPress={confirmDelete} />

      <Modal visible={editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(false)}>
        <View style={{ flex: 1, backgroundColor: colors.page, padding: 20, gap: 18 }}>
          <T v="display" style={{ marginTop: 8 }}>Your name</T>
          <T v="small" tone="ink2">As it appears on your ID. Everyone in your group sees it.</T>
          <Field label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" />
          {nameError ? <Notice tone="danger">{nameError}</Notice> : null}
          <Button label="Save" size="lg" loading={saving} onPress={saveName} />
          <Button label="Cancel" variant="ghost" onPress={() => setEditing(false)} />
        </View>
      </Modal>
    </Screen>
  );
};
