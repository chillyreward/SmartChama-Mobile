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
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';

import { GroupSwitcherModal } from '../components/GroupSwitcherModal';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { session, member, group, refreshAuth } = useAuth();
  const { colors, isDark } = useTheme();

  const [switcherVisible, setSwitcherVisible] = useState(false);

  const { data: dashboardData, isLoading, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['dashboardData', group?.id, member?.id],
    queryFn: async () => {
      if (!group?.id || !member?.id || !session?.user?.id) {
        return {
          walletBalance: 0,
          myContributionsSum: 0,
          unreadNotifications: 0,
          recentTransactions: [],
        };
      }

      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('chama_id', group.id)
        .maybeSingle();

      const { data: contribs } = await supabase
        .from('contributions_v2')
        .select('amount')
        .eq('membership_id', member.id)
        .eq('status', 'confirmed');

      const sumContribs = contribs?.reduce((acc, c) => acc + Number(c.amount || 0), 0) || 0;

      const { count: countNotifs } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', session.user.id)
        .eq('read', false);

      const { data: txs } = await supabase
        .from('transactions_v2')
        .select('*')
        .eq('chama_id', group.id)
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        walletBalance: Number(wallet?.balance || 0),
        myContributionsSum: sumContribs,
        unreadNotifications: countNotifs || 0,
        recentTransactions: txs || [],
      };
    },
    enabled: !!group?.id && !!member?.id,
  });

  const [refreshing, setRefreshing] = useState(false);

  const walletBalance = dashboardData?.walletBalance || 0;
  const myContributionsSum = dashboardData?.myContributionsSum || 0;
  const unreadNotifications = dashboardData?.unreadNotifications || 0;
  const recentTransactions = dashboardData?.recentTransactions || [];
  const loading = isLoading;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = member?.profiles?.full_name?.split(' ')[0] || 'Member';

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAuth();
    await refetch();
    setRefreshing(false);
  };

  const getTimeAgo = () => {
    if (!dataUpdatedAt) return null;
    const diffMinutes = Math.floor((Date.now() - dataUpdatedAt) / (1000 * 60));
    if (diffMinutes < 1) return 'Just now';
    return `${diffMinutes} min ago`;
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString('en-KE', { maximumFractionDigits: 0 });

  // Target yearly contribution goal
  const targetGoal = 50000;
  const progressPercent = Math.min(100, Math.round((myContributionsSum / targetGoal) * 100));

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.skeletonContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <GroupSwitcherModal
        visible={switcherVisible}
        onClose={() => setSwitcherVisible(false)}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Section 1: Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {getGreeting()}, {firstName} 👋
            </Text>
            <TouchableOpacity
              onPress={() => setSwitcherVisible(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}
              activeOpacity={0.7}
            >
              <Text style={[styles.chamaSubtitle, { color: colors.text, fontWeight: 'bold' }]}>
                {group?.name || 'My Chama'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.primary} />
            </TouchableOpacity>
            {getTimeAgo() && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Last updated {getTimeAgo()}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={[styles.bellButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('Alerts')}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {unreadNotifications > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* Section 2: Balance Hero Card */}
        <View style={[styles.balanceCard, { backgroundColor: isDark ? '#0F172A' : '#1E293B' }]}>
          <Text style={styles.balanceLabel}>TOTAL CHAMA BALANCE</Text>
          <Text style={styles.balanceAmount}>KES {formatCurrency(walletBalance)}</Text>
          <View style={styles.balanceFooter}>
            <View style={styles.shieldRow}>
              <Ionicons name="shield-checkmark" size={14} color="#22C55E" />
              <Text style={styles.balanceSubtext}>Vault Encrypted Wallet</Text>
            </View>
            <Text style={styles.balanceSubtext}>Role: {member?.role || 'Member'}</Text>
          </View>
        </View>

        {/* Section 3: Circular Contribution Progress Card */}
        <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.progressInfo}>
            <Text style={[styles.progressTitle, { color: colors.textSecondary }]}>ANNUAL SAVINGS GOAL</Text>
            <Text style={[styles.progressAmount, { color: colors.text }]}>KES {formatCurrency(myContributionsSum)}</Text>
            <Text style={[styles.progressSub, { color: colors.textSecondary }]}>Goal: KES {formatCurrency(targetGoal)}</Text>
          </View>

          <View style={styles.svgWrapper}>
            <Svg width="72" height="72" viewBox="0 0 100 100">
              <Circle cx="50" cy="50" r="40" stroke={isDark ? '#334155' : '#E2E8F0'} strokeWidth="10" fill="none" />
              <Circle
                cx="50"
                cy="50"
                r="40"
                stroke={colors.primary}
                strokeWidth="10"
                fill="none"
                strokeDasharray={`${251 * (progressPercent / 100)} 251`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </Svg>
            <Text style={[styles.percentText, { color: colors.primary }]}>{progressPercent}%</Text>
          </View>
        </View>

        {/* Section 4: Quick Actions Row */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.actionItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Contribute')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="card" size={22} color="#16A34A" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Contribute</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('MerryGoRound')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="sync" size={22} color="#D97706" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Merry-Go-Round</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Wallet')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="send" size={22} color="#0284C7" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Send Money</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Wallet')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="document-text" size={22} color="#9333EA" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Statement</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Section 5: Overview Metric Strip */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricStrip}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary} />
            <Text style={[styles.statCardTitle, { color: colors.textSecondary }]}>MY SAVINGS</Text>
            <Text style={[styles.statCardValue, { color: colors.text }]}>KES {formatCurrency(myContributionsSum)}</Text>
            <Text style={[styles.statCardSub, { color: colors.textSecondary }]}>Confirmed Payments</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="star-outline" size={20} color={colors.primary} />
            <Text style={[styles.statCardTitle, { color: colors.textSecondary }]}>TRUST SCORE</Text>
            <Text style={[styles.statCardValue, { color: colors.primary }]}>
              {member?.trust_score || 100} / 100
            </Text>
            <Text style={[styles.statCardSub, { color: colors.textSecondary }]}>High Credibility</Text>
          </View>
        </ScrollView>

        {/* Section 6: Recent Transactions */}
        <View style={styles.txHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>

        {recentTransactions.length === 0 ? (
          <View style={[styles.emptyTxBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="receipt-outline" size={36} color={colors.textSecondary} />
            <Text style={[styles.emptyTxText, { color: colors.textSecondary }]}>No recent group transactions found</Text>
          </View>
        ) : (
          recentTransactions.map((tx) => (
            <View key={tx.id} style={[styles.txRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View
                style={[
                  styles.txIconBox,
                  { backgroundColor: tx.type === 'contribution' ? '#DCFCE7' : '#FEE2E2' },
                ]}
              >
                <Ionicons
                  name={tx.type === 'contribution' ? 'arrow-down' : 'arrow-up'}
                  size={18}
                  color={tx.type === 'contribution' ? '#16A34A' : '#DC2626'}
                />
              </View>
              <View style={styles.txInfo}>
                <Text style={[styles.txTitle, { color: colors.text }]}>
                  {tx.description || (tx.type === 'contribution' ? 'Member Contribution' : 'Group Transaction')}
                </Text>
                <Text style={[styles.txDate, { color: colors.textSecondary }]}>
                  {new Date(tx.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  { color: tx.type === 'contribution' ? '#16A34A' : colors.text },
                ]}
              >
                {tx.type === 'contribution' ? '+' : '-'}KES {formatCurrency(Number(tx.amount))}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  skeletonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  chamaSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  balanceCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  balanceLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 6,
  },
  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  shieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  balanceSubtext: {
    color: '#CBD5E1',
    fontSize: 11,
  },
  progressCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  progressAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  progressSub: {
    fontSize: 12,
  },
  svgWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: {
    position: 'absolute',
    fontSize: 13,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 86,
    height: 86,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 10,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricStrip: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statCard: {
    width: 140,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginRight: 10,
  },
  statCardTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  statCardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statCardSub: {
    fontSize: 10,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  txDate: {
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyTxBox: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyTxText: {
    fontSize: 13,
    marginTop: 8,
  },
});
