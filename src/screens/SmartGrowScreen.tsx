import React from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { Chip, Empty, Loading, Money, Notice, Panel, Row, Screen, SectionTitle, T, formatKsh, shortDate, type ChipKind } from '../ui';

const RISK: Record<string, [ChipKind, string]> = {
  low: ['paid', 'Low risk'],
  medium: ['late', 'Medium risk'],
  high: ['failed', 'Higher risk'],
};

export const SmartGrowScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { group } = useAuth();
  const { colors } = useTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['smartgrow', group?.id],
    enabled: !!group?.id,
    queryFn: async () => {
      const [products, investments, wallet] = await Promise.all([
        supabase.from('smartgrow_products').select('*').eq('is_active', true).order('risk_level'),
        supabase.from('smartgrow_investments').select('*, smartgrow_products(name, provider)').eq('chama_id', group!.id).order('created_at', { ascending: false }),
        supabase.from('wallets').select('balance, invested').eq('chama_id', group!.id).maybeSingle(),
      ]);
      return { products: products.data ?? [], investments: investments.data ?? [], wallet: wallet.data };
    },
  });

  const active = (data?.investments ?? []).filter((i: any) => i.status === 'active');
  const total = active.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

  return (
    <Screen
      title="SmartGrow"
      subtitle="Regulated places your group can put money it doesn't need yet. Officials record each investment so everyone can see it."
      onBack={() => navigation.goBack()}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {isLoading || !data ? <Loading /> : (
        <>
          <Panel tone="forest" style={{ padding: 22, borderRadius: 28 }}>
            <T v="small" tone="onForest3">Invested by the group</T>
            <Money value={total} v="moneyLg" tone="mint" style={{ marginTop: 4 }} />
            <T v="small" tone="onForest2" style={{ marginTop: 4 }}>
              In {active.length} active {active.length === 1 ? 'investment' : 'investments'}. {formatKsh(data.wallet?.balance ?? 0)} still in the group wallet.
            </T>
          </Panel>

          <SectionTitle>Your group&apos;s investments</SectionTitle>
          <Panel style={{ paddingVertical: data.investments.length ? 4 : 18 }}>
            {data.investments.length === 0 ? (
              <Empty icon="trending-up-outline" title="Nothing invested yet">When an official records an investment, it shows here with the amount and date.</Empty>
            ) : data.investments.map((inv: any, i: number) => (
              <Row
                key={inv.id}
                icon="trending-up-outline"
                title={inv.smartgrow_products?.name ?? 'Investment'}
                subtitle={`${inv.smartgrow_products?.provider ?? ''}${inv.created_at ? `, ${shortDate(inv.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`}
                right={<Money value={inv.amount} />}
                last={i === data.investments.length - 1}
              />
            ))}
          </Panel>

          <SectionTitle>Options</SectionTitle>
          <View style={{ gap: 12 }}>
            {data.products.map((p: any) => {
              const [kind, label] = RISK[p.risk_level] ?? RISK.low;
              return (
                <Panel key={p.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <T v="bodyStrong">{p.name}</T>
                      <T v="caption" tone="ink2" style={{ marginTop: 2 }}>{p.provider}{p.regulatory_body ? `, regulated by ${p.regulatory_body}` : ''}</T>
                    </View>
                    <Chip kind={kind} label={label} />
                  </View>
                  <T v="display" tone="brand" style={{ marginTop: 12 }}>{p.expected_return_min}–{p.expected_return_max}%</T>
                  <T v="caption" tone="ink3">a year, as published by the provider</T>
                  <View style={{ flexDirection: 'row', gap: 24, marginTop: 12 }}>
                    <View><T v="caption" tone="ink3">From</T><T v="smallStrong">{formatKsh(p.min_amount)}</T></View>
                    <View><T v="caption" tone="ink3">Money back in</T><T v="smallStrong">{p.liquidity_days} days</T></View>
                  </View>
                  {p.description ? <T v="small" tone="ink2" style={{ marginTop: 12 }}>{p.description}</T> : null}
                </Panel>
              );
            })}
          </View>

          <View style={{ marginTop: 16 }}>
            <Notice tone="info">Akibora doesn&apos;t hold the group&apos;s money or give investment advice. Returns are what providers publish, not a promise.</Notice>
          </View>
          <T v="caption" tone="ink3" style={{ marginTop: 12, color: colors.ink3 }}>Officials record new investments on the Akibora website.</T>
        </>
      )}
    </Screen>
  );
};
