import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
  ActivityIndicator,
  useColorScheme,
  Linking,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import * as Application from 'expo-application';
import { env } from '../config/env';
import { endpoints } from '../lib/api';
import { allowSensitiveAction } from '../security/biometric';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';

export const ProfileScreen: React.FC = () => {
  const { session, member, group, signOut, refreshAuth } = useAuth();
  const { mode: themeMode, setThemeMode, colors, isDark } = useTheme();

  // Edit Name State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [fullName, setFullName] = useState(member?.profiles?.full_name || '');
  const [updating, setUpdating] = useState(false);

  // Settings State
  const [smsNotifs, setSmsNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [language, setLanguage] = useState<'en' | 'sw'>('en');

  const getInitials = (name?: string) => {
    if (!name) return 'M';
    const parts = name.trim().split(' ');
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim() || !session?.user?.id) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (error) throw error;

      Alert.alert('Profile Updated', 'Your full name has been updated.');
      setEditModalVisible(false);
      await refreshAuth();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update profile.');
    } finally {
      setUpdating(false);
    }
  };

  const [deleting, setDeleting] = useState(false);

  // Google Play requires in-app account deletion. Personal details are erased;
  // the group's financial records are kept (see /account/delete on the web).
  const performDelete = async () => {
    if (!(await allowSensitiveAction('Confirm account deletion'))) return;
    setDeleting(true);
    try {
      await endpoints.deleteAccount();
      Alert.alert('Account deleted', 'Your personal details have been erased and you have been signed out.');
      await signOut();
    } catch (err: any) {
      Alert.alert('Could not delete account', err.message || 'Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'We will erase your name, phone number, email, ID number and photo, and you will not be able to sign in again. ' +
        "Your group keeps the records of your contributions for its accounts. You can't undo this.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Learn more', onPress: () => Linking.openURL(env.deleteAccountUrl).catch(() => {}) },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you sure?', 'This permanently deletes your SmartChama account.', [
              { text: 'Keep my account', style: 'cancel' },
              { text: 'Yes, delete', style: 'destructive', onPress: performDelete },
            ]),
        },
      ]
    );
  };

  const handleSignOutConfirm = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of SmartChama?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile & Settings</Text>
          <Text style={styles.headerSub}>Account Preferences</Text>
        </View>

        {/* Section 1: Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{getInitials(member?.profiles?.full_name)}</Text>
          </View>

          <Text style={styles.profileName}>{member?.profiles?.full_name || 'SmartChama Member'}</Text>
          <Text style={styles.profileContact}>
            {member?.profiles?.phone_number || member?.profiles?.email || '—'}
          </Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {member?.role ? member.role.toUpperCase() : 'MEMBER'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => {
              setFullName(member?.profiles?.full_name || '');
              setEditModalVisible(true);
            }}
          >
            <Text style={styles.editProfileBtnText}>✏️ Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Section 2: Account Overview Info */}
        <Text style={styles.sectionTitle}>Account Info</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Chama Group</Text>
            <Text style={styles.infoValue}>{group?.name || 'SmartChama'}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trust Score</Text>
            <Text style={[styles.infoValue, { color: colors.primary }]}>
              ⭐ {member?.trust_score || 100} / 100
            </Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>
              {member?.created_at
                ? new Date(member.created_at).toLocaleDateString('en-GB', {
                    month: 'short',
                    year: 'numeric',
                  })
                : '2024'}
            </Text>
          </View>
        </View>

        {/* Section 3: Preferences & Settings */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.settingsCard}>
          {/* Notifications */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingSub}>Alerts for contributions & payouts</Text>
            </View>
            <Switch
              value={pushNotifs}
              onValueChange={setPushNotifs}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>SMS Notifications</Text>
              <Text style={styles.settingSub}>Africa's Talking SMS alerts</Text>
            </View>
            <Switch
              value={smsNotifs}
              onValueChange={setSmsNotifs}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
            />
          </View>

          <View style={styles.settingDivider} />

          {/* Language Selector */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>App Language</Text>
              <Text style={styles.settingSub}>{language === 'en' ? 'English' : 'Kiswahili'}</Text>
            </View>
            <View style={styles.langSelector}>
              <TouchableOpacity
                style={[styles.langChip, language === 'en' && styles.langChipActive]}
                onPress={() => setLanguage('en')}
              >
                <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>EN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langChip, language === 'sw' && styles.langChipActive]}
                onPress={() => setLanguage('sw')}
              >
                <Text style={[styles.langText, language === 'sw' && styles.langTextActive]}>SW</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingDivider} />

          {/* Theme Mode */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>App Theme</Text>
              <Text style={styles.settingSub}>
                {themeMode === 'system' ? 'System Default' : themeMode.toUpperCase()}
              </Text>
            </View>
            <View style={styles.langSelector}>
              <TouchableOpacity
                style={[styles.langChip, themeMode === 'light' && styles.langChipActive]}
                onPress={() => setThemeMode('light')}
              >
                <Text style={[styles.langText, themeMode === 'light' && styles.langTextActive]}>☀️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langChip, themeMode === 'dark' && styles.langChipActive]}
                onPress={() => setThemeMode('dark')}
              >
                <Text style={[styles.langText, themeMode === 'dark' && styles.langTextActive]}>🌙</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* About & Legal */}
        <Text style={styles.sectionTitle}>About & Legal</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.linkRow}>
            <Text style={styles.linkText}>App Version</Text>
            <Text style={styles.linkVal}>
              v{Application.nativeApplicationVersion ?? '-'} ({Application.nativeBuildVersion ?? '-'})
            </Text>
          </TouchableOpacity>
          <View style={styles.settingDivider} />
          <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(env.privacyPolicyUrl).catch(() => {})}>
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Text style={styles.linkVal}>›</Text>
          </TouchableOpacity>
          <View style={styles.settingDivider} />
          <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(env.termsUrl).catch(() => {})}>
            <Text style={styles.linkText}>Terms of Service</Text>
            <Text style={styles.linkVal}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOutConfirm}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel="Delete my account"
        >
          <Text style={styles.deleteText}>{deleting ? 'Deleting…' : 'Delete my account'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter full name"
            />

            <TouchableOpacity
              style={styles.saveModalBtn}
              onPress={handleSaveProfile}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveModalBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  headerSub: {
    fontSize: 14,
    color: colors.textSecondary.light,
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: colors.card.light,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLargeText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.primaryDark,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  profileContact: {
    fontSize: 14,
    color: colors.textSecondary.light,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 10,
  },
  roleBadgeText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: 'bold',
  },
  editProfileBtn: {
    marginTop: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.light,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: colors.card.light,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary.light,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 10,
  },
  settingsCard: {
    backgroundColor: colors.card.light,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTextGroup: {
    flex: 1,
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.light,
  },
  settingSub: {
    fontSize: 12,
    color: colors.textSecondary.light,
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 12,
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
  },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  langChipActive: {
    backgroundColor: '#FFFFFF',
  },
  langText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary.light,
  },
  langTextActive: {
    color: colors.primary,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.light,
  },
  linkVal: {
    fontSize: 14,
    color: colors.textSecondary.light,
  },
  signOutButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  signOutText: {
    color: '#991B1B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  deleteText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card.light,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  closeBtn: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textSecondary.light,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary.light,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    height: 50,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.light,
    marginBottom: 20,
  },
  saveModalBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveModalBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
