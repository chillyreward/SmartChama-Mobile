import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { Loading, Money, Panel, Screen, SectionTitle, T, formatKsh } from '../ui';

export const AnalyticsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { group, member } = useAuth();
  const { colors } = useTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['progress', group?.id, member?.id],
    enabled: !!group?.id && !!member?.id,
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 11, 1);
      const [mine, all, members] = await Promise.all([
        supabase.from('contributions_v2').select('amount, created_at').eq('membership_id', member!.id).eq('status', 'confirmed').gte('created_at', since.toISOString()),
        supabase.from('contributions_v2').select('amount').eq('chama_id', group!.id).eq('status', 'confirmed'),
        supabase.from('chama_memberships').select('id', { count: 'exact', head: true }).eq('chama_id', group!.id).eq('status', 'active'),
      ]);
      return {
        mine: mine.data ?? [],
        groupTotal: (all.data ?? []).reduce((s: number, c: any) => s + Number(c.amount || 0), 0),
        members: members.count ?? 0,
      };
    },
  });

  const months = useMemo(() => {
    const now = new Date();
    const out = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-KE', { month: 'narrow' }), name: d.toLocaleDateString('en-KE', { month: 'long' }), total: 0 };
    });
    (data?.mine ?? []).forEach((c: any) => {
      const d = new Date(c.created_at);
      const m = out.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.total += Number(c.amount || 0);
    });
    return out;
  }, [data?.mine]);

  const year = months.reduce((s, m) => s + m.total, 0);
  const paid = months.filter((m) => m.total > 0).length;
  const max = Math.max(1, ...months.map((m) => m.total));
  const best = months.reduce((a, b) => (b.total > a.total ? b : a), months[0]);

  return (
    <Screen title="Your progress" subtitle="What you've put into the group over the last twelve months." onBack={() => navigation.goBack()} refreshing={isRefetching} onRefresh={refetch}>
      {isLoading || !data ? <Loading /> : (
        <>
          <Panel tone="forest" style={{ padding: 22, borderRadius: 28 }}>
            <T v="small" tone="onForest3">Last 12 months</T>
            <Money value={year} v="moneyLg" tone="mint" style={{ marginTop: 4 }} />
            <T v="small" tone="onForest2">You paid in {paid} of 12 months</T>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 120, marginTop: 20 }}>
              {months.map((m, i) => (
                <View key={m.key} style={{ flex: 1, alignItems: 'center', gap: 6 }} accessibilityLabel={`${m.name}: ${formatKsh(m.total)}`}>
                  <View style={{ width: '100%', height: Math.max(4, (m.total / max) * 92), borderRadius: 4, backgroundColor: i === 11 ? colors.mint : m.total > 0 ? colors.moss : colors.canopy }} />
                  <T v="caption" tone="onForest3">{m.label}</T>
                </View>
              ))}
            </View>
          </Panel>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <Panel style={{ flex: 1 }}>
              <T v="caption" tone="ink2">Best month</T>
              <T v="title" style={{ marginTop: 6 }}>{best.total > 0 ? best.name : 'None yet'}</T>
              {best.total > 0 ? <T v="small" tone="ink2">{formatKsh(best.total)}</T> : null}
            </Panel>
            <Panel style={{ flex: 1 }}>
              <T v="caption" tone="ink2">Monthly average</T>
              <T v="title" style={{ marginTop: 6 }}>{formatKsh(paid ? year / paid : 0)}</T>
              <T v="small" tone="ink2">in months you paid</T>
            </Panel>
          </View>

          <SectionTitle>The whole group</SectionTitle>
          <Panel tone="sage">
            <T v="small" tone="sageInk">Saved together since the group started</T>
            <Money value={data.groupTotal} v="display" tone="sageInk" style={{ marginTop: 4 }} />
            <T v="small" tone="sageInk" style={{ marginTop: 4 }}>{data.members} active {data.members === 1 ? 'member' : 'members'}</T>
          </Panel>
        </>
      )}
    </Screen>
  );
};
