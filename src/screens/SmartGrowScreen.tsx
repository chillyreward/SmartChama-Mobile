import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../components/EmptyState';

export const SmartGrowScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, isDark } = useTheme();

  const plans = [
    { title: 'Kenya Treasury Bills (91-Day)', rate: '15.8% p.a.', risk: 'Low Risk', icon: 'stats-chart' },
    { title: 'NSE Dividend Stock Pool', rate: '12.4% p.a.', risk: 'Medium Risk', icon: 'trending-up' },
    { title: 'Real Estate Land Syndicate', rate: '18.0% p.a.', risk: 'Growth', icon: 'business' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>SmartGrow Investments</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Tutorial Banner */}
        <View style={[styles.tutorialCard, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5', borderColor: isDark ? '#065F46' : '#A7F3D0' }]}>
          <View style={styles.tutorialHeader}>
            <Ionicons name="trending-up-outline" size={22} color={colors.primary} />
            <Text style={[styles.tutorialTitle, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
              SmartGrow Investment Engine
            </Text>
          </View>
          <Text style={[styles.tutorialText, { color: isDark ? '#D1FAE5' : '#047857' }]}>
            SmartGrow allows Chama members to propose, evaluate, and democratically vote on asset allocation plans (Government T-Bills, MMFs, Real Estate) to maximize group yield.
          </Text>
        </View>

        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>ACTIVE CHAMA PORTFOLIO</Text>
          <Text style={[styles.heroAmount, { color: colors.primary }]}>KSh 120,000</Text>
          <Text style={[styles.heroYield, { color: colors.text }]}>Estimated Annual Yield: +14.2% p.a.</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Investment Plans</Text>

        {plans.length === 0 ? (
          <EmptyState
            icon="trending-down-outline"
            title="No Active Proposals"
            description="There are currently no investment proposals open for voting in your Chama group."
          />
        ) : (
          plans.map((plan, idx) => (
            <View key={idx} style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' }]}>
                <Ionicons name={plan.icon as any} size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.planTitle, { color: colors.text }]}>{plan.title}</Text>
                <Text style={[styles.planMeta, { color: colors.textSecondary }]}>{plan.rate} • {plan.risk}</Text>
              </View>
              <TouchableOpacity style={[styles.voteBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.voteBtnText}>Vote</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
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
  tutorialCard: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  tutorialHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  tutorialTitle: { fontSize: 14, fontWeight: 'bold' },
  tutorialText: { fontSize: 12, lineHeight: 18 },
  hero: { padding: 20, borderRadius: 18, borderWidth: 1, marginBottom: 20 },
  heroSub: { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  heroAmount: { fontSize: 30, fontWeight: 'bold', marginVertical: 6 },
  heroYield: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  planCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  planTitle: { fontSize: 14, fontWeight: 'bold' },
  planMeta: { fontSize: 12, marginTop: 2 },
  voteBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  voteBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
});

