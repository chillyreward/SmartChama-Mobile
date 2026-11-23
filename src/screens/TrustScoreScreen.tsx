import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { standing, trustBreakdown, type TrustRow } from '../lib/trust';
import { Loading, Meter, Money, Notice, Panel, Screen, SectionTitle, T } from '../ui';
import { useTheme } from '../contexts/ThemeContext';

export const TrustScoreScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { member, group } = useAuth();
  const { colors } = useTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['trust', member?.id],
    enabled: !!member?.id,
    queryFn: async () => {
      const [c, m] = await Promise.all([
        supabase.from('contributions_v2').select('created_at, amount, payment_method, mpesa_receipt').eq('membership_id', member!.id).eq('status', 'confirmed').order('created_at'),
        supabase.from('chama_memberships').select('joined_at').eq('id', member!.id).maybeSingle(),
      ]);
      return { rows: (c.data ?? []) as TrustRow[], joinedAt: m.data?.joined_at ? new Date(m.data.joined_at) : null };
    },
  });

  const b = useMemo(() => (data ? trustBreakdown(data.rows, data.joinedAt) : null), [data]);
  const score = Number(member?.trust_score ?? 0);
  const st = standing(score);

  return (
    <Screen
      title="Trust score"
      subtitle="A number from 0 to 100 that shows how reliably you save in this group. You decide who else sees it."
      onBack={() => navigation.goBack()}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {isLoading || !b ? <Loading /> : (
        <>
          <Panel tone="forest" style={{ padding: 22, borderRadius: 28 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <T v="small" tone="onForest3">{st.label}</T>
                <T v="title" tone="onForest" style={{ marginTop: 4 }}>{member?.profiles?.full_name}</T>
                <T v="small" tone="onForest2" style={{ marginTop: 6 }}>{st.note}</T>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <T v="hero" tone="mint" style={{ fontSize: 72, lineHeight: 76 }}>{score}</T>
                <T v="caption" tone="onForest3">out of 100</T>
              </View>
            </View>
            <View style={{ marginTop: 18 }}><Meter value={score} segments={30} height={26} onColor={colors.mint} offColor={colors.canopy} /></View>
          </Panel>

          <SectionTitle>Where your points come from</SectionTitle>
          <View style={{ gap: 12 }}>
            {b.parts.map((p) => (
              <Panel key={p.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <T v="bodyStrong">{p.label}</T>
                  <T v="money">{p.points}<T v="small" tone="ink3"> / {p.max}</T></T>
                </View>
                <View style={{ marginTop: 10 }}><Meter value={p.points} max={p.max} segments={p.max > 30 ? 22 : 12} height={12} /></View>
                <T v="small" tone="ink2" style={{ marginTop: 10 }}>{p.detail}</T>
              </Panel>
            ))}
          </View>

          <SectionTitle>Your record in {group?.name || 'this group'}</SectionTitle>
          <Panel>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View><T v="caption" tone="ink3">Saved</T><Money value={b.totalSaved} /></View>
              <View><T v="caption" tone="ink3">Months paid</T><T v="money">{b.paidMonths} of {b.monthsActive}</T></View>
              <View><T v="caption" tone="ink3">Streak</T><T v="money">{b.streak}</T></View>
            </View>
          </Panel>
          <View style={{ marginTop: 16 }}>
            <Notice tone="info">This is not a credit rating and no regulator oversees it. You can download it as a credit passport PDF on the Akibora website.</Notice>
          </View>
        </>
      )}
    </Screen>
  );
};
