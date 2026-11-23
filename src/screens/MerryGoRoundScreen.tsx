import React, { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { api, ApiError } from '../lib/api';
import { Avatar, Button, Chip, Empty, Loading, Notice, Panel, Ring, Row, Screen, SectionTitle, T, Ticks, formatKsh, initialsOf, shortDate, type Seat } from '../ui';

type Status = { cycle: any | null; schedule: any[]; contributions: any[] };

export const MerryGoRoundScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { member, group } = useAuth();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['mgr', group?.id],
    enabled: !!group?.id,
    queryFn: () => api<Status & { success: boolean }>(`/api/merry-go-round/status?chama_id=${group!.id}`, { method: 'GET' }),
  });

  const cycle = data?.cycle;
  const schedule = data?.schedule ?? [];
  const contributions = data?.contributions ?? [];
  const nameOf = (s: any) => s?.chama_memberships?.profiles?.full_name || 'Member';
  const current = schedule.find((s) => s.round_number === cycle?.current_round);
  const mine = schedule.find((s) => s.recipient_membership_id === member?.id);
  const paid = contributions.some((c) => c.membership_id === member?.id);
  const pot = cycle ? Number(cycle.amount_per_member) * schedule.length : 0;
  const seats: Seat[] = schedule.map((s) => ({
    initials: initialsOf(nameOf(s)),
    state: s.round_number === cycle?.current_round ? 'current' : s.status === 'paid' ? 'received' : s.recipient_membership_id === member?.id ? 'me' : 'upcoming',
  }));

  const pay = async () => {
    if (!cycle || !member) return;
    setBusy(true);
    setMsg(null);
    try {
      await api('/api/merry-go-round/contribute', {
        body: { cycle_id: cycle.id, round_number: cycle.current_round, membership_id: member.id, amount: cycle.amount_per_member },
      });
      setMsg({ tone: 'ok', text: `${formatKsh(cycle.amount_per_member)} recorded for round ${cycle.current_round}.` });
      refetch();
    } catch (e) {
      setMsg({ tone: 'danger', text: e instanceof ApiError ? e.message : 'Could not record your payment.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="Merry-go-round"
      subtitle="Each round everyone pays in and one member takes the whole pot. Your officials set the order."
      onBack={() => navigation.goBack()}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {isLoading ? <Loading /> : !cycle || cycle.status !== 'active' ? (
        <Panel>
          <Empty icon="sync-outline" title="No round is running">
            When your officials start a merry-go-round you&apos;ll see the order, your turn and the pot here.
          </Empty>
        </Panel>
      ) : (
        <>
          {msg ? <View style={{ marginBottom: 12 }}><Notice tone={msg.tone}>{msg.text}</Notice></View> : null}
          <Panel tone="forest" style={{ alignItems: 'center', padding: 22, borderRadius: 28 }}>
            <T v="small" tone="onForest3">{cycle.name}</T>
            <View style={{ marginTop: 14 }}>
              <Ring size={272} seats={seats} label={`Round ${cycle.current_round} of ${cycle.total_rounds}`}>
                <T v="caption" tone="onForest3">Round {cycle.current_round} of {cycle.total_rounds}</T>
                <T v="display" tone="onForest" style={{ marginTop: 2 }}>{formatKsh(pot)}</T>
                {current ? (
                  <T v="caption" tone="onForest2" style={{ textAlign: 'center', marginTop: 2 }}>
                    to {current.recipient_membership_id === member?.id ? 'you' : nameOf(current).split(' ')[0]}{current.scheduled_date ? `, ${shortDate(current.scheduled_date)}` : ''}
                  </T>
                ) : null}
              </Ring>
            </View>
            <View style={{ alignSelf: 'stretch', marginTop: 20 }}>
              <Ticks total={schedule.length} done={contributions.length} onColor={colors.mint} offColor={colors.canopy} />
              <T v="caption" tone="onForest2" style={{ marginTop: 8 }}>{contributions.length} of {schedule.length} have paid into this round</T>
            </View>
            <View style={{ alignSelf: 'stretch', marginTop: 16 }}>
              {paid ? (
                <Chip kind="paid" label={`You've paid round ${cycle.current_round}`} />
              ) : (
                <Button label={`Pay ${formatKsh(cycle.amount_per_member)} for this round`} variant="mint" size="lg" loading={busy} onPress={pay} />
              )}
            </View>
          </Panel>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <Chip kind="info" label="Received" /><Chip kind="paid" label="This round" /><Chip kind="welfare" label="You" /><Chip kind="neutral" label="Waiting" />
          </View>

          <SectionTitle>The order</SectionTitle>
          <Panel style={{ paddingVertical: 4 }}>
            {schedule.map((s, i) => {
              const isMe = s.recipient_membership_id === member?.id;
              const isNow = s.round_number === cycle.current_round;
              return (
                <Row
                  key={s.id ?? i}
                  left={<Avatar name={nameOf(s)} size={38} tone={isNow ? 'mint' : isMe ? 'lavender' : 'sage'} />}
                  title={`${s.round_number}. ${isMe ? 'You' : nameOf(s)}`}
                  subtitle={s.scheduled_date ? shortDate(s.scheduled_date, { weekday: 'short', day: 'numeric', month: 'short' }) : 'Date to be set'}
                  right={<Chip kind={s.status === 'paid' ? 'info' : isNow ? 'paid' : 'neutral'} label={s.status === 'paid' ? 'Received' : isNow ? 'This round' : 'Waiting'} />}
                  last={i === schedule.length - 1}
                />
              );
            })}
          </Panel>
          {mine ? <T v="small" tone="ink2" style={{ marginTop: 12 }}>Your turn is round {mine.round_number}.</T> : null}
        </>
      )}
    </Screen>
  );
};
