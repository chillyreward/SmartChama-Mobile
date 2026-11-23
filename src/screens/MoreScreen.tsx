import React from 'react';
import { View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, type ThemeMode } from '../contexts/ThemeContext';
import { features } from '../config/features';
import { Avatar, Button, Panel, ROLE_LABEL, Row, Screen, SectionTitle, Segmented, T, type IconName } from '../ui';

type Item = { icon: IconName; label: string; subtitle: string; route: string; flag?: boolean; tone?: 'sage' | 'lavender' | 'mint' };

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: 'Your money',
    items: [
      { icon: 'receipt-outline', label: 'Transactions', subtitle: 'Every payment in and out of the group', route: 'History' },
      { icon: 'shield-checkmark-outline', label: 'Trust score', subtitle: 'How your record adds up', route: 'TrustScore' },
      { icon: 'bar-chart-outline', label: 'Your progress', subtitle: 'Savings month by month', route: 'Analytics' },
    ],
  },
  {
    title: 'The group',
    items: [
      { icon: 'sync-outline', label: 'Merry-go-round', subtitle: 'The order and your turn', route: 'MerryGoRound', flag: features.merryGoRound, tone: 'lavender' },
      { icon: 'heart-outline', label: 'Welfare fund', subtitle: 'Ask for support', route: 'Welfare', flag: features.welfare, tone: 'lavender' },
      { icon: 'trending-up-outline', label: 'SmartGrow', subtitle: 'Where the group invests', route: 'SmartGrow', flag: features.smartGrow },
      { icon: 'people-outline', label: 'Members', subtitle: 'Who is in the group', route: 'Members' },
      { icon: 'chatbubble-outline', label: 'Group chat', subtitle: 'Talk to everyone', route: 'Chat', flag: features.groupChat },
    ],
  },
  {
    title: 'You',
    items: [
      { icon: 'notifications-outline', label: 'Notifications', subtitle: 'Confirmations and reminders', route: 'Alerts' },
      { icon: 'settings-outline', label: 'Profile and settings', subtitle: 'Details, security, delete account', route: 'Profile' },
    ],
  },
];

export const MoreScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { signOut, member, group } = useAuth();
  const { mode, setThemeMode } = useTheme();
  const name = member?.profiles?.full_name || 'Your profile';

  return (
    <Screen title="Everything" tabBarSpace>
      <Panel tone="sage" onPress={() => navigation?.navigate('Profile')} accessibilityLabel="Open your profile" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={name} size={52} tone="forest" />
        <View style={{ flex: 1 }}>
          <T v="title" tone="sageInk" numberOfLines={1}>{name}</T>
          <T v="small" tone="sageInk" numberOfLines={1}>{ROLE_LABEL[member?.role ?? 'member'] ?? member?.role} in {group?.name ?? 'your group'}</T>
        </View>
      </Panel>

      {SECTIONS.map((sec) => {
        const items = sec.items.filter((i) => i.flag !== false);
        return (
          <View key={sec.title}>
            <SectionTitle>{sec.title}</SectionTitle>
            <Panel style={{ paddingVertical: 4 }}>
              {items.map((it, i) => (
                <Row key={it.route} icon={it.icon} iconTone={it.tone ?? 'sage'} title={it.label} subtitle={it.subtitle} onPress={() => navigation?.navigate(it.route)} last={i === items.length - 1} />
              ))}
            </Panel>
          </View>
        );
      })}

      <SectionTitle>Appearance</SectionTitle>
      <Segmented<ThemeMode>
        value={mode}
        onChange={setThemeMode}
        items={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'Phone setting' }]}
      />

      <Button label="Sign out" variant="danger" icon="log-out-outline" size="lg" style={{ marginTop: 28 }} onPress={signOut} />
    </Screen>
  );
};
