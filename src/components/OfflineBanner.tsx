import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

export const OfflineBanner: React.FC = () => {
  const netInfo = useNetInfo();

  if (netInfo.isConnected !== false) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
      <Text style={styles.text}>You're offline — Showing cached data</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
