import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export const TrustScoreScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { member } = useAuth();
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>AI Trust Score</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.scoreHero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.badgeCircle, { borderColor: colors.primary }]}>
            <Text style={[styles.scoreNumber, { color: colors.primary }]}>94</Text>
            <Text style={[styles.scoreMax, { color: colors.textSecondary }]}>/ 100</Text>
          </View>
          <Text style={[styles.ratingLabel, { color: colors.text }]}>Excellent Standing</Text>
          <Text style={[styles.ratingSub, { color: colors.textSecondary }]}>
            Keep contributing on time to stay in top standing with your group.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Trust Factors</Text>
        {[
          { title: 'On-Time Contributions', score: '98%', status: 'Great', icon: 'checkmark-circle' },
          { title: 'Contribution Streak', score: '100%', status: 'Perfect', icon: 'flame' },
          { title: 'Meeting Attendance', score: '90%', status: 'Good', icon: 'people' },
        ].map((factor, idx) => (
          <View key={idx} style={[styles.factorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name={factor.icon as any} size={24} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.factorTitle, { color: colors.text }]}>{factor.title}</Text>
              <Text style={[styles.factorScore, { color: colors.textSecondary }]}>{factor.score} • {factor.status}</Text>
            </View>
          </View>
        ))}
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
  scoreHero: { padding: 24, borderRadius: 20, borderWidth: 1, alignItems: 'center', marginBottom: 20 },
  badgeCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 6, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  scoreNumber: { fontSize: 32, fontWeight: 'bold' },
  scoreMax: { fontSize: 11 },
  ratingLabel: { fontSize: 18, fontWeight: 'bold' },
  ratingSub: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  factorCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  factorTitle: { fontSize: 14, fontWeight: '600' },
  factorScore: { fontSize: 12, marginTop: 2 },
});
