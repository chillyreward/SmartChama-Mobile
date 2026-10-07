import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../components/EmptyState';
import { integrations } from '../integrations';
import { allowSensitiveAction } from '../security/biometric';
import { useSecureScreen } from '../security/useSecureScreen';
import { watchPayment } from '../lib/paymentStatus';
import { logger } from '../lib/logger';

// What the member still owes: principal + flat interest - repaid so far
const amountOwed = (loan: any) =>
  Math.max(0, Math.ceil(Number(loan.amount || 0) * (1 + Number(loan.interest_rate || 0) / 100) - Number(loan.total_repaid || 0)));


export const LoansScreen: React.FC = () => {
  const { session, member, group, refreshAuth } = useAuth();
  const { isDark } = useTheme();

  useSecureScreen('loans');
  const cancelWatch = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelWatch.current?.(), []);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Loans State
  const [loans, setLoans] = useState<any[]>([]);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [pastLoans, setPastLoans] = useState<any[]>([]);

  // Summary Metrics
  const [availableCredit, setAvailableCredit] = useState<number>(0);
  const [totalOutstanding, setTotalOutstanding] = useState<number>(0);

  // Request Loan Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [loanAmount, setLoanAmount] = useState('');
  const [purpose, setPurpose] = useState('Business');
  const [durationMonths, setDurationMonths] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  // Repayment Modal State
  const [repayModalVisible, setRepayModalVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayPhone, setRepayPhone] = useState('');
  const [stkStatus, setStkStatus] = useState<'idle' | 'sending' | 'waiting' | 'success'>('idle');

  const fetchLoansData = async () => {
    if (!member?.id || !group?.id) {
      setLoading(false);
      return;
    }

    try {
      // 1. Calculate Available Credit based on trust score
      const trustScore = member.trust_score || 100;
      const creditLimit = Math.max(5000, trustScore * 500);

      // 2. Query loans
      const { data, error } = await supabase
        .from('loans_v2')
        .select('*')
        .eq('membership_id', member.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items = data || [];
      setLoans(items);

      const active = items.filter((l) => ['pending', 'approved', 'active', 'overdue'].includes(l.status));
      const past = items.filter((l) => ['repaid', 'rejected', 'defaulted'].includes(l.status));

      setActiveLoans(active);
      setPastLoans(past);

      // Calculate total active balance
      const activeSum = active
        .filter((l) => l.status === 'active' || l.status === 'overdue')
        .reduce((sum, l) => sum + amountOwed(l), 0);

      setTotalOutstanding(activeSum);
      setAvailableCredit(Math.max(0, creditLimit - activeSum));

      if (member.profiles?.phone_number) {
        setRepayPhone(member.profiles.phone_number);
      }
    } catch (err) {
      logger.error('Error fetching loans', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLoansData();
  }, [member?.id, group?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAuth();
    await fetchLoansData();
  };

  // Flat interest set by the chama (Loans settings on the web admin)
  const parsedAmount = Number(loanAmount) || 0;
  const interestPercent = Number((group as any)?.loan_interest_rate ?? 10);
  const interestRate = interestPercent / 100;
  const calculatedInterest = parsedAmount * interestRate;
  const totalRepayable = parsedAmount + calculatedInterest;
  const monthlyInstallment = durationMonths > 0 ? totalRepayable / durationMonths : 0;

  const handleRequestLoan = async () => {
    if (parsedAmount < 500) {
      Alert.alert('Invalid Amount', 'Minimum loan amount is KSh 500.');
      return;
    }

    if (parsedAmount > availableCredit) {
      Alert.alert('Credit Limit Exceeded', `Your current available credit limit is KSh ${formatCurrency(availableCredit)}.`);
      return;
    }

    setSubmitting(true);
    try {
      // Due date is set when an official approves; officials are notified by a
      // database trigger (members can't write other people's notifications).
      const { error } = await supabase.from('loans_v2').insert({
        membership_id: member?.id,
        chama_id: group?.id,
        amount: parsedAmount,
        interest_rate: interestPercent,
        repayment_months: durationMonths,
        purpose,
        status: 'pending',
      });

      if (error) throw error;

      Alert.alert('Success', 'Loan request submitted successfully! Pending admin approval.');
      setModalVisible(false);
      setLoanAmount('');
      fetchLoansData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not submit loan request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger M-Pesa Repayment STK Push
  const handleRepayMpesa = async () => {
    const numRepay = Number(repayAmount);
    if (isNaN(numRepay) || numRepay < 1) {
      Alert.alert('Invalid Amount', 'Please enter a valid repayment amount.');
      return;
    }

    if (selectedLoan && numRepay > amountOwed(selectedLoan)) {
      Alert.alert('Too much', `You only owe KSh ${formatCurrency(amountOwed(selectedLoan))} on this loan.`);
      return;
    }
    if (!(await allowSensitiveAction('Confirm to repay with M-Pesa'))) return;

    setStkStatus('sending');
    try {
      let formattedPhone = repayPhone.replace(/\s/g, '');
      if (formattedPhone.startsWith('+')) formattedPhone = formattedPhone.slice(1);
      if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
      if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

      // loan_id makes the server apply this payment to the loan, not to savings
      const { contributionId } = await integrations.mobileMoney.mpesa.requestPayment({
        phone: formattedPhone,
        amount: numRepay,
        chamaId: group!.id,
        membershipId: member!.id,
        reference: 'LoanRepay',
        loanId: selectedLoan?.id,
      });

      setStkStatus('waiting');
      cancelWatch.current?.();
      cancelWatch.current = watchPayment(contributionId, (outcome) => {
        if (outcome.status === 'confirmed') {
          setStkStatus('success');
        } else if (outcome.status === 'failed') {
          setStkStatus('idle');
          Alert.alert('Repayment not completed', outcome.reason || 'The M-Pesa payment was cancelled or failed.');
        } else {
          setStkStatus('idle');
          Alert.alert('Still waiting', "We haven't received confirmation yet. If you paid, it will show here shortly.");
        }
        fetchLoansData();
      });
    } catch (err: any) {
      setStkStatus('idle');
      Alert.alert('Repayment Error', err.message || 'Failed to initiate M-Pesa repayment.');
    }
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString('en-KE', { maximumFractionDigits: 0 });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
        return { bg: '#DCFCE7', color: '#15803D', label: 'Active' };
      case 'pending':
        return { bg: '#FEF3C7', color: '#B45309', label: 'Under Review' };
      case 'repaid':
        return { bg: '#E0F2FE', color: '#0369A1', label: 'Fully Repaid' };
      case 'overdue':
      case 'defaulted':
        return { bg: '#FEE2E2', color: '#B91C1C', label: 'Overdue' };
      default:
        return { bg: '#F3F4F6', color: '#4B5563', label: status };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chama Loans</Text>
          <Text style={styles.headerSub}>{group?.name || 'SmartChama Credit'}</Text>
        </View>

        {/* Tutorial Banner */}
        <View style={[styles.tutorialCard, { backgroundColor: isDark ? '#1E293B' : '#FEF3C7', borderColor: isDark ? '#334155' : '#FDE68A' }]}>
          <View style={styles.tutorialHeader}>
            <Ionicons name="sparkles-outline" size={20} color="#D97706" />
            <Text style={[styles.tutorialTitle, { color: isDark ? '#FDE68A' : '#92400E' }]}>
              Credit & Approval Policy
            </Text>
          </View>
          <Text style={[styles.tutorialText, { color: isDark ? '#FEF3C7' : '#78350F' }]}>
            Loan limit is dynamically computed from your Trust Score. Loans incur a 5% flat interest rate and require multi-officer approval before instant M-Pesa disbursal.
          </Text>
        </View>

        {/* Section 1: Loan Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>AVAILABLE CREDIT LIMIT</Text>
              <Text style={styles.summaryValue}>KES {formatCurrency(availableCredit)}</Text>
            </View>
            <View style={styles.creditBadge}>
              <Text style={styles.creditBadgeText}>Trust: {member?.trust_score || 100}/100</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryFooter}>
            <View>
              <Text style={styles.summarySubLabel}>Active Loan Balance:</Text>
              <Text style={styles.summarySubValue}>KES {formatCurrency(totalOutstanding)}</Text>
            </View>
            <View>
              <Text style={styles.summarySubLabel}>Active Loans:</Text>
              <Text style={styles.summarySubValue}>{activeLoans.length}</Text>
            </View>
          </View>
        </View>

        {/* Section 2: Request Loan Button */}
        <TouchableOpacity
          style={styles.requestButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.requestButtonText}>+ Request New Loan</Text>
        </TouchableOpacity>

        {/* Section 3: Active Loans */}
        <Text style={styles.sectionTitle}>Active & Pending Loans</Text>
        {activeLoans.length > 0 ? (
          activeLoans.map((item) => {
            const badge = getStatusBadge(item.status);
            return (
              <View key={item.id} style={styles.loanCard}>
                <View style={styles.loanCardHeader}>
                  <View>
                    <Text style={styles.loanAmount}>KES {formatCurrency(item.amount)}</Text>
                    <Text style={styles.loanDate}>
                      Requested:{' '}
                      {new Date(item.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>

                <View style={styles.loanDetailsGrid}>
                  <View>
                    <Text style={styles.detailLabel}>Interest Rate</Text>
                    <Text style={styles.detailValue}>{item.interest_rate ?? interestPercent}%</Text>
                  </View>
                  <View>
                    <Text style={styles.detailLabel}>Due Date</Text>
                    <Text style={styles.detailValue}>
                      {item.due_date
                        ? new Date(item.due_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : '—'}
                    </Text>
                  </View>
                </View>

                {(item.status === 'active' || item.status === 'overdue') && (
                  <TouchableOpacity
                    style={styles.repayBtn}
                    onPress={() => {
                      setSelectedLoan(item);
                      setRepayAmount(String(amountOwed(item)));
                      setStkStatus('idle');
                      setRepayModalVisible(true);
                    }}
                  >
                    <Text style={styles.repayBtnText}>Make Repayment (M-Pesa)</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        ) : (
          <EmptyState
            icon="cash-outline"
            title="No Active Loans"
            description="You do not have any active or pending loan requests."
            actionLabel="Apply for Loan"
            onAction={() => setModalVisible(true)}
          />
        )}

        {/* Section 4: Loan History */}
        <Text style={styles.sectionTitle}>Completed Loans</Text>
        {pastLoans.length > 0 ? (
          pastLoans.map((item) => {
            const badge = getStatusBadge(item.status);
            return (
              <View key={item.id} style={styles.historyRow}>
                <View style={styles.historyMain}>
                  <Text style={styles.historyAmount}>KES {formatCurrency(item.amount)}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState
            icon="checkmark-circle-outline"
            title="No History"
            description="You have no repaid or archived loan records."
          />
        )}
      </ScrollView>

      {/* REQUEST LOAN MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Chama Loan</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 14 }}>
              <Text style={styles.inputLabel}>Loan Amount (KES)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                placeholder="e.g. 5000"
                value={loanAmount}
                onChangeText={setLoanAmount}
              />

              <Text style={styles.inputLabel}>Loan Purpose</Text>
              <View style={styles.optionRow}>
                {['Business', 'Education', 'Emergency', 'Personal'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.optionChip, purpose === p && styles.optionChipActive]}
                    onPress={() => setPurpose(p)}
                  >
                    <Text style={[styles.optionText, purpose === p && styles.optionTextActive]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Repayment Period (Months)</Text>
              <View style={styles.optionRow}>
                {[1, 3, 6, 12].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.optionChip, durationMonths === m && styles.optionChipActive]}
                    onPress={() => setDurationMonths(m)}
                  >
                    <Text style={[styles.optionText, durationMonths === m && styles.optionTextActive]}>
                      {m} Mo
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Installment Breakdown Box */}
              <View style={styles.breakdownBox}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Interest (5%):</Text>
                  <Text style={styles.breakdownVal}>KES {formatCurrency(calculatedInterest)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Total Repayable:</Text>
                  <Text style={styles.breakdownVal}>KES {formatCurrency(totalRepayable)}</Text>
                </View>
                <View style={[styles.breakdownRow, { marginTop: 4 }]}>
                  <Text style={styles.breakdownLabelBold}>Monthly Installment:</Text>
                  <Text style={styles.breakdownValBold}>KES {formatCurrency(monthlyInstallment)}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={handleRequestLoan}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitModalBtnText}>Submit Loan Application</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* REPAYMENT MODAL */}
      <Modal visible={repayModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Repay Loan via M-Pesa</Text>
              <TouchableOpacity onPress={() => setRepayModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {stkStatus === 'idle' ? (
              <View style={{ gap: 14 }}>
                <Text style={styles.inputLabel}>Repayment Amount (KES)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={repayAmount}
                  onChangeText={setRepayAmount}
                />

                <Text style={styles.inputLabel}>M-Pesa Phone Number</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="phone-pad"
                  value={repayPhone}
                  onChangeText={setRepayPhone}
                />

                <TouchableOpacity style={styles.submitModalBtn} onPress={handleRepayMpesa}>
                  <Text style={styles.submitModalBtnText}>Confirm M-Pesa Repayment</Text>
                </TouchableOpacity>
              </View>
            ) : stkStatus === 'sending' || stkStatus === 'waiting' ? (
              <View style={{ alignItems: 'center', paddingVertical: 30, gap: 12 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Processing M-Pesa Push...</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary.light, textAlign: 'center' }}>
                  Check your phone for the M-Pesa prompt and enter your PIN.
                </Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 30, gap: 12 }}>
                <Text style={{ fontSize: 48 }}>✅</Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
                  Repayment Successful!
                </Text>
                <TouchableOpacity
                  style={styles.submitModalBtn}
                  onPress={() => setRepayModalVisible(false)}
                >
                  <Text style={styles.submitModalBtnText}>Done</Text>
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
  summaryCard: {
    backgroundColor: colors.card.light,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
  creditBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  creditBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primaryDark,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 14,
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summarySubLabel: {
    fontSize: 12,
    color: colors.textSecondary.light,
  },
  summarySubValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.light,
    marginTop: 2,
  },
  requestButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 12,
  },
  loanCard: {
    backgroundColor: colors.card.light,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: 12,
  },
  loanCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  loanAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  loanDate: {
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
  loanDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textSecondary.light,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.light,
    marginTop: 2,
  },
  repayBtn: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  repayBtnText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyCard: {
    backgroundColor: colors.card.light,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: 20,
  },
  emptyText: {
    color: colors.textSecondary.light,
    fontSize: 13,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
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
    maxHeight: '85%',
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
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionChip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  optionChipActive: {
    backgroundColor: '#F0FDF4',
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary.light,
  },
  optionTextActive: {
    color: colors.primaryDark,
    fontWeight: 'bold',
  },
  breakdownBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.light,
    gap: 6,
    marginVertical: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: 12,
    color: colors.textSecondary.light,
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.light,
  },
  breakdownLabelBold: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  breakdownValBold: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  submitModalBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  submitModalBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tutorialCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  tutorialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tutorialTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  tutorialText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
