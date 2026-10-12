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
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { endpoints } from '../lib/api';
import { colors } from '../theme/colors';


export const JoinChamaScreen: React.FC = () => {
  const { session, member, group, signOut, refreshAuth } = useAuth();
  const [groupCode, setGroupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');

  const isPending = member?.status === 'pending';

  const handleJoinChama = async () => {
    if (!groupCode || groupCode.trim().length < 4) {
      setErrorMsg('Please enter your group or invite code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      // Group code -> request awaiting an official's approval;
      // personal invite token -> joins straight away.
      const data = await endpoints.joinChama(groupCode.trim().toUpperCase());
      if (data.pending) {
        setPendingMessage(`Your request to join ${data.chamaName || 'the group'} has been sent. You'll get access once an official approves it.`);
      }
      await refreshAuth();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to join group. Check group code and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isPending || pendingMessage) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconCircleWarning}>
            <Text style={{ fontSize: 32 }}>⏳</Text>
          </View>
          <Text style={styles.cardTitle}>Request Pending Approval</Text>
          <Text style={styles.cardSubtitle}>
            {pendingMessage || `Your request to join ${group?.name || 'the Chama'} has been sent to the group admin.`}
          </Text>
          <Text style={styles.infoText}>
            You will automatically gain access to the Chama dashboard once approved by the admin.
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={refreshAuth}>
            <Text style={styles.primaryButtonText}>Check Approval Status</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryLink} onPress={signOut}>
            <Text style={styles.secondaryLinkText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 32 }}>🤝</Text>
        </View>
        <Text style={styles.cardTitle}>Join a Chama Group</Text>
        <Text style={styles.cardSubtitle}>
          Enter the group code or invite code from your Chama admin
        </Text>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Group Code</Text>
          <TextInput
            style={styles.codeInput}
            placeholder="CHAMA1"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            maxLength={14}
            value={groupCode}
            onChangeText={(text) => {
              setGroupCode(text.toUpperCase());
              setErrorMsg('');
            }}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleJoinChama}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Join Chama</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.secondaryLink} onPress={signOut}>
          <Text style={styles.secondaryLinkText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background.light,
    justifyContent: 'center',
    padding: 20,
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
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconCircleWarning: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.light,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary.light,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary.light,
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
  },
  formGroup: {
    width: '100%',
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textSecondary.light,
    letterSpacing: 0.5,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    height: 64,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 6,
    color: colors.text.light,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 12,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    textAlign: 'center',
  },
  secondaryLink: {
    marginTop: 16,
    paddingVertical: 8,
  },
  secondaryLinkText: {
    color: colors.textSecondary.light,
    fontSize: 14,
    fontWeight: '600',
  },
});
