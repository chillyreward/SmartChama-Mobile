import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface GroupSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

export const GroupSwitcherModal: React.FC<GroupSwitcherModalProps> = ({
  visible,
  onClose,
}) => {
  const { group, userMemberships, switchActiveGroup } = useAuth();
  const { colors, isDark } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Switch Active Chama</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Select the group context for transactions & metrics
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list}>
            {userMemberships.map((m) => {
              const ch = m.chamas_v2;
              if (!ch) return null;
              const isActive = ch.id === group?.id;

              return (
                <TouchableOpacity
                  key={ch.id}
                  style={[
                    styles.groupItem,
                    {
                      backgroundColor: isActive
                        ? isDark
                          ? '#052E16'
                          : '#ECFDF5'
                        : isDark
                        ? '#1F2937'
                        : '#F8FAFC',
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    switchActiveGroup(ch.id);
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: isActive
                          ? colors.primary
                          : isDark
                          ? '#374151'
                          : '#E2E8F0',
                      },
                    ]}
                  >
                    <Ionicons
                      name="people"
                      size={20}
                      color={isActive ? '#FFFFFF' : colors.text}
                    />
                  </View>

                  <View style={styles.groupInfo}>
                    <Text
                      style={[
                        styles.groupName,
                        { color: colors.text, fontWeight: isActive ? 'bold' : '600' },
                      ]}
                    >
                      {ch.name}
                    </Text>
                    <Text
                      style={[
                        styles.groupRole,
                        { color: isActive ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      Role: {m.role || 'Member'} • Code: {ch.group_code || 'N/A'}
                    </Text>
                  </View>

                  {isActive ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={colors.primary}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    marginVertical: 4,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 15,
  },
  groupRole: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
});
