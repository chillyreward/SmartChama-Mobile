import React, { useEffect, useState, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Empty, IconButton, Loading, T } from '../ui';
import { fonts } from '../theme/fonts';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import { logger } from '../lib/logger';

interface Message {
  id: string;
  chama_id: string;
  member_id: string;
  content: string;
  created_at: string;
  chama_memberships?: {
    profiles?: { full_name?: string };
  };
  sender_name?: string;
}

export const ChatScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { member, group } = useAuth();
  const { colors } = useTheme();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const senderName = (member as any)?.full_name || member?.profiles?.full_name || 'Member';

  const fetchMessages = async () => {
    if (!group?.id) return;
    try {
      const { data, error } = await supabase
        .from('chama_messages')
        .select('*, chama_memberships(profiles(full_name))')
        .eq('chama_id', group.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) setMessages(data);
    } catch (err) {
      logger.error('Error fetching chat messages', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!group?.id) return;

    fetchMessages();

    // Supabase Realtime channel subscription as specified
    const channel = supabase
      .channel('chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chama_messages',
          filter: `chama_id=eq.${group.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Own messages are already shown optimistically; others are
          // refetched so the sender's name comes with them.
          if (newMsg.member_id === member?.id) return;
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [group?.id]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !group?.id || sending) return;

    setSending(true);

    const newMsgObj: Message = {
      id: `temp-${Date.now()}`,
      chama_id: group.id,
      member_id: member?.id || 'anon',
      content: trimmed,
      created_at: new Date().toISOString(),
      sender_name: senderName,
    };

    // Optimistic UI update (for inverted list, newest is at index 0)
    setMessages((prev) => [newMsgObj, ...prev]);
    setText('');

    try {
      const { error } = await supabase.from('chama_messages').insert({
        chama_id: group.id,
        member_id: member?.id,
        content: trimmed.slice(0, 2000),
      });
      if (error) throw error;
    } catch (err) {
      logger.error('Message send failed', err);
      // Take back the optimistic message and give the text back to the user
      setMessages((prev) => prev.filter((m) => m.id !== newMsgObj.id));
      setText(trimmed);
      Alert.alert('Message not sent', 'Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  // Chat is both a tab and a pushed screen; only the pushed one gets a back button
  const inTab = navigation?.getState?.()?.type === 'tab';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.page }}>
      <View style={[styles.header, { borderBottomColor: colors.line }]}>
        {!inTab && navigation?.canGoBack?.() ? <IconButton icon="arrow-back" label="Back" onPress={() => navigation.goBack()} /> : null}
        <View style={{ flex: 1 }}>
          <T v="title" numberOfLines={1}>{group?.name || 'Group chat'}</T>
          <T v="caption" tone="ink2">Everyone in the group can read this</T>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        {loading ? <Loading /> : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, flexGrow: messages.length ? 0 : 1 }}
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', transform: [{ scaleY: -1 }], paddingHorizontal: 8 }}>
                <Empty icon="chatbubble-outline" title="Start the conversation">Share meeting notes, reminders and questions with the whole group.</Empty>
              </View>
            }
            renderItem={({ item, index }) => {
              const isMe = item.member_id === member?.id;
              const name = item.sender_name || item.chama_memberships?.profiles?.full_name || 'Member';
              const older = messages[index + 1];
              const grouped = older && older.member_id === item.member_id;
              const time = new Date(item.created_at).toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' });
              return (
                <View style={{ flexDirection: 'row', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8, marginTop: grouped ? 3 : 12 }}>
                  {!isMe ? (grouped ? <View style={{ width: 30 }} /> : <Avatar name={name} size={30} tone="sage" />) : null}
                  <View style={{ maxWidth: '78%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: isMe ? colors.primary : colors.surface, borderWidth: isMe ? 0 : 1, borderColor: colors.line, borderBottomRightRadius: isMe ? 6 : 20, borderBottomLeftRadius: isMe ? 20 : 6 }}>
                    {!isMe && !grouped ? <T v="caption" tone="brand" style={{ marginBottom: 2 }}>{name}</T> : null}
                    <T v="body" style={{ color: isMe ? colors.onPrimary : colors.ink }}>{item.content}</T>
                    <T v="caption" style={{ color: isMe ? colors.onPrimary : colors.ink3, opacity: isMe ? 0.7 : 1, marginTop: 3, alignSelf: 'flex-end', fontSize: 11 }}>{time}</T>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={[styles.inputBar, { borderTopColor: colors.line, backgroundColor: colors.page, paddingBottom: inTab ? 104 : 16 }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink, fontFamily: fonts.body }]}
            placeholder="Write to the group"
            placeholderTextColor={colors.ink3}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
            accessibilityLabel="Message"
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Send"
            style={[styles.send, { backgroundColor: text.trim() ? colors.mint : colors.raised }]}
          >
            <Ionicons name="arrow-up" size={20} color={text.trim() ? colors.forest : colors.ink3} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 46, maxHeight: 120, borderRadius: 23, borderWidth: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 16 },
  send: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
});
