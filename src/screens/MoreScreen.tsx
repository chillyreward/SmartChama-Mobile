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
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { features } from '../config/features';

interface FeatureItem {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  route: string;
  /** Hidden unless this feature flag is on */
  flag?: boolean;
}

const allFeatures: FeatureItem[] = [
  { iconName: 'chatbubbles', label: 'Group Chat', subtitle: 'Discussions & notices', route: 'Chat', flag: features.groupChat },
  { iconName: 'refresh-circle', label: 'Merry-Go-Round', subtitle: 'Rotating payout pot', route: 'MerryGoRound', flag: features.merryGoRound },
  { iconName: 'people', label: 'Members', subtitle: 'Group member roster', route: 'Members' },
  { iconName: 'receipt', label: 'History', subtitle: 'All transaction logs', route: 'History' },
  { iconName: 'trending-up', label: 'SmartGrow', subtitle: 'Investment proposals', route: 'SmartGrow', flag: features.smartGrow },
  { iconName: 'bar-chart', label: 'Analytics', subtitle: 'Savings & contribution charts', route: 'Analytics' },
  { iconName: 'shield-checkmark', label: 'Trust Score', subtitle: 'Member credibility', route: 'TrustScore' },
  { iconName: 'notifications', label: 'Alerts', subtitle: 'Group notifications', route: 'Alerts' },
  { iconName: 'heart', label: 'Welfare Fund', subtitle: 'Emergency support claims', route: 'Welfare', flag: features.welfare },
  { iconName: 'person-circle', label: 'Profile & settings', subtitle: 'Personal details, security, delete account', route: 'Profile' },
];

const extraFeatures = allFeatures.filter((f) => f.flag !== false);

export const MoreScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { signOut } = useAuth();
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: colors.text }]}>All Services</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Akibora Chama Modules & Tools</Text>

        <View style={styles.grid}>
          {extraFeatures.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.gridItem,
                { backgroundColor: colors.card, borderColor: colors.border }
              ]}
              onPress={() => {
                if (item.route && navigation) {
                  navigation.navigate(item.route);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC' }]}>
                <Ionicons name={item.iconName} size={22} color={colors.primary} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[
            styles.signOutButton, 
            { backgroundColor: isDark ? '#450A0A' : '#FEF2F2', borderColor: isDark ? '#7F1D1D' : '#FECACA' }
          ]} 
          onPress={signOut}
        >
          <Ionicons name="log-out-outline" size={20} color={isDark ? '#FCA5A5' : '#991B1B'} />
          <Text style={[styles.signOutText, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>Sign Out</Text>
        </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
  },
  grid: {
    gap: 10,
    marginBottom: 24,
  },
  gridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    height: 50,
    marginTop: 10,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});

