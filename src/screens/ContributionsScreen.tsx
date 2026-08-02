import React, { useEffect, useState, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';

const API_BASE_URL = 'https://smart-chama10.vercel.app';

export const ContributionsScreen: React.FC = () => {
  const { session, member, group, refreshAuth } = useAuth();
  const { colors: themeColors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Summary Metrics
  const [totalContributed, setTotalContributed] = useState<number>(0);
  const [thisMonthTotal, setThisMonthTotal] = useState<number>(0);
  const [history, setHistory] = useState<any[]>([]);

  // Modal & M-Pesa Payment State
  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [stkStatus, setStkStatus] = useState<'idle' | 'sending' | 'waiting' | 'success' | 'timeout'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const fetchContributionsData = async () => {
    if (!member?.id || !group?.id) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch contribution history for member
      const { data, error } = await supabase
        .from('contributions_v2')
        .select('*')
        .eq('membership_id', member.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items = data || [];
      setHistory(items);

      // 2. Calculate Total Contributed
      const confirmedItems = items.filter((item) => item.status === 'confirmed');
      const total = confirmedItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      setTotalContributed(total);

      // 3. Calculate This Month Contributed
      const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
      const thisMonthItems = confirmedItems.filter(
        (item) => item.created_at && item.created_at.startsWith(currentMonthStr)
      );
      const monthTotal = thisMonthItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      setThisMonthTotal(monthTotal);

      // Default amount
      if (!amount && group.contribution_amount) {
        setAmount(String(group.contribution_amount));
      }
      if (!phone && member.profiles?.phone_number) {
        setPhone(member.profiles.phone_number);
      }
    } catch (err) {
      console.error('Error fetching contributions data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchContributionsData();
  }, [member?.id, group?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAuth();
    await fetchContributionsData();
  };

  /**
   * Checks biometric hardware & enrollment, then prompts the user.
   * Returns true if auth passed (or device has no biometrics — fail-open).
   */
  const requireBiometricAuth = useCallback(async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) return true; // No sensor — skip silently

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) return true; // No fingerprints set up — skip silently

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm with fingerprint to pay',
        fallbackLabel: 'Use PIN instead',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (!result.success) {
        Alert.alert(
          'Authentication Failed',
          'Fingerprint not recognised. Payment cancelled.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch {
      // If biometric check itself throws, fail-open so payments still work
      return true;
    }
  }, []);

  // Trigger M-Pesa STK Push
  const handlePayViaMpesa = async () => {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 1) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount (minimum KSh 1).');
      return;
    }

    let formattedPhone = phone.replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
    if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

    if (!/^254\d{9}$/.test(formattedPhone)) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number (07XXXXXXXX or 254XXXXXXXXX).');
      return;
    }

    // 🔐 Biometric gate — must pass before STK push is sent
    const authOk = await requireBiometricAuth();
    if (!authOk) return;

    setStkStatus('sending');
    setStatusMessage('Initiating M-Pesa STK Push...');

    try {
      const res = await fetch(`${API_BASE_URL}/api/mpesa/stk-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          phone: formattedPhone,
          amount: numAmount,
          chama_id: group?.id,
          membership_id: member?.id,
          account_ref: group?.name || 'SmartChama',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger M-Pesa payment.');
      }

      const checkoutId = data.CheckoutRequestID || data.checkout_request_id;
      setStkStatus('waiting');
      setStatusMessage('Check your phone for the M-Pesa STK prompt and enter your PIN.');

      // Poll for payment confirmation for up to 60 seconds (12 iterations x 5s)
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts += 1;

        const { data: latestContrib } = await supabase
          .from('contributions_v2')
          .select('status, mpesa_receipt')
          .eq('membership_id', member?.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (latestContrib && latestContrib.status === 'confirmed') {
          clearInterval(interval);
          setStkStatus('success');
          const receiptNo = latestContrib.mpesa_receipt || 'Confirmed';
          setStatusMessage(`Payment Received! Receipt: ${receiptNo}`);
          fetchContributionsData();
          sendWhatsAppConfirmation(receiptNo, numAmount);
          return;
        }

        if (attempts >= 12) {
          clearInterval(interval);
          setStkStatus('timeout');
          setStatusMessage('Payment verification timed out. If completed, it will reflect shortly.');
          fetchContributionsData();
        }
      }, 5000);
    } catch (err: any) {
      setStkStatus('idle');
      Alert.alert('Payment Error', err.message || 'M-Pesa STK push failed.');
    }
  };

  const sendWhatsAppConfirmation = (receipt: string, amountVal: string | number) => {
    let adminPhone = (group as any)?.admin_phone || member?.profiles?.phone_number || '';
    adminPhone = adminPhone.replace(/\s/g, '');
    if (adminPhone.startsWith('+')) adminPhone = adminPhone.slice(1);
    if (adminPhone.startsWith('0')) adminPhone = '254' + adminPhone.slice(1);
    if (!adminPhone.startsWith('254') && adminPhone.length > 0) adminPhone = '254' + adminPhone;

    const msg = `Hi, I just paid KSh ${amountVal} contribution for ${group?.name || 'SmartChama'} via SmartChama. Ref: ${receipt}`;
    const url = `whatsapp://send?phone=${adminPhone}&text=${encodeURIComponent(msg)}`;

    Linking.canOpenURL(url).then((ok) => {
      if (ok) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`);
      }
    }).catch((err) => console.log('WhatsApp link error:', err));
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString('en-KE', { maximumFractionDigits: 0 });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { bg: '#DCFCE7', color: '#15803D', label: 'Confirmed' };
      case 'pending':
        return { bg: '#FEF3C7', color: '#B45309', label: 'Pending' };
      case 'failed':
        return { bg: '#FEE2E2', color: '#B91C1C', label: 'Failed' };
      default:
        return { bg: '#F3F4F6', color: '#4B5563', label: status };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contributions</Text>
        <Text style={styles.headerSub}>{group?.name || 'SmartChama Savings'}</Text>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>TOTAL CONTRIBUTED</Text>
            <Text style={styles.summaryValue}>KES {formatCurrency(totalContributed)}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {member?.contribution_streak || 0} Month Streak</Text>
          </View>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryFooter}>
          <Text style={styles.summarySubLabel}>This Month (Current Cycle):</Text>
          <Text style={styles.summarySubValue}>KES {formatCurrency(thisMonthTotal)}</Text>
        </View>
      </View>

      {/* Prominent Make Contribution Button */}
      <TouchableOpacity
        style={styles.payButton}
        onPress={() => {
          setStkStatus('idle');
          setStatusMessage('');
          setModalVisible(true);
        }}
      >
        <Text style={styles.payButtonText}>+ Make Contribution (M-Pesa)</Text>
      </TouchableOpacity>

      {/* History Section Title */}
      <Text style={styles.historyTitle}>Contribution History</Text>

      {/* FlatList Contribution History */}
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const badge = getStatusBadge(item.status);
          return (
            <View style={styles.historyRow}>
              <View style={styles.historyIcon}>
                <Text style={{ fontSize: 20 }}>💰</Text>
              </View>

              <View style={styles.historyMain}>
                <Text style={styles.historyAmount}>KES {formatCurrency(item.amount)}</Text>
                <Text style={styles.historyDate}>
                  {new Date(item.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {item.mpesa_receipt ? ` · ${item.mpesa_receipt}` : ''}
                </Text>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No contributions recorded yet</Text>
            </View>
          ) : null
        }
      />

      {/* M-PESA PAYMENT MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>M-Pesa Contribution</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {stkStatus === 'idle' ? (
              <View style={styles.modalForm}>
                <Text style={styles.inputLabel}>Contribution Amount (KES)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="1000"
                  value={amount}
                  onChangeText={setAmount}
                />

                <Text style={styles.inputLabel}>M-Pesa Phone Number</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="phone-pad"
                  placeholder="254712345678"
                  value={phone}
                  onChangeText={setPhone}
                />

                <TouchableOpacity style={styles.stkSubmitButton} onPress={handlePayViaMpesa}>
                  <Text style={styles.stkSubmitText}>Pay via M-Pesa Express</Text>
                </TouchableOpacity>
              </View>
            ) : stkStatus === 'sending' || stkStatus === 'waiting' ? (
              <View style={styles.stkWaitingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.stkWaitingTitle}>
                  {stkStatus === 'sending' ? 'Sending Request...' : 'Waiting for PIN'}
                </Text>
                <Text style={styles.stkWaitingMessage}>{statusMessage}</Text>
              </View>
            ) : stkStatus === 'success' ? (
              <View style={styles.stkSuccessBox}>
                <Text style={{ fontSize: 48 }}>✅</Text>
                <Text style={styles.stkSuccessTitle}>Payment Received!</Text>
                <Text style={styles.stkWaitingMessage}>{statusMessage}</Text>
                <TouchableOpacity
                  style={[styles.stkSubmitButton, { backgroundColor: '#25D366', flexDirection: 'row', gap: 8 }]}
                  onPress={() => sendWhatsAppConfirmation(statusMessage.split('Receipt: ')[1] || 'Confirmed', amount)}
                >
                  <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
                  <Text style={styles.stkSubmitText}>Share on WhatsApp</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.stkSubmitButton, { backgroundColor: colors.primary, marginTop: 8 }]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.stkSubmitText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.stkSuccessBox}>
                <Text style={{ fontSize: 48 }}>⏳</Text>
                <Text style={styles.stkWaitingTitle}>Pending Confirmation</Text>
                <Text style={styles.stkWaitingMessage}>{statusMessage}</Text>
                <TouchableOpacity
                  style={styles.stkSubmitButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.stkSubmitText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
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
  summaryCard: {
    marginHorizontal: 20,
    backgroundColor: colors.card.light,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary.light,
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 4,
  },
  streakBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D97706',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 14,
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summarySubLabel: {
    fontSize: 13,
    color: colors.textSecondary.light,
  },
  summarySubValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  payButton: {
    marginHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyMain: {
    flex: 1,
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  historyDate: {
    fontSize: 12,
    color: colors.textSecondary.light,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary.light,
    fontSize: 14,
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
    minHeight: 340,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
    padding: 4,
  },
  modalForm: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary.light,
    textTransform: 'uppercase',
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
  },
  stkSubmitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  stkSubmitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stkWaitingBox: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 12,
  },
  stkWaitingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  stkWaitingMessage: {
    fontSize: 14,
    color: colors.textSecondary.light,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  stkSuccessBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  stkSuccessTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
});
