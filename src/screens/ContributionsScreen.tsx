import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, TextInput, View } from 'react-native';
import { fonts } from '../theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { integrations } from '../integrations';
import { allowSensitiveAction } from '../security/biometric';
import { useSecureScreen } from '../security/useSecureScreen';
import { watchPayment } from '../lib/paymentStatus';
import { Button, Chip, Empty, Field, Loading, Money, Notice, Panel, Row, Screen, SectionTitle, T, formatKsh, shortDate, type ChipKind } from '../ui';

type Stage = 'form' | 'sending' | 'waiting' | 'success' | 'timeout';

const STATUS: Record<string, [ChipKind, string]> = {
  confirmed: ['paid', 'Confirmed'],
  pending: ['pending', 'Waiting'],
  failed: ['failed', 'Failed'],
};

function toMsisdn(raw: string) {
  let p = raw.replace(/[\s-]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '254' + p.slice(1);
  if (!p.startsWith('254')) p = '254' + p;
  return p;
}

export const ContributionsScreen: React.FC<{ route?: any }> = ({ route }) => {
  const { member, group, refreshAuth } = useAuth();
  const { colors } = useTheme();
  useSecureScreen('contributions');

  // Stops polling if the user leaves the screen mid-payment
  const cancelWatch = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelWatch.current?.(), []);

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState<Stage>('form');
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['contributions', member?.id],
    enabled: !!member?.id,
    queryFn: async () => {
      const { data } = await supabase.from('contributions_v2').select('*').eq('membership_id', member!.id).order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const openSheet = () => {
    setStage('form');
    setError('');
    setReceipt(null);
    if (!amount && group?.contribution_amount) setAmount(String(group.contribution_amount));
    if (!phone && member?.profiles?.phone_number) setPhone(member.profiles.phone_number);
    setOpen(true);
  };

  // The tab bar's Pay button opens the sheet straight away
  const payParam = route?.params?.pay;
  useEffect(() => {
    if (payParam) openSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payParam]);

  const confirmed = (data ?? []).filter((c: any) => c.status === 'confirmed');
  const total = confirmed.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
  const ym = new Date().toISOString().slice(0, 7);
  const thisMonth = confirmed.filter((c: any) => c.created_at?.startsWith(ym)).reduce((s: number, c: any) => s + Number(c.amount || 0), 0);

  const pay = async () => {
    setError('');
    const n = Number(amount);
    if (!(n >= 1)) return setError('Enter an amount of at least KSh 1.');
    const msisdn = toMsisdn(phone);
    if (!/^254\d{9}$/.test(msisdn)) return setError('Enter an M-Pesa number like 0712 345 678.');
    if (!(await allowSensitiveAction('Confirm to pay with M-Pesa'))) return;

    setStage('sending');
    try {
      const { contributionId } = await integrations.mobileMoney.mpesa.requestPayment({
        phone: msisdn,
        amount: n,
        chamaId: group!.id,
        membershipId: member!.id,
        reference: group?.name?.slice(0, 12) || 'Akibora',
      });
      setStage('waiting');
      // Follow this exact payment until the server confirms it with Safaricom
      cancelWatch.current?.();
      cancelWatch.current = watchPayment(contributionId, (outcome) => {
        if (outcome.status === 'confirmed') {
          setReceipt(outcome.receipt);
          setStage('success');
          refetch();
        } else if (outcome.status === 'failed') {
          setStage('form');
          setError(outcome.reason || 'The M-Pesa payment was cancelled or did not go through.');
        } else {
          setStage('timeout');
          refetch();
        }
      });
    } catch (e: any) {
      setStage('form');
      setError(e?.message || 'Could not send the M-Pesa prompt.');
    }
  };

  return (
    <Screen
      title="Contributions"
      subtitle={group?.name}
      tabBarSpace
      refreshing={refreshing}
      onRefresh={async () => { setRefreshing(true); await refreshAuth(); await refetch(); setRefreshing(false); }}
    >
      <Panel tone="forest" style={{ padding: 22, borderRadius: 28 }}>
        <T v="small" tone="onForest3">You&apos;ve contributed</T>
        <Money value={total} v="moneyLg" tone="mint" style={{ marginTop: 4 }} />
        <View style={{ flexDirection: 'row', gap: 24, marginTop: 10 }}>
          <View><T v="caption" tone="onForest3">This month</T><T v="bodyStrong" tone="onForest">{formatKsh(thisMonth)}</T></View>
          <View><T v="caption" tone="onForest3">Months in a row</T><T v="bodyStrong" tone="onForest">{member?.contribution_streak ?? 0}</T></View>
        </View>
        <Button label="Pay with M-Pesa" variant="mint" size="lg" icon="phone-portrait-outline" style={{ marginTop: 18 }} onPress={openSheet} />
      </Panel>

      <SectionTitle>History</SectionTitle>
      {isLoading ? <Loading /> : (
        <Panel style={{ paddingVertical: data?.length ? 4 : 18 }}>
          {!data?.length ? (
            <Empty icon="cash-outline" title="No contributions yet">Your first payment shows here with its M-Pesa reference.</Empty>
          ) : data.map((c: any, i: number) => {
            const [kind, label] = STATUS[c.status] ?? ['neutral', c.status];
            return (
              <Row
                key={c.id}
                icon={c.payment_method === 'cash' ? 'cash-outline' : 'phone-portrait-outline'}
                iconTone={c.status === 'confirmed' ? 'mint' : 'raised'}
                title={<Money value={c.amount} />}
                subtitle={
                  <T v="caption" tone="ink2" style={{ marginTop: 2 }}>
                    {shortDate(c.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                    {c.mpesa_receipt ? <T v="mono" tone="ink3">{`  ${c.mpesa_receipt}`}</T> : c.payment_method === 'cash' ? '  Cash, recorded by an official' : ''}
                  </T>
                }
                right={<Chip kind={kind} label={label} />}
                last={i === data.length - 1}
              />
            );
          })}
        </Panel>
      )}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => stage === 'form' && setOpen(false)} accessibilityLabel="Close" />
        <View style={{ backgroundColor: colors.forest, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 22, paddingBottom: 40, gap: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T v="display" tone="onForest">Pay with M-Pesa</T>
            {stage !== 'sending' && stage !== 'waiting' ? (
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
                <Ionicons name="close" size={26} color={colors.onForest2} />
              </Pressable>
            ) : null}
          </View>

          {stage === 'form' ? (
            <>
              <T v="small" tone="onForest2">A prompt opens on your phone. Approve it with your M-Pesa PIN. Akibora never sees your PIN.</T>
              <ForestField label="Amount (KSh)" value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="5000" />
              <ForestField label="M-Pesa number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0712 345 678" />
              {error ? <Notice tone="danger">{error}</Notice> : null}
              <Button label={Number(amount) > 0 ? `Send prompt for ${formatKsh(Number(amount))}` : 'Send prompt'} variant="mint" size="lg" onPress={pay} />
            </>
          ) : stage === 'sending' || stage === 'waiting' ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 14 }} accessibilityLiveRegion="polite">
              <ActivityIndicator size="large" color={colors.mint} />
              <T v="title" tone="onForest">{stage === 'sending' ? 'Sending the prompt…' : 'Check your phone'}</T>
              <T v="small" tone="onForest2" style={{ textAlign: 'center' }}>
                {stage === 'sending' ? 'Asking M-Pesa to send the prompt.' : 'Enter your M-Pesa PIN in the prompt. This screen updates once Safaricom confirms the payment.'}
              </T>
            </View>
          ) : stage === 'success' ? (
            <View style={{ gap: 14 }} accessibilityLiveRegion="polite">
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark" size={30} color={colors.forest} />
              </View>
              <T v="title" tone="onForest">Payment confirmed</T>
              <T v="small" tone="onForest2">{formatKsh(Number(amount))} is recorded in {group?.name || 'your group'}.</T>
              {receipt ? <T v="mono" tone="mint">M-Pesa ref {receipt}</T> : null}
              <Button label="Done" variant="mint" size="lg" onPress={() => setOpen(false)} />
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              <T v="title" tone="onForest">Still waiting for M-Pesa</T>
              <T v="small" tone="onForest2">We haven&apos;t had confirmation from Safaricom yet. If you approved the prompt, the payment shows in your history once it arrives. Don&apos;t pay again unless it shows as failed.</T>
              <Button label="Close" variant="mint" size="lg" onPress={() => setOpen(false)} />
            </View>
          )}
        </View>
      </Modal>
    </Screen>
  );
};

/** Input styled for the forest payment sheet */
function ForestField(props: React.ComponentProps<typeof Field>) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <T v="smallStrong" tone="onForest2">{props.label}</T>
      <FieldInput {...props} bg={colors.canopy} border={colors.moss} color={colors.onForest} placeholderColor={colors.onForest3} />
    </View>
  );
}

function FieldInput({ bg, border, color, placeholderColor, label, hint, error, style, ...input }: any) {
  return (
    <TextInput
      {...input}
      accessibilityLabel={label}
      placeholderTextColor={placeholderColor}
      style={{ height: 54, borderRadius: 14, borderWidth: 1, borderColor: border, backgroundColor: bg, color, paddingHorizontal: 16, fontFamily: fonts.body, fontSize: 18 }}
    />
  );
}
