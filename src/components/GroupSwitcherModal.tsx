import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Avatar, Chip, ROLE_LABEL, T } from '../ui';

export const GroupSwitcherModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { group, userMemberships, switchActiveGroup } = useAuth();
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={onClose} accessibilityLabel="Close" />
      <View style={{ backgroundColor: colors.page, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 22, paddingBottom: 40, maxHeight: '75%' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T v="display">Your groups</T>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
            <Ionicons name="close" size={26} color={colors.ink2} />
          </Pressable>
        </View>
        <T v="small" tone="ink2" style={{ marginTop: 6, marginBottom: 16 }}>Everything in the app shows the group you pick.</T>
        <ScrollView>
          <View style={{ gap: 10 }}>
            {userMemberships.map((m) => {
              const ch = m.chamas_v2;
              if (!ch) return null;
              const on = ch.id === group?.id;
              return (
                <Pressable
                  key={ch.id}
                  onPress={() => { switchActiveGroup(ch.id); onClose(); }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, borderWidth: on ? 2 : 1, borderColor: on ? colors.brand : colors.line, backgroundColor: on ? colors.tint : colors.surface, opacity: pressed ? 0.8 : 1 })}
                >
                  <Avatar name={ch.name} tone={on ? 'mint' : 'sage'} size={44} />
                  <View style={{ flex: 1 }}>
                    <T v="bodyStrong" numberOfLines={1}>{ch.name}</T>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      <Chip kind="neutral" label={ROLE_LABEL[m.role] ?? m.role} />
                      {m.status === 'pending' ? <Chip kind="late" label="Waiting for approval" /> : null}
                    </View>
                  </View>
                  {on ? <Ionicons name="checkmark-circle" size={24} color={colors.brand} /> : null}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};
