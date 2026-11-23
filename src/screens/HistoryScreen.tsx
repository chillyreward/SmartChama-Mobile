import React, { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { TX_LABEL } from './WalletScreen';
import { Empty, Loading, Panel, Row, Screen, Segmented, T, formatKsh, shortDate } from '../ui';

const INCOMING = ['contribution', 'repayment', 'loan_repayment', 'penalty', 'interest', 'deposit', 'smartgrow_return'];
type Filter = 'all' | 'in' | 'out';

export const HistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { group } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['history', group?.id],
    enabled: !!group?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions_v2')
        .select('*, chama_memberships(profiles(full_name))')
        .eq('chama_id', group!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const rows = (data ?? []).filter((t: any) => filter === 'all' || (filter === 'in') === INCOMING.includes(t.type));

  return (
    <Screen title="Transactions" subtitle="Every movement of the group's money, newest first." onBack={() => navigation.goBack()} refreshing={isRefetching} onRefresh={refetch}>
      <Segmented<Filter> value={filter} onChange={setFilter} items={[{ value: 'all', label: 'All' }, { value: 'in', label: 'Money in' }, { value: 'out', label: 'Money out' }]} />
      <View style={{ height: 14 }} />
      {isLoading ? <Loading /> : (
        <Panel style={{ paddingVertical: rows.length ? 4 : 18 }}>
          {rows.length === 0 ? (
            <Empty icon="receipt-outline" title="Nothing here yet">Transactions appear as members pay and officials release money.</Empty>
          ) : rows.map((tx: any, i: number) => {
            const inflow = INCOMING.includes(tx.type);
            const who = tx.chama_memberships?.profiles?.full_name;
            return (
              <Row
                key={tx.id}
                icon={inflow ? 'arrow-down' : 'arrow-up'}
                iconTone={inflow ? 'mint' : 'raised'}
                title={tx.description || TX_LABEL[tx.type] || String(tx.type).replace(/_/g, ' ')}
                subtitle={
                  <T v="caption" tone="ink2" style={{ marginTop: 2 }}>
                    {[who, shortDate(tx.created_at, { day: 'numeric', month: 'short', year: 'numeric' })].filter(Boolean).join(', ')}
                    {tx.reference ? <T v="mono" tone="ink3">{`  ${tx.reference}`}</T> : null}
                  </T>
                }
                right={<T v="money" tone={inflow ? 'brand' : 'ink'}>{inflow ? '+' : '−'}{formatKsh(Math.abs(Number(tx.amount)))}</T>}
                last={i === rows.length - 1}
              />
            );
          })}
        </Panel>
      )}
    </Screen>
  );
};
