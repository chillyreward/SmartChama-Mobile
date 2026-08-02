import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export const AnalyticsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { group } = useAuth();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalSaved: 0, activeLoans: 0, repaymentRate: 98, totalInterestEarned: 0 });

  useEffect(() => {
    async function loadData() {
      if (!group?.id) return;
      try {
        const { data: contribs } = await supabase.from('contributions_v2').select('amount').eq('chama_id', group.id).eq('status', 'confirmed');
        const sum = contribs?.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0) || 0;
        setStats(prev => ({ ...prev, totalSaved: sum }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [group?.id]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics & Insights</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>CHAMA TOTAL SAVINGS</Text>
          <Text style={[styles.cardValue, { color: colors.primary }]}>KSh {stats.totalSaved.toLocaleString('en-KE')}</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>+12.4% from last month</Text>
        </View>

        <View style={styles.grid}>
          <View style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.gridTitle, { color: colors.textSecondary }]}>Loan Repayment Rate</Text>
            <Text style={[styles.gridValue, { color: colors.text }]}>{stats.repaymentRate}%</Text>
          </View>
          <View style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.gridTitle, { color: colors.textSecondary }]}>Interest Earned</Text>
            <Text style={[styles.gridValue, { color: colors.text }]}>KSh 18,450</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>MONTHLY CONTRIBUTIONS PERFORMANCE</Text>
          <View style={styles.chartBarRow}>
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, idx) => (
              <View key={month} style={styles.barCol}>
                <View style={[styles.bar, { height: 40 + idx * 12, backgroundColor: colors.primary }]} />
                <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{month}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16 },
  card: { padding: 18, borderRadius: 16, borderWidth: 1 },
  cardTitle: { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  cardValue: { fontSize: 28, fontWeight: 'bold', marginVertical: 6 },
  cardSub: { fontSize: 12 },
  grid: { flexDirection: 'row', gap: 12, marginTop: 14 },
  gridCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1 },
  gridTitle: { fontSize: 12 },
  gridValue: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  chartBarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 130, marginTop: 16, paddingHorizontal: 8 },
  barCol: { alignItems: 'center', flex: 1 },
  bar: { width: 18, borderRadius: 6 },
  barLabel: { fontSize: 10, marginTop: 6 },
});
