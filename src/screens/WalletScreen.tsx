import React, { useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { generateMemberStatementPDF } from '../utils/pdfExport';
import { allowSensitiveAction } from '../security/biometric';
import { useSecureScreen } from '../security/useSecureScreen';
import { Button, Chip, Empty, Field, Loading, Money, Notice, Panel, Row, Screen, SectionTitle, T, Ticks, formatKsh, shortDate, type ChipKind } from '../ui';

const INCOMING = ['contribution', 'repayment', 'loan_repayment', 'penalty', 'interest', 'deposit', 'smartgrow_return'];
export const TX_LABEL: Record<string, string> = {
  contribution: 'Contribution', withdrawal: 'Withdrawal', deposit: 'Deposit', penalty: 'Penalty', interest: 'Interest',
  smartgrow_investment: 'SmartGrow investment', smartgrow_return: 'SmartGrow return', loan_disbursement: 'Payout', loan_repayment: 'Repayment',
};
const CONSENT: Record<string, [ChipKind, string]> = {
  pending: ['pending', 'Voting open'],
  approved: ['paid', 'Approved'],
  executed: ['info', 'Paid out'],
  rejected: ['failed', 'Turned down'],
};

export const WalletScreen: React.FC<{ navigation?: any }> = () => {
  const { session, member, group } = useAuth();
  const { colors } = useTheme();
  useSecureScreen('wallet');

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['wallet', group?.id, member?.id],
    enabled: !!group?.id && !!member?.id,
    queryFn: async () => {
      const [w, txs, mine, consents, votes] = await Promise.all([
        supabase.from('wallets').select('balance, invested').eq('chama_id', group!.id).maybeSingle(),
        supabase.from('transactions_v2').select('*').eq('chama_id', group!.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('contributions_v2').select('amount').eq('membership_id', member!.id).eq('status', 'confirmed'),
        supabase.from('withdrawal_consents').select('*, profiles(full_name)').eq('chama_id', group!.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('withdrawal_votes').select('consent_id, vote').eq('membership_id', member!.id),
      ]);
      return {
        balance: Number(w.data?.balance ?? 0),
        invested: Number(w.data?.invested ?? 0),
        txs: txs.data ?? [],
        mine: (mine.data ?? []).reduce((s: number, c: any) => s + Number(c.amount || 0), 0),
        consents: consents.data ?? [],
        votes: (votes.data ?? []) as { consent_id: string; vote: string }[],
      };
    },
  });

  const exportStatement = async () => {
    if (!data) return;
    await generateMemberStatementPDF({
      memberName: member?.profiles?.full_name || 'Member',
      chamaName: group?.name || 'Akibora group',
      totalBalance: data.balance,
      transactions: data.txs,
    });
  };

  const vote = async (consentId: string, v: 'approve' | 'reject') => {
    const { data: res, error } = await supabase.rpc('cast_withdrawal_vote', { p_consent_id: consentId, p_vote: v });
    if (error || !res?.success) {
      Alert.alert('Vote not recorded', res?.error === 'already_voted' ? 'You have already voted on this request.' : (res?.error || error?.message || 'Please try again.'));
      return;
    }
    setToast(v === 'approve' ? 'Your yes vote is recorded.' : 'Your no vote is recorded.');
    refetch();
  };

  const request = async () => {
    setFormError('');
    const value = Number(amount);
    if (!reason.trim() || !(value > 0)) return setFormError('Enter the amount and what the money is for.');
    if (data && value > data.balance) return setFormError(`The group wallet has ${formatKsh(data.balance)}.`);
    if (!(await allowSensitiveAction('Confirm withdrawal request'))) return;
    setSending(true);
    const { error } = await supabase.from('withdrawal_consents').insert({
      chama_id: group?.id,
      requested_by: session?.user?.id,
      amount: value,
      reason: reason.trim().slice(0, 300),
    });
    setSending(false);
    if (error) return setFormError(error.message || 'Could not send the request.');
    setOpen(false);
    setReason('');
    setAmount('');
    setToast('Request sent. Members can now vote on it.');
    refetch();
  };

  const share = data && data.balance > 0 ? Math.min(100, Math.round((data.mine / data.balance) * 100)) : 0;

  return (
    <Screen title="Wallet" subtitle="The group's money, and every movement in and out." tabBarSpace refreshing={isRefetching} onRefresh={refetch}>
      {isLoading || !data ? <Loading /> : (
        <>
          {toast ? <View style={{ marginBottom: 12 }}><Notice tone="ok">{toast}</Notice></View> : null}
          <Panel tone="forest" style={{ padding: 22, borderRadius: 28 }}>
            <T v="small" tone="onForest3">In the group wallet</T>
            <Money value={data.balance} v="moneyLg" tone="mint" style={{ marginTop: 4 }} />
            <T v="small" tone="onForest2">{formatKsh(data.invested)} invested through SmartGrow</T>
            <View style={{ gap: 10, marginTop: 18 }}>
              <Button label="Ask to withdraw" variant="mint" size="lg" icon="hand-left-outline" onPress={() => { setFormError(''); setOpen(true); }} />
              <Button label="Download my statement" variant="onForest" icon="download-outline" onPress={exportStatement} />
            </View>
          </Panel>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <Panel style={{ flex: 1 }}><T v="caption" tone="ink2">You&apos;ve put in</T><Money value={data.mine} v="title" style={{ marginTop: 6 }} /></Panel>
            <Panel style={{ flex: 1 }}><T v="caption" tone="ink2">Your share of the wallet</T><T v="title" style={{ marginTop: 6 }}>{share}%</T></Panel>
          </View>

          {data.consents.length > 0 ? (
            <>
              <SectionTitle>Withdrawal requests</SectionTitle>
              <View style={{ gap: 12 }}>
                {data.consents.map((c: any) => {
                  const [kind, label] = CONSENT[c.status] ?? ['neutral', c.status];
                  const myVote = data.votes.find((v) => v.consent_id === c.id);
                  const voters = Number(c.total_eligible_voters || 0);
                  return (
                    <Panel key={c.id}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Money value={c.amount} v="title" />
                          <T v="small" tone="ink2" style={{ marginTop: 2 }}>{c.reason || 'No reason given'}</T>
                          <T v="caption" tone="ink3" style={{ marginTop: 2 }}>Asked by {c.profiles?.full_name || 'a member'}, {shortDate(c.created_at)}</T>
                        </View>
                        <Chip kind={kind} label={label} />
                      </View>
                      {voters > 0 ? (
                        <View style={{ marginTop: 12 }}>
                          <Ticks total={voters} done={Number(c.votes_for || 0)} />
                          <T v="caption" tone="ink3" style={{ marginTop: 6 }}>{c.votes_for || 0} of {voters} members in favour</T>
                        </View>
                      ) : null}
                      {c.status === 'pending' ? (
                        myVote ? (
                          <T v="small" tone="ink2" style={{ marginTop: 12 }}>You voted {myVote.vote === 'approve' ? 'yes' : 'no'}.</T>
                        ) : (
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                            <Button label="Vote yes" size="sm" style={{ flex: 1 }} onPress={() => vote(c.id, 'approve')} />
                            <Button label="Vote no" size="sm" variant="outline" style={{ flex: 1 }} onPress={() => vote(c.id, 'reject')} />
                          </View>
                        )
                      ) : null}
                    </Panel>
                  );
                })}
              </View>
            </>
          ) : null}

          <SectionTitle>Recent movements</SectionTitle>
          <Panel style={{ paddingVertical: data.txs.length ? 4 : 18 }}>
            {data.txs.length === 0 ? (
              <Empty icon="receipt-outline" title="Nothing yet">Contributions, payouts and withdrawals show here as they happen.</Empty>
            ) : data.txs.map((tx: any, i: number) => {
              const inflow = INCOMING.includes(tx.type);
              return (
                <Row
                  key={tx.id}
                  icon={inflow ? 'arrow-down' : 'arrow-up'}
                  iconTone={inflow ? 'mint' : 'raised'}
                  title={tx.description || TX_LABEL[tx.type] || String(tx.type).replace(/_/g, ' ')}
                  subtitle={shortDate(tx.created_at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  right={<T v="money" tone={inflow ? 'brand' : 'ink'}>{inflow ? '+' : '−'}{formatKsh(Math.abs(Number(tx.amount)))}</T>}
                  last={i === data.txs.length - 1}
                />
              );
            })}
          </Panel>
        </>
      )}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.page, padding: 20, gap: 18 }}>
          <T v="display" style={{ marginTop: 8 }}>Ask to withdraw</T>
          <T v="small" tone="ink2">Members vote on it. If most say yes, an official releases the money.</T>
          <Field label="Amount" keyboardType="number-pad" value={amount} onChangeText={setAmount} placeholder="20000" hint={data ? `The wallet has ${formatKsh(data.balance)}` : undefined} />
          <Field label="What is it for?" value={reason} onChangeText={setReason} maxLength={300} multiline />
          {formError ? <Notice tone="danger">{formError}</Notice> : null}
          <Button label="Send request" size="lg" loading={sending} onPress={request} />
          <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
        </View>
      </Modal>
    </Screen>
  );
};
