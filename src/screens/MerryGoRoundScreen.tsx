import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../components/EmptyState';

export const MerryGoRoundScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, isDark } = useTheme();

  const scheduleItems = [
    { position: 1, name: 'Wanjiku N.', status: 'Received (Jun 15)', isMe: false },
    { position: 2, name: 'You (Mary W.)', status: 'Next Recipient (Jul 15)', isMe: true },
    { position: 3, name: 'Peter M.', status: 'Scheduled (Aug 15)', isMe: false },
    { position: 4, name: 'Sarah K.', status: 'Scheduled (Sep 15)', isMe: false },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Merry-Go-Round</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Tutorial Banner */}
        <View style={[styles.tutorialCard, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5', borderColor: isDark ? '#065F46' : '#A7F3D0' }]}>
          <View style={styles.tutorialHeader}>
            <Ionicons name="refresh-circle-outline" size={22} color={colors.primary} />
            <Text style={[styles.tutorialTitle, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
              How Merry-Go-Round Works
            </Text>
          </View>
          <Text style={[styles.tutorialText, { color: isDark ? '#D1FAE5' : '#047857' }]}>
            Merry-Go-Round (Table Banking) automatically rotates monthly group savings payouts. Every cycle, members contribute fixed funds and one recipient takes home the full pot.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>CURRENT CYCLE POT</Text>
          <Text style={[styles.cardAmount, { color: colors.primary }]}>KSh 25,000</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>
            Payout Date: <Text style={{ fontWeight: 'bold', color: colors.text }}>July 15, 2026</Text>
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Rotation Schedule</Text>

        {scheduleItems.length === 0 ? (
          <EmptyState
            icon="sync-outline"
            title="No Active Rotation"
            description="Your Chama group administrator has not set up a Merry-Go-Round rotation schedule yet."
          />
        ) : (
          scheduleItems.map((item) => (
            <View
              key={item.position}
              style={[
                styles.row,
                { backgroundColor: item.isMe ? (isDark ? '#052E16' : '#DCFCE7') : colors.card, borderColor: item.isMe ? colors.primary : colors.border }
              ]}
            >
              <View style={[styles.numBox, { backgroundColor: item.isMe ? colors.primary : (isDark ? '#374151' : '#E2E8F0') }]}>
                <Text style={{ color: item.isMe ? '#FFFFFF' : colors.text, fontWeight: 'bold' }}>#{item.position}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.name, { color: colors.text, fontWeight: item.isMe ? 'bold' : '600' }]}>{item.name}</Text>
                <Text style={[styles.status, { color: item.isMe ? colors.primary : colors.textSecondary }]}>{item.status}</Text>
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
  card: { padding: 20, borderRadius: 18, borderWidth: 1, marginBottom: 20 },
  cardSub: { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  cardAmount: { fontSize: 28, fontWeight: 'bold', marginVertical: 6 },
  cardText: { fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  numBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14 },
  status: { fontSize: 12, marginTop: 2 },
});

