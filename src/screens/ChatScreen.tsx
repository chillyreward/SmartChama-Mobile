import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
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
  const { colors, isDark } = useTheme();

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

      if (!error && data) {
        setMessages(data);
      } else {
        // Fallback default message for empty or new chat channels
        setMessages([
          {
            id: 'welcome-1',
            chama_id: group.id,
            member_id: 'system',
            content: `Karibu to ${group.name} group chat! 💬 Share updates, meeting notes, and payment queries here.`,
            created_at: new Date().toISOString(),
            sender_name: 'SmartChama Assistant',
          },
        ]);
      }
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

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {navigation?.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{group?.name || 'Group Chat'}</Text>
          <Text style={[styles.headerSub, { color: colors.primary }]}>● Realtime Active</Text>
        </View>
      </View>

      {/* Messages List & Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isMe = item.member_id === member?.id;
              const nameToShow =
                item.sender_name || item.chama_memberships?.profiles?.full_name || 'Member';
              const formattedTime = new Date(item.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
                  {!isMe && (
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.avatarText}>{getInitials(nameToShow)}</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.msgBubble,
                      isMe
                        ? { backgroundColor: colors.primary, borderBottomRightRadius: 2 }
                        : {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            borderWidth: 1,
                            borderBottomLeftRadius: 2,
                          },
                    ]}
                  >
                    {!isMe && (
                      <Text style={[styles.senderName, { color: colors.primary }]}>
                        {nameToShow}
                      </Text>
                    )}
                    <Text style={[styles.msgText, { color: isMe ? '#FFFFFF' : colors.text }]}>
                      {item.content}
                    </Text>
                    <Text style={[styles.msgTime, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
                      {formattedTime}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Input Bar */}
        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: isDark ? '#1F2937' : '#F8FAFC', color: colors.text, borderColor: colors.border },
            ]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.border }]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  msgRow: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  msgRowMe: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  msgBubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  msgTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    borderWidth: 1,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
