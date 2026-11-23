import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, Share, TextInput, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { env } from '../config/env';
import { supabase } from '../lib/supabase';
import { fonts } from '../theme/fonts';
import { Avatar, Button, Chip, Empty, Loading, Meter, OFFICIAL_ROLES, Panel, ROLE_LABEL, Row, Screen, SectionTitle, T, shortDate } from '../ui';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export const MembersScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { member, group } = useAuth();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const isOfficial = !!member?.role && OFFICIAL_ROLES.includes(member.role);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['members', group?.id],
    enabled: !!group?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chama_memberships')
        .select('*, profiles(full_name, phone_number, email)')
        .eq('chama_id', group!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const active = useMemo(() => (data ?? []).filter((m: any) => m.status === 'active'), [data]);
  const pending = useMemo(() => (data ?? []).filter((m: any) => m.status === 'pending'), [data]);
  const shown = active.filter((m: any) => (m.profiles?.full_name || '').toLowerCase().includes(query.trim().toLowerCase()));
  const officials = active.filter((m: any) => OFFICIAL_ROLES.includes(m.role));

  const shareInvite = async () => {
    try {
      await Share.share({
        message: `Join ${group?.name || 'our group'} on Akibora. The group code is ${group?.group_code}. Sign up at ${env.apiBaseUrl}/signup?code=${group?.group_code}`,
      });
    } catch {}
  };

  const exportRoster = async () => {
    try {
      const today = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
      const rows = active.map((m: any, i: number) => `<tr><td>${i + 1}</td><td><b>${esc(m.profiles?.full_name || 'Member')}</b></td><td>${esc(m.profiles?.phone_number || '')}</td><td>${esc(ROLE_LABEL[m.role] ?? m.role)}</td></tr>`).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
        body{font-family:Helvetica,Arial,sans-serif;margin:0;padding:28px;color:#0F241A}
        h1{font-family:Georgia,serif;font-weight:400;font-size:28px;margin:0}
        p{color:#4C6858;font-size:13px;margin:6px 0 18px}
        table{width:100%;border-collapse:collapse}
        th{text-align:left;font-size:12px;color:#4C6858;border-bottom:2px solid #0E1F18;padding:8px}
        td{padding:10px 8px;font-size:13px;border-bottom:1px solid #C6D8CA}
        .f{margin-top:24px;font-size:11px;color:#4C6858}
      </style></head><body>
        <h1>${esc(group?.name || 'Akibora group')} members</h1>
        <p>${active.length} active ${active.length === 1 ? 'member' : 'members'}, ${today}</p>
        <table><thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Role</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="f">Made with Akibora. Contains members' phone numbers: share it only with people in the group.</div>
      </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: `${group?.name || 'Akibora'} members` });
      } else {
        await Share.share({ title: 'Members', url: uri });
      }
    } catch (e: any) {
      Alert.alert('Could not make the PDF', e?.message || 'Please try again.');
    }
  };

  const approve = async (m: any) => {
    setProcessingId(m.id);
    const { error } = await supabase.from('chama_memberships').update({ status: 'active' }).eq('id', m.id);
    if (!error) {
      await supabase.from('notifications').insert({
        chama_id: group?.id,
        profile_id: m.profile_id,
        type: 'member_approved',
        title: 'You are in',
        message: `Your request to join ${group?.name || 'the group'} was approved.`,
      });
    }
    setProcessingId(null);
    if (error) Alert.alert('Could not approve', error.message);
    refetch();
  };

  const decline = (m: any) => {
    Alert.alert('Decline this request?', `${m.profiles?.full_name || 'This person'} won't join the group. They can ask again later.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setProcessingId(m.id);
          const { error } = await supabase.from('chama_memberships').update({ status: 'rejected' }).eq('id', m.id);
          setProcessingId(null);
          if (error) Alert.alert('Could not decline', error.message);
          refetch();
        },
      },
    ]);
  };

  return (
    <Screen title="Members" subtitle={`${active.length} in ${group?.name || 'the group'}`} onBack={() => navigation?.goBack()} refreshing={isRefetching} onRefresh={refetch}>
      <Panel tone="sage" style={{ padding: 20 }}>
        <T v="small" tone="sageInk">Group code</T>
        <T v="display" tone="sageInk" style={{ fontFamily: fonts.monoMedium, letterSpacing: 3, marginTop: 4 }}>{group?.group_code ?? '—'}</T>
        <T v="small" tone="sageInk" style={{ marginTop: 4 }}>New members type this when they sign up. An official approves each one.</T>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Button label="Share invite" variant="forest" icon="share-social-outline" style={{ flex: 1 }} onPress={shareInvite} />
          {isOfficial ? <Button label="PDF" variant="forest" icon="download-outline" onPress={exportRoster} /> : null}
        </View>
      </Panel>

      {isOfficial && pending.length > 0 ? (
        <>
          <SectionTitle>Waiting for you</SectionTitle>
          <View style={{ gap: 10 }}>
            {pending.map((m: any) => (
              <Panel key={m.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Avatar name={m.profiles?.full_name} />
                  <View style={{ flex: 1 }}>
                    <T v="bodyStrong">{m.profiles?.full_name || 'New member'}</T>
                    <T v="caption" tone="ink2">{m.profiles?.phone_number || m.profiles?.email || ''}{m.created_at ? `, asked ${shortDate(m.created_at)}` : ''}</T>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <Button label="Approve" size="sm" style={{ flex: 1 }} loading={processingId === m.id} onPress={() => approve(m)} />
                  <Button label="Decline" size="sm" variant="outline" style={{ flex: 1 }} disabled={processingId === m.id} onPress={() => decline(m)} />
                </View>
              </Panel>
            ))}
          </View>
        </>
      ) : null}

      <SectionTitle>Everyone</SectionTitle>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 16, marginBottom: 12 }}>
        <Ionicons name="search" size={18} color={colors.ink3} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Find a member" placeholderTextColor={colors.ink3} accessibilityLabel="Find a member" style={{ flex: 1, color: colors.ink, fontFamily: fonts.body, fontSize: 16 }} />
      </View>

      {isLoading ? <Loading /> : (
        <Panel style={{ paddingVertical: shown.length ? 4 : 18 }}>
          {shown.length === 0 ? (
            <Empty icon="people-outline" title={query ? 'No one by that name' : 'No members yet'} />
          ) : shown.map((m: any, i: number) => (
            <Row
              key={m.id}
              left={<Avatar name={m.profiles?.full_name} tone={m.id === member?.id ? 'mint' : OFFICIAL_ROLES.includes(m.role) ? 'lavender' : 'sage'} />}
              title={`${m.profiles?.full_name || 'Member'}${m.id === member?.id ? ' (you)' : ''}`}
              subtitle={ROLE_LABEL[m.role] ?? m.role}
              onPress={() => setSelected(m)}
              last={i === shown.length - 1}
            />
          ))}
        </Panel>
      )}
      {officials.length ? <T v="caption" tone="ink3" style={{ marginTop: 10 }}>{officials.length} {officials.length === 1 ? 'official runs' : 'officials run'} this group.</T> : null}

      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => setSelected(null)} accessibilityLabel="Close" />
        {selected ? (
          <View style={{ backgroundColor: colors.page, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 22, paddingBottom: 40, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Avatar name={selected.profiles?.full_name} size={56} tone="forest" />
              <View style={{ flex: 1 }}>
                <T v="title">{selected.profiles?.full_name || 'Member'}</T>
                <Chip kind={OFFICIAL_ROLES.includes(selected.role) ? 'welfare' : 'neutral'} label={ROLE_LABEL[selected.role] ?? selected.role} />
              </View>
            </View>
            <Panel>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <T v="smallStrong">Trust score</T>
                <T v="money">{Number(selected.trust_score ?? 0)}<T v="small" tone="ink3"> /100</T></T>
              </View>
              <View style={{ marginTop: 10 }}><Meter value={Number(selected.trust_score ?? 0)} segments={20} height={12} /></View>
            </Panel>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Panel style={{ flex: 1 }}><T v="caption" tone="ink3">Member since</T><T v="bodyStrong">{shortDate(selected.joined_at || selected.created_at, { month: 'short', year: 'numeric' }) || '—'}</T></Panel>
              <Panel style={{ flex: 1 }}><T v="caption" tone="ink3">Months in a row</T><T v="bodyStrong">{selected.contribution_streak ?? 0}</T></Panel>
            </View>
            {isOfficial && selected.profiles?.phone_number ? <T v="small" tone="ink2">Phone: {selected.profiles.phone_number}</T> : null}
            <Button label="Close" variant="outline" onPress={() => setSelected(null)} />
          </View>
        ) : null}
      </Modal>
    </Screen>
  );
};
