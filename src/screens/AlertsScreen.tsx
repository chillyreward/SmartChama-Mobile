import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export const AlertsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();

  const alerts = [
    { id: '1', title: 'Monthly Contribution Due', desc: 'KSh 2,500 due by 5th of this month', date: 'Today', type: 'reminder' },
    { id: '2', title: 'Loan Approved', desc: 'Your KSh 15,000 loan was approved by Chairlady', date: 'Yesterday', type: 'success' },
    { id: '3', title: 'Merry-Go-Round Rotation', desc: 'You are next in queue for payout on July 15', date: '3 days ago', type: 'info' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications & Alerts</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons
              name={item.type === 'reminder' ? 'notifications' : item.type === 'success' ? 'checkmark-circle' : 'information-circle'}
              size={24}
              color={colors.primary}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.desc, { color: colors.textSecondary }]}>{item.desc}</Text>
              <Text style={[styles.date, { color: colors.textSecondary }]}>{item.date}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  title: { fontSize: 14, fontWeight: 'bold' },
  desc: { fontSize: 12, marginTop: 2 },
  date: { fontSize: 10, marginTop: 4 },
});
