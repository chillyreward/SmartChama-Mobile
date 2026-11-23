import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { GroupSwitcherModal } from '../components/GroupSwitcherModal';
import { addDays, cycleStart, describeSchedule, nextDueDate, prettyDate, todayNairobi, type GroupSchedule } from '../lib/contributionSchedule';
import { standing } from '../lib/trust';
import { Button, Chip, IconButton, Loading, Meter, Money, Panel, Row, Screen, SectionTitle, T, Ticks, formatKsh, shortDate } from '../ui';

const INCOMING = ['contribution', 'repayment', 'loan_repayment', 'penalty', 'interest', 'deposit', 'smartgrow_return'];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { session, member, group, refreshAuth } = useAuth();
  const { colors } = useTheme();
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard', group?.id, member?.id],
    enabled: !!group?.id && !!member?.id,
    queryFn: async () => {
      const gid = group!.id;
      const [mine, txs, wallet, welfare, unread, chama, dates, cycle] = await Promise.all([
        supabase.from('contributions_v2').select('amount, created_at').eq('membership_id', member!.id).eq('status', 'confirmed').order('created_at'),
        supabase.from('transactions_v2').select('id, type, amount, description, created_at').eq('chama_id', gid).order('created_at', { ascending: false }).limit(5),
        supabase.from('wallets').select('balance, invested').eq('chama_id', gid).maybeSingle(),
        supabase.from('welfare_fund').select('balance').eq('chama_id', gid).maybeSingle(),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('profile_id', session!.user.id).eq('read', false),
        supabase.from('chamas_v2').select('contribution_amount, contribution_frequency, contribution_due_day').eq('id', gid).maybeSingle(),
        supabase.from('chama_contribution_dates').select('due_date').eq('chama_id', gid).order('due_date'),
        supabase.from('merry_go_round_cycles').select('id, current_round, total_rounds').eq('chama_id', gid).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      let myRound: { round_number: number; scheduled_date: string | null } | null = null;
      if (cycle.data?.id) {
        const { data: sched } = await supabase
          .from('merry_go_round_schedule')
          .select('round_number, scheduled_date')
          .eq('cycle_id', cycle.data.id)
          .eq('recipient_membership_id', member!.id)
          .maybeSingle();
        myRound = sched ?? null;
      }
      return {
        mine: (mine.data ?? []) as { amount: number; created_at: string }[],
        txs: (txs.data ?? []) as any[],
        wallet: wallet.data as { balance: number; invested: number } | null,
        welfare: welfare.data ? Number(welfare.data.balance) : null,
        unread: unread.count ?? 0,
        amount: Number(chama.data?.contribution_amount ?? group?.contribution_amount ?? 0),
        schedule: {
          frequency: chama.data?.contribution_frequency,
          dates: (dates.data ?? []).map((d: any) => d.due_date),
          dueDay: chama.data?.contribution_due_day,
        } as GroupSchedule,
        cycle: cycle.data as { current_round: number; total_rounds: number } | null,
        myRound,
      };
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAuth();
    await refetch();
    setRefreshing(false);
  };

  // Last six months of my confirmed contributions
  const months = useMemo(() => {
    const now = new Date();
    const out = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-KE', { month: 'short' }), total: 0 };
    });
    (data?.mine ?? []).forEach((c) => {
      const d = new Date(c.created_at);
      const m = out.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.total += Number(c.amount || 0);
    });
    return out;
  }, [data?.mine]);

  const firstName = member?.profiles?.full_name?.split(' ')[0] || '';
  const totalSaved = (data?.mine ?? []).reduce((s, c) => s + Number(c.amount || 0), 0);
  const maxMonth = Math.max(1, ...months.map((m) => m.total));
  const thisMonth = months[months.length - 1]?.total ?? 0;
  const score = Number(member?.trust_score ?? 0);

  const today = todayNairobi();
  const due = data ? nextDueDate(data.schedule, today) : null;
  const start = due && data ? cycleStart(data.schedule, due) : null;
  const span = due && start ? Math.max(1, daysBetween(start, due) + 1) : 0;
  const elapsed = due && start ? Math.min(span, Math.max(0, daysBetween(start, today) + 1)) : 0;
  const whenText = !due ? 'No upcoming date set' : due === today ? 'Due today' : due === addDays(today, 1) ? 'Due tomorrow' : `Due ${prettyDate(due)}`;

  return (
    <Screen tabBarSpace refreshing={refreshing} onRefresh={onRefresh}>
      <GroupSwitcherModal visible={switcherVisible} onClose={() => setSwitcherVisible(false)} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 18 }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <T v="small" tone="ink2">{greeting()}{firstName ? `, ${firstName}` : ''}</T>
          <Pressable onPress={() => setSwitcherVisible(true)} accessibilityRole="button" accessibilityLabel="Switch group" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <T v="title" numberOfLines={1} style={{ flexShrink: 1 }}>{group?.name || 'Your group'}</T>
            <Ionicons name="chevron-down" size={16} color={colors.ink2} />
          </Pressable>
        </View>
        <IconButton icon="notifications-outline" label="Notifications" badge={data?.unread} onPress={() => navigation.navigate('Alerts')} />
      </View>

      {isLoading || !data ? <Loading /> : (
        <>
          {/* Savings hero */}
          <Panel tone="forest" style={{ padding: 22, borderRadius: 28 }}>
            <T v="small" tone="onForest3">Your savings in this group</T>
            <Money value={totalSaved} v="moneyLg" tone="mint" style={{ marginTop: 4 }} />
            <T v="small" tone="onForest2" style={{ marginTop: 2 }}>
              {thisMonth > 0 ? `${formatKsh(thisMonth)} paid this month` : 'Nothing paid yet this month'}
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 96, marginTop: 20 }} accessibilityLabel="Your contributions over the last six months">
              {months.map((m, i) => (
                <View key={m.key} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <View style={{ width: '100%', height: Math.max(4, (m.total / maxMonth) * 70), borderRadius: 6, backgroundColor: i === months.length - 1 ? colors.mint : m.total > 0 ? colors.moss : colors.canopy }} />
                  <T v="caption" tone="onForest3">{m.label}</T>
                </View>
              ))}
            </View>
          </Panel>

          {/* Next contribution */}
          <Panel tone="sage" style={{ marginTop: 12, padding: 22, borderRadius: 28 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T v="small" tone="sageInk">Next contribution</T>
              {due && daysBetween(today, due) > 1 ? <T v="caption" tone="sageInk">in {daysBetween(today, due)} days</T> : null}
            </View>
            {data.amount > 0 ? <Money value={data.amount} v="moneyLg" tone="sageInk" style={{ marginTop: 2 }} /> : null}
            <T v="bodyStrong" tone="sageInk">{whenText}</T>
            <T v="caption" tone="sageInk" style={{ opacity: 0.75, marginTop: 2 }}>{describeSchedule(data.schedule)}</T>
            {span > 1 ? (
              <View style={{ marginTop: 16 }}>
                <Meter value={elapsed} max={span} segments={Math.min(span, 30)} height={18} onColor={colors.moss} offColor="#A9C3B0" />
                <T v="caption" tone="sageInk" style={{ marginTop: 8 }}>{span - elapsed} of {span} days left in this cycle</T>
              </View>
            ) : null}
            <Button label="Pay with M-Pesa" variant="forest" size="lg" icon="phone-portrait-outline" style={{ marginTop: 18 }} onPress={() => navigation.navigate('Contribute', { pay: Date.now() })} />
          </Panel>

          {/* Trust + merry-go-round */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <Panel style={{ flex: 1 }} onPress={() => navigation.navigate('TrustScore')} accessibilityLabel={`Trust score ${score} out of 100`}>
              <T v="caption" tone="ink2">Trust score</T>
              <T v="display" style={{ marginTop: 6 }}>{score}<T v="small" tone="ink3"> /100</T></T>
              <View style={{ marginTop: 10 }}><Meter value={score} segments={14} height={14} /></View>
              <T v="caption" tone="ink2" style={{ marginTop: 8 }}>{standing(score).label}</T>
            </Panel>
            <Panel tone="lavender" style={{ flex: 1 }} onPress={() => navigation.navigate('MerryGoRound')} accessibilityLabel="Merry-go-round">
              <T v="caption" style={{ color: colors.lavenderInk }}>Merry-go-round</T>
              {data.cycle ? (
                <>
                  <T v="display" style={{ marginTop: 6, color: colors.lavenderInk }}>{data.cycle.current_round}<T v="small" style={{ color: colors.lavenderInk }}> of {data.cycle.total_rounds}</T></T>
                  <View style={{ marginTop: 10 }}><Ticks total={data.cycle.total_rounds} done={data.cycle.current_round} onColor={colors.lavenderInk} offColor="#A99BE0" /></View>
                  <T v="caption" style={{ marginTop: 8, color: colors.lavenderInk }}>
                    {data.myRound ? `Your turn: round ${data.myRound.round_number}${data.myRound.scheduled_date ? `, ${shortDate(data.myRound.scheduled_date)}` : ''}` : 'Not in this round'}
                  </T>
                </>
              ) : (
                <T v="small" style={{ marginTop: 6, color: colors.lavenderInk }}>No round is running right now.</T>
              )}
            </Panel>
          </View>

          {/* Group money */}
          <SectionTitle action="Wallet" onAction={() => navigation.navigate('Wallet')}>The group&apos;s money</SectionTitle>
          <Panel style={{ paddingVertical: 4 }}>
            <Row icon="wallet-outline" title="In the group wallet" right={<Money value={data.wallet?.balance ?? 0} />} />
            <Row icon="trending-up-outline" title="Invested through SmartGrow" right={<Money value={data.wallet?.invested ?? 0} />} onPress={() => navigation.navigate('SmartGrow')} />
            <Row icon="heart-outline" iconTone="lavender" title="Welfare fund" right={<Money value={data.welfare ?? 0} />} onPress={() => navigation.navigate('Welfare')} last />
          </Panel>

          {/* Activity */}
          <SectionTitle action="See all" onAction={() => navigation.navigate('History')}>Recent activity</SectionTitle>
          <Panel style={{ paddingVertical: 4 }}>
            {data.txs.length === 0 ? (
              <T v="small" tone="ink2" style={{ paddingVertical: 16 }}>Nothing yet. Payments, payouts and withdrawals show here as they happen.</T>
            ) : data.txs.map((tx, i) => {
              const inflow = INCOMING.includes(tx.type);
              return (
                <Row
                  key={tx.id}
                  icon={inflow ? 'arrow-down' : 'arrow-up'}
                  iconTone={inflow ? 'mint' : 'raised'}
                  title={tx.description || (tx.type === 'contribution' ? 'Contribution' : String(tx.type).replace(/_/g, ' '))}
                  subtitle={shortDate(tx.created_at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  right={<T v="money" tone={inflow ? 'brand' : 'ink'}>{inflow ? '+' : '−'}{formatKsh(Math.abs(Number(tx.amount)))}</T>}
                  last={i === data.txs.length - 1}
                />
              );
            })}
          </Panel>

          {member?.status === 'active' && score === 0 ? (
            <View style={{ marginTop: 16 }}><Chip kind="info" label="Your trust score starts once your first payment is confirmed" /></View>
          ) : null}
        </>
      )}
    </Screen>
  );
};
