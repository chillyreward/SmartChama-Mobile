import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../components/EmptyState';

export const WelfareScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, isDark } = useTheme();

  const claims = [
    { name: 'Grace M.', reason: 'Medical Hospitalization Support', status: 'Approved', amount: 'KSh 10,000' },
    { name: 'John K.', reason: 'Bereavement Fund Support', status: 'Disbursed', amount: 'KSh 15,000' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Welfare Emergency Fund</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Tutorial Banner */}
        <View style={[styles.tutorialCard, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', borderColor: isDark ? '#312E81' : '#C7D2FE' }]}>
          <View style={styles.tutorialHeader}>
            <Ionicons name="heart-circle-outline" size={22} color="#6366F1" />
            <Text style={[styles.tutorialTitle, { color: isDark ? '#C7D2FE' : '#3730A3' }]}>
              Welfare Policy Overview
            </Text>
          </View>
          <Text style={[styles.tutorialText, { color: isDark ? '#E0E7FF' : '#4338CA' }]}>
            The Welfare Fund is reserved for emergency claims (e.g. medical emergencies, bereavement). Members submit claims which are reviewed and disbursed by group officers.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>TOTAL WELFARE POOL</Text>
          <Text style={[styles.cardAmount, { color: colors.primary }]}>KSh 45,000</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>Covers medical emergencies, bereavement & life events for members.</Text>
        </View>

        <TouchableOpacity style={[styles.claimBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="heart" size={20} color="#FFFFFF" />
          <Text style={styles.claimBtnText}>Submit Emergency Claim</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Claims & Grants</Text>

        {claims.length === 0 ? (
          <EmptyState
            icon="heart-dislike-outline"
            title="No Welfare Claims"
            description="There are currently no active or historical emergency welfare claims recorded for your Chama group."
          />
        ) : (
          claims.map((claim, idx) => (
            <View key={idx} style={[styles.claimCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.claimName, { color: colors.text }]}>{claim.name}</Text>
                <Text style={[styles.claimReason, { color: colors.textSecondary }]}>{claim.reason}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.claimAmount, { color: colors.primary }]}>{claim.amount}</Text>
                <Text style={[styles.claimStatus, { color: colors.textSecondary }]}>{claim.status}</Text>
              </View>
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
  card: { padding: 20, borderRadius: 18, borderWidth: 1, marginBottom: 16 },
  cardSub: { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  cardAmount: { fontSize: 28, fontWeight: 'bold', marginVertical: 6 },
  cardText: { fontSize: 12, marginTop: 4 },
  claimBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, marginBottom: 20 },
  claimBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  claimCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  claimName: { fontSize: 14, fontWeight: 'bold' },
  claimReason: { fontSize: 12, marginTop: 2 },
  claimAmount: { fontSize: 14, fontWeight: 'bold' },
  claimStatus: { fontSize: 11, marginTop: 2 },
});

