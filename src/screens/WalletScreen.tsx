import React, { useEffect, useState } from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Share,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

import { generateMemberStatementPDF } from '../utils/pdfExport';
import { allowSensitiveAction } from '../security/biometric';
import { useSecureScreen } from '../security/useSecureScreen';

export const WalletScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { session, member, group } = useAuth();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Financial Balances
  const [walletBalance, setWalletBalance] = useState(0);
  const [myContributions, setMyContributions] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);

  useSecureScreen('wallet');

  // Withdrawal request modal. Money leaves the group only after a majority of
  // members vote yes and an official pays it out (server-side, locked).
  const [modalVisible, setModalVisible] = useState(false);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);

  const fetchWalletData = async () => {
    if (!group?.id || !member?.id) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch Wallet Balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('chama_id', group.id)
        .maybeSingle();

      if (wallet) {
        setWalletBalance(Number(wallet.balance) || 0);
      }

      // 2. Fetch My Contributions Sum
      const { data: contribs } = await supabase
        .from('contributions_v2')
        .select('amount')
        .eq('membership_id', member.id)
        .eq('status', 'confirmed');

      const mySum = contribs?.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0) || 0;
      setMyContributions(mySum);

      // 3. Fetch Recent Transactions
      const { data: txs } = await supabase
        .from('transactions_v2')
        .select('*')
        .eq('chama_id', group.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setTransactions(txs || []);
    } catch (err) {
      console.error('Wallet fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [group?.id, member?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  const handleExportStatement = async () => {
    const memberName = (member as any)?.full_name || member?.profiles?.full_name || 'Member';
    await generateMemberStatementPDF({
      memberName,
      chamaName: group?.name || 'Akibora Group',
      totalBalance: walletBalance,
      transactions,
    });
  };

  const handleRequestWithdrawal = async () => {
    const value = Number(amount);
    if (!reason.trim() || !value || value < 1) {
      Alert.alert('Missing details', 'Enter the amount and what the money is for.');
      return;
    }
    if (value > walletBalance) {
      Alert.alert('Not enough funds', `The group balance is KSh ${walletBalance.toLocaleString('en-KE')}.`);
      return;
    }
    if (!(await allowSensitiveAction('Confirm withdrawal request'))) return;

    setSending(true);
    try {
      const { error } = await supabase.from('withdrawal_consents').insert({
        chama_id: group?.id,
        requested_by: session?.user?.id,
        amount: value,
        reason: reason.trim().slice(0, 300),
      });
      if (error) throw error;
      Alert.alert('Request sent', 'Members can now vote on your withdrawal request.');
      setModalVisible(false);
      setReason('');
      setAmount('');
      fetchWalletData();
    } catch (err: any) {
      Alert.alert('Could not send request', err.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const mySharePct = walletBalance > 0 ? Math.min(100, Math.round((myContributions / walletBalance) * 100)) : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Wallet & Treasury</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Chama Fund Reserves & Disbursals</Text>
        </View>

        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: isDark ? '#14291D' : '#F0FDF4', borderColor: colors.border }]}>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>TOTAL CHAMA BALANCE</Text>
          <Text style={[styles.heroAmount, { color: colors.primary }]}>
            KSh {walletBalance.toLocaleString('en-KE')}
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="hand-left-outline" size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Request withdrawal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtnOutline, { borderColor: colors.primary }]}
              onPress={handleExportStatement}
            >
              <Ionicons name="download-outline" size={16} color={colors.primary} />
              <Text style={[styles.actionBtnOutlineText, { color: colors.primary }]}>Export Statement</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Financial Metrics Grid */}
        <View style={styles.grid}>
          <View style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.gridTitle, { color: colors.textSecondary }]}>My Contribution</Text>
            <Text style={[styles.gridValue, { color: colors.text }]}>KSh {myContributions.toLocaleString('en-KE')}</Text>
          </View>

          <View style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.gridTitle, { color: colors.textSecondary }]}>My Share of Pool</Text>
            <Text style={[styles.gridValue, { color: colors.text }]}>{mySharePct}%</Text>
          </View>
        </View>

        {/* Recent Transactions List */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
        ) : transactions.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="receipt-outline" size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent transactions</Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <View key={tx.id} style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View
                style={[
                  styles.txIconBox,
                  { backgroundColor: tx.type === 'contribution' ? '#DCFCE7' : '#FEE2E2' },
                ]}
              >
                <Ionicons
                  name={tx.type === 'contribution' ? 'arrow-down' : 'arrow-up'}
                  size={20}
                  color={tx.type === 'contribution' ? '#16A34A' : '#DC2626'}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.txTitle, { color: colors.text }]}>
                  {tx.description || (String(tx.type) === 'loan_repayment' ? 'REPAYMENT' : String(tx.type).startsWith('loan') ? 'PAYOUT' : tx.type.toUpperCase())}
                </Text>
                <Text style={[styles.txDate, { color: colors.textSecondary }]}>
                  {new Date(tx.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              <Text
                style={[
                  styles.txAmount,
                  { color: tx.type === 'contribution' ? '#16A34A' : colors.text },
                ]}
              >
                KSh {Number(tx.amount).toLocaleString('en-KE')}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Withdrawal request modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Request a withdrawal</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Members vote on it. If most agree, an official pays it out.</Text>

            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC', color: colors.text, borderColor: colors.border }]}
              placeholder="What is it for? (e.g. school fees)"
              placeholderTextColor={colors.textSecondary}
              value={reason}
              onChangeText={setReason}
              maxLength={300}
              accessibilityLabel="Reason for withdrawal"
            />

            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC', color: colors.text, borderColor: colors.border }]}
              placeholder="Amount (KSh)"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleRequestWithdrawal}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Send request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 18 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 13, marginTop: 2 },
  heroCard: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 16 },
  heroSub: { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  heroAmount: { fontSize: 32, fontWeight: 'bold', marginVertical: 8 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  actionBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  actionBtnOutline: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  actionBtnOutlineText: { fontWeight: 'bold', fontSize: 13 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  gridCard: { flex: 1, padding: 14, borderRadius: 16, borderWidth: 1 },
  gridTitle: { fontSize: 11, fontWeight: '600' },
  gridValue: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  infoText: { flex: 1, fontSize: 11 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  emptyBox: { alignItems: 'center', padding: 24, borderRadius: 16, borderWidth: 1 },
  emptyText: { marginTop: 8, fontSize: 13 },
  txCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  txIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txTitle: { fontSize: 14, fontWeight: 'bold' },
  txDate: { fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 20, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalSub: { fontSize: 12, marginTop: 2, marginBottom: 16 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, marginBottom: 12, fontSize: 14 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontWeight: 'bold', fontSize: 14 },
  submitBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});
