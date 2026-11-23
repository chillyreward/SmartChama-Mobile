import React, { useState } from 'react';
import { Modal, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { api, ApiError } from '../lib/api';
import { Button, Chip, Empty, Field, Loading, Money, Notice, Panel, Row, Screen, SectionTitle, Choices, T, formatKsh, shortDate, type ChipKind } from '../ui';

const REASONS = [
  { value: 'bereavement', label: 'Bereavement' },
  { value: 'medical', label: 'Medical or hospital' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'education', label: 'School fees' },
  { value: 'other', label: 'Another emergency' },
] as const;
type Reason = (typeof REASONS)[number]['value'];

const STATUS: Record<string, [ChipKind, string]> = {
  pending: ['pending', 'Waiting for officials'],
  approved: ['paid', 'Approved'],
  paid: ['paid', 'Paid out'],
  rejected: ['failed', 'Declined'],
};

export const WelfareScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { member, group } = useAuth();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>('bereavement');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['welfare', group?.id],
    enabled: !!group?.id,
    queryFn: () => api<{ fund: any; claims: any[] }>(`/api/welfare/status?chama_id=${group!.id}`, { method: 'GET' }),
  });
  const fund = data?.fund;
  const claims = (data?.claims ?? []).filter((c) => c.membership_id === member?.id);
  const max = Number(fund?.max_claim_amount ?? 50000);

  const submit = async () => {
    setError('');
    const n = Number(amount);
    if (!(n > 0)) return setError('Enter an amount.');
    if (n > max) return setError(`The most you can ask for is ${formatKsh(max)}.`);
    setBusy(true);
    try {
      await api('/api/welfare/claim', { body: { chama_id: group!.id, membership_id: member!.id, amount: n, reason, description: description.trim() || undefined } });
      setOpen(false);
      setAmount('');
      setDescription('');
      setDone('Your request is with the officials. You will get a notification when they decide.');
      refetch();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send your request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Welfare fund" subtitle="Money the group keeps aside to help a member through a hard time." onBack={() => navigation.goBack()} refreshing={isRefetching} onRefresh={refetch}>
      {isLoading ? <Loading /> : (
        <>
          {done ? <View style={{ marginBottom: 12 }}><Notice tone="ok">{done}</Notice></View> : null}
          <Panel tone="lavender" style={{ padding: 22, borderRadius: 28 }}>
            <T v="small" style={{ color: colors.lavenderInk }}>In the fund now</T>
            <Money value={fund?.balance ?? 0} v="moneyLg" style={{ color: colors.lavenderInk, marginTop: 4 }} />
            <T v="small" style={{ color: colors.lavenderInk, marginTop: 6 }}>
              Each member adds {formatKsh(fund?.monthly_contribution ?? 0)} a month. One request can be up to {formatKsh(max)}.
            </T>
            <Button label="Ask for support" variant="forest" size="lg" icon="heart-outline" style={{ marginTop: 18 }} onPress={() => { setError(''); setOpen(true); }} />
          </Panel>

          <SectionTitle>Your requests</SectionTitle>
          <Panel style={{ paddingVertical: claims.length ? 4 : 18 }}>
            {claims.length === 0 ? (
              <Empty icon="heart-outline" title="No requests yet">If something happens, ask here. Officials see it straight away.</Empty>
            ) : claims.map((c, i) => {
              const [kind, label] = STATUS[c.status] ?? ['neutral', c.status];
              return (
                <Row
                  key={c.id}
                  icon="heart-outline"
                  iconTone="lavender"
                  title={formatKsh(c.amount)}
                  subtitle={`${REASONS.find((r) => r.value === c.reason)?.label ?? c.reason}, ${shortDate(c.created_at)}`}
                  right={<Chip kind={kind} label={label} />}
                  last={i === claims.length - 1}
                />
              );
            })}
          </Panel>
        </>
      )}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.page, padding: 20, gap: 18 }}>
          <T v="display" style={{ marginTop: 8 }}>Ask for support</T>
          <T v="small" tone="ink2">Your officials decide. Other members don&apos;t see your reason.</T>
          <Choices label="What is it for?" value={reason} onChange={setReason} items={REASONS as unknown as { value: Reason; label: string }[]} />
          <Field label="How much do you need?" hint={`Up to ${formatKsh(max)}`} keyboardType="number-pad" value={amount} onChangeText={setAmount} placeholder="10000" />
          <Field label="What happened (optional)" multiline value={description} onChangeText={setDescription} maxLength={1000} />
          {error ? <Notice tone="danger">{error}</Notice> : null}
          <Button label="Send request" size="lg" loading={busy} onPress={submit} />
          <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
        </View>
      </Modal>
    </Screen>
  );
};
