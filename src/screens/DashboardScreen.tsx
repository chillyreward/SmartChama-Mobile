import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { session, member, group, refreshAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data States
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [myContributionsSum, setMyContributionsSum] = useState<number>(0);
  const [activeLoansCount, setActiveLoansCount] = useState<number>(0);
  const [activeLoansTotal, setActiveLoansTotal] = useState<number>(0);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = member?.profiles?.full_name?.split(' ')[0] || 'Member';

  const fetchDashboardData = async () => {
    if (!group?.id || !member?.id || !session?.user?.id) {
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

      if (contribs) {
        const sum = contribs.reduce((acc, c) => acc + Number(c.amount || 0), 0);
        setMyContributionsSum(sum);
      }

      // 3. Fetch Active Loans
      const { data: loans } = await supabase
        .from('loans_v2')
        .select('amount')
        .eq('membership_id', member.id)
        .eq('status', 'active');

      if (loans) {
        setActiveLoansCount(loans.length);
        const sumLoans = loans.reduce((acc, l) => acc + Number(l.amount || 0), 0);
        setActiveLoansTotal(sumLoans);
      }

      // 4. Fetch Unread Notifications
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', session.user.id)
        .eq('read', false);

      setUnreadNotifications(count || 0);

      // 5. Fetch Recent Transactions
      const { data: txs } = await supabase
        .from('transactions_v2')
        .select('*')
        .eq('chama_id', group.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (txs) {
        setRecentTransactions(txs);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [group?.id, member?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAuth();
    await fetchDashboardData();
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString('en-KE', { maximumFractionDigits: 0 });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.skeletonContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Section 1: Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {firstName} 👋
            </Text>
            <Text style={styles.chamaSubtitle}>{group?.name || 'SmartChama Group'}</Text>
          </View>

          <TouchableOpacity style={styles.bellButton}>
            <Text style={{ fontSize: 22 }}>🔔</Text>
            {unreadNotifications > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* Section 2: Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Chama Balance</Text>
          <Text style={styles.balanceAmount}>KES {formatCurrency(walletBalance)}</Text>
          <View style={styles.balanceFooter}>
            <Text style={styles.balanceSubtext}>🔒 Vault Encrypted Wallet</Text>
            <Text style={styles.balanceSubtext}>Role: {member?.role || 'Member'}</Text>
          </View>
        </View>

        {/* Section 3: Quick Actions Row */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('Contribute')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E0F2FE' }]}>
              <Text style={{ fontSize: 24 }}>💳</Text>
            </View>
            <Text style={styles.actionLabel}>Contribute</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('Loans')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Text style={{ fontSize: 24 }}>🏦</Text>
            </View>
            <Text style={styles.actionLabel}>Request Loan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}>
              <Text style={{ fontSize: 24 }}>💸</Text>
            </View>
            <Text style={styles.actionLabel}>Send Money</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: '#F3E8FF' }]}>
              <Text style={{ fontSize: 24 }}>📄</Text>
            </View>
            <Text style={styles.actionLabel}>Statement</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Section 4: Stats Grid (2x2) */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          {/* Card 1: My Contributions */}
          <View style={styles.statCard}>
            <Text style={styles.statCardTitle}>MY SAVINGS</Text>
            <Text style={styles.statCardValue}>KES {formatCurrency(myContributionsSum)}</Text>
            <Text style={styles.statCardSub}>Confirmed Payments</Text>
          </View>

          {/* Card 2: Trust Score */}
          <View style={styles.statCard}>
            <Text style={styles.statCardTitle}>TRUST SCORE</Text>
            <Text style={[styles.statCardValue, { color: colors.primary }]}>
              {member?.trust_score || 100} / 100
            </Text>
            <Text style={styles.statCardSub}>⭐ High Credibility</Text>
          </View>

          {/* Card 3: Active Loans */}
          <View style={styles.statCard}>
            <Text style={styles.statCardTitle}>ACTIVE LOANS</Text>
            <Text style={styles.statCardValue}>
              {activeLoansCount > 0 ? `KES ${formatCurrency(activeLoansTotal)}` : 'None'}
            </Text>
            <Text style={styles.statCardSub}>
              {activeLoansCount} Active Loan{activeLoansCount === 1 ? '' : 's'}
            </Text>
          </View>

          {/* Card 4: Next Contribution */}
          <View style={styles.statCard}>
            <Text style={styles.statCardTitle}>NEXT DUE</Text>
            <Text style={styles.statCardValue}>
              KES {formatCurrency(group?.contribution_amount || 1000)}
            </Text>
            <Text style={styles.statCardSub}>Due End of Month</Text>
          </View>
        </View>

        {/* Section 5: Recent Transactions */}
        <View style={styles.txHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('More')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {recentTransactions.length > 0 ? (
          recentTransactions.map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txIconBox}>
                <Text style={{ fontSize: 20 }}>
                  {tx.type === 'contribution' ? '📥' : '📤'}
                </Text>
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txTitle}>{tx.description || tx.type}</Text>
                <Text style={styles.txDate}>
                  {new Date(tx.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  { color: tx.type === 'contribution' ? colors.primary : '#EF4444' },
                ]}
              >
                {tx.type === 'contribution' ? '+' : '-'} KES {formatCurrency(tx.amount)}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyTxBox}>
            <Text style={styles.emptyTxText}>No recent transactions recorded</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  skeletonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary.light,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  chamaSubtitle: {
    fontSize: 14,
    color: colors.textSecondary.light,
    marginTop: 2,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceLabel: {
    color: '#DCFCE7',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  balanceSubtext: {
    color: '#F0FDF4',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  actionItem: {
    alignItems: 'center',
    marginRight: 18,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.light,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.card.light,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  statCardTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary.light,
    letterSpacing: 0.5,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginVertical: 6,
  },
  statCardSub: {
    fontSize: 11,
    color: colors.textSecondary.light,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  txIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.light,
  },
  txDate: {
    fontSize: 12,
    color: colors.textSecondary.light,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyTxBox: {
    backgroundColor: colors.card.light,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  emptyTxText: {
    color: colors.textSecondary.light,
    fontSize: 13,
  },
});
