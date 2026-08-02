import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'information-circle-outline',
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#0F172A' : '#F0FDF4',
          borderColor: isDark ? '#1E293B' : '#DCFCE7',
        },
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: isDark ? '#1E293B' : '#DCFCE7' },
        ]}
      >
        <Ionicons name={icon} size={32} color={colors.primary} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>

      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
