import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { Empty, Loading, Panel, Row, Screen, T, shortDate, type IconName } from '../ui';

const ICON: Record<string, IconName> = {
  contribution: 'checkmark-circle-outline',
  payment: 'checkmark-circle-outline',
  reminder: 'alarm-outline',
  new_member: 'person-add-outline',
  welfare: 'heart-outline',
  payout: 'sync-outline',
  penalty: 'alert-circle-outline',
  withdrawal: 'wallet-outline',
};

export const AlertsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { session } = useAuth();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const uid = session?.user?.id;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from('notifications').select('*').eq('profile_id', uid!).order('created_at', { ascending: false }).limit(60);
      return data ?? [];
    },
  });

  // Opening the list marks everything read, like on the web
  useEffect(() => {
    if (!uid || !data?.some((n: any) => !n.read)) return;
    supabase.from('notifications').update({ read: true }).eq('profile_id', uid).eq('read', false).then(() => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    });
  }, [uid, data, qc]);

  return (
    <Screen title="Notifications" onBack={() => navigation.goBack()} refreshing={isRefetching} onRefresh={refetch}>
      {isLoading ? <Loading /> : !data?.length ? (
        <Panel><Empty icon="notifications-outline" title="Nothing new">Payment confirmations, reminders and decisions from your officials show here.</Empty></Panel>
      ) : (
        <Panel style={{ paddingVertical: 4 }}>
          {data.map((n: any, i: number) => (
            <Row
              key={n.id}
              icon={ICON[n.type] ?? 'notifications-outline'}
              iconTone={n.read ? 'raised' : 'mint'}
              title={
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <T v="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{n.title}</T>
                  <T v="caption" tone="ink3">{shortDate(n.created_at)}</T>
                </View>
              }
              subtitle={n.message}
              last={i === data.length - 1}
            />
          ))}
        </Panel>
      )}
      <T v="caption" tone="ink3" style={{ marginTop: 12, color: colors.ink3 }}>Showing your latest 60.</T>
    </Screen>
  );
};
