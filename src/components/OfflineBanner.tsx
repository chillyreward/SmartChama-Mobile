import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { fixed } from '../theme/colors';
import { fonts } from '../theme/fonts';

export const OfflineBanner: React.FC = () => {
  const netInfo = useNetInfo();
  if (netInfo.isConnected !== false) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={16} color={fixed.forest} />
      <Text style={styles.text}>You're offline. Showing what was last loaded.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: { backgroundColor: fixed.amber, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 12 },
  text: { color: fixed.forest, fontSize: 13, fontFamily: fonts.semibold },
});
