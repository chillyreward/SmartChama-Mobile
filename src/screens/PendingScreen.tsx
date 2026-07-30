import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/colors';

export const PendingScreen: React.FC = () => {
  const { group, refreshAuth, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 36 }}>⏳</Text>
        </View>

        <Text style={styles.title}>Approval Pending</Text>
        <Text style={styles.subtitle}>
          Your request to join <Text style={styles.chamaHighlight}>{group?.name || 'the Chama group'}</Text> is pending admin approval.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            The Chama administrator has been notified. Once approved, your account will immediately gain full access to contributions, loans, and group features.
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={refreshAuth}>
          <Text style={styles.primaryButtonText}>Check Status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={signOut}>
          <Text style={styles.secondaryButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.light,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary.light,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  chamaHighlight: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  infoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary.light,
    textAlign: 'center',
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: colors.textSecondary.light,
    fontSize: 14,
    fontWeight: '600',
  },
});
