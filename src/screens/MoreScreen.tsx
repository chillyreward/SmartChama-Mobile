import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/colors';

const extraFeatures = [
  { icon: '🐷', label: 'Merry-Go-Round', route: '' },
  { icon: '👥', label: 'Members', route: 'Members' },
  { icon: '🧾', label: 'History', route: '' },
  { icon: '📈', label: 'SmartGrow', route: '' },
  { icon: '📊', label: 'Analytics', route: '' },
  { icon: '🛡️', label: 'Trust Score', route: '' },
  { icon: '🔔', label: 'Alerts', route: '' },
  { icon: '🤝', label: 'Welfare Fund', route: '' },
  { icon: '⚙️', label: 'Settings', route: 'Profile' },
  { icon: '👤', label: 'Profile', route: 'Profile' },
];

export const MoreScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>All Features</Text>
        <Text style={styles.subtitle}>SmartChama Chama Services</Text>

        <View style={styles.grid}>
          {extraFeatures.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.gridItem}
              onPress={() => {
                if (item.route && navigation) {
                  navigation.navigate(item.route);
                }
              }}
            >
              <View style={styles.iconBox}>
                <Text style={{ fontSize: 24 }}>{item.icon}</Text>
              </View>
              <Text style={styles.itemLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutText}>🚪 Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.light,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary.light,
    marginTop: 4,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  gridItem: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  itemLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.light,
    textAlign: 'center',
  },
  signOutButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  signOutText: {
    color: '#991B1B',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
