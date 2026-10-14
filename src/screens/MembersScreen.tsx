import React, { useEffect, useState } from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { env } from '../config/env';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';

export const MembersScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { session, member, group, refreshAuth } = useAuth();
  const { colors: themeColors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isAdmin = member?.role && ['admin', 'chairlady', 'treasurer', 'secretary'].includes(member.role);

  const fetchMembers = async () => {
    if (!group?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chama_memberships')
        .select(`
          *,
          profiles (
            full_name,
            phone_number,
            email
          )
        `)
        .eq('chama_id', group.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const items = data || [];
      setActiveMembers(items.filter((m) => m.status === 'active'));
      setPendingMembers(items.filter((m) => m.status === 'pending'));
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [group?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAuth();
    await fetchMembers();
  };

  // Share Group Invite Code
  const handleShareInvite = async () => {
    try {
      const message = `Join ${group?.name || 'our Chama'} on Akibora! Use group invite code: ${group?.group_code}. Join at ${env.apiBaseUrl}/signup?code=${group?.group_code}`;
      await Share.share({ message });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // Export Members Roster PDF to Downloads / Share Sheet (No printer modal)
  const handleExportPDF = async () => {
    try {
      const today = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
      const rowsHtml = activeMembers.map((m, idx) => {
        const bg = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
        const name = m.profiles?.full_name || 'Member';
        const phone = m.profiles?.phone_number || 'N/A';
        const role = m.role || 'Member';

        return `<tr style="background-color: ${bg}; border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 10px 12px; font-size: 13px;">${idx + 1}</td>
          <td style="padding: 10px 12px; font-size: 13px; font-weight: bold; color: #111827;">${name}</td>
          <td style="padding: 10px 12px; font-size: 13px; color: #374151;">${phone}</td>
          <td style="padding: 10px 12px; font-size: 13px; color: #16A34A; font-weight: bold; text-transform: uppercase;">${role}</td>
        </tr>`;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #1F2937; }
            .header { background-color: #22C55E; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 22px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { background-color: #16A34A; color: white; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; }
            .footer { margin-top: 30px; padding-top: 12px; border-top: 2px solid #22C55E; text-align: center; color: #6B7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${group?.name || 'Akibora'} — Members Roster</h1>
            <p style="margin:4px 0 0 0; font-size:13px; opacity:0.9;">Total Active Members: ${activeMembers.length} • Generated: ${today}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Full Name</th>
                <th>Phone Number</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="4" style="padding:16px; text-align:center; color:#9CA3AF;">No members found.</td></tr>'}
            </tbody>
          </table>
          <div class="footer">Akibora Mobile Ledger • Verified Group Roster • www.akibora.co.ke</div>
        </body>
        </html>
      `;

      // Creates PDF file silently without opening printer UI
      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      // Opens native Share Sheet so user can Save to Files/Downloads/WhatsApp
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `${group?.name || 'Akibora'} Members Roster PDF`,
        });
      } else {
        await Share.share({ title: 'Members Roster PDF', url: uri });
      }
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Could not generate PDF');
    }
  };

  // Approve Member Request
  const handleApprove = async (targetMember: any) => {
    setProcessingId(targetMember.id);
    try {
      const { error } = await supabase
        .from('chama_memberships')
        .update({ status: 'active' })
        .eq('id', targetMember.id);

      if (error) throw error;

      // Send Notification to Approved Member
      await supabase.from('notifications').insert({
        chama_id: group?.id,
        profile_id: targetMember.profile_id,
        type: 'member_approved',
        title: 'Membership Approved!',
        message: `Your request to join ${group?.name || 'the chama'} has been approved by an admin.`,
      });

      Alert.alert('Approved', `${targetMember.profiles?.full_name || 'Member'} is now an active member.`);
      fetchMembers();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to approve member.');
    } finally {
      setProcessingId(null);
    }
  };

  // Reject Member Request
  const handleReject = async (targetMember: any) => {
    setProcessingId(targetMember.id);
    try {
      const { error } = await supabase
        .from('chama_memberships')
        .update({ status: 'rejected' })
        .eq('id', targetMember.id);

      if (error) throw error;

      Alert.alert('Rejected', 'Member request rejected.');
      fetchMembers();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reject request.');
    } finally {
      setProcessingId(null);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'M';
    const parts = name.trim().split(' ');
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
      case 'chairlady':
        return { bg: '#DCFCE7', color: '#15803D', label: 'Admin 👑' };
      case 'treasurer':
        return { bg: '#FEF3C7', color: '#B45309', label: 'Treasurer 💰' };
      case 'secretary':
        return { bg: '#E0F2FE', color: '#0369A1', label: 'Secretary 📝' };
      default:
        return { bg: '#F3F4F6', color: '#4B5563', label: 'Member' };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Group & Members</Text>
          <Text style={styles.headerSub}>{group?.name || 'Akibora Group'}</Text>
        </View>

        {/* Section 1: Group Info Card */}
        <View style={styles.groupCard}>
          <Text style={styles.groupCardLabel}>GROUP INVITE CODE</Text>
          <Text style={styles.groupCode}>{group?.group_code || 'CHAMA1'}</Text>

          <View style={styles.cardInfoRow}>
            <Text style={styles.infoTag}>👥 {activeMembers.length} Active Members</Text>
            <Text style={styles.infoTag}>
              📅 Created:{' '}
              {group?.created_at
                ? new Date(group.created_at).toLocaleDateString('en-GB', {
                    month: 'short',
                    year: 'numeric',
                  })
                : '2024'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[styles.shareButton, { flex: 1 }]} onPress={handleShareInvite}>
              <Text style={styles.shareButtonText}>📲 Share Invite Code</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.shareButton, { flex: 1, backgroundColor: '#16A34A' }]} onPress={handleExportPDF}>
              <Text style={styles.shareButtonText}>📄 Export PDF</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Admin Pending Approval Requests */}
        {isAdmin && pendingMembers.length > 0 && (
          <View style={styles.pendingSection}>
            <Text style={styles.sectionTitleAlert}>⚠️ Pending Approval ({pendingMembers.length})</Text>

            {pendingMembers.map((m) => (
              <View key={m.id} style={styles.pendingRow}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{getInitials(m.profiles?.full_name)}</Text>
                </View>

                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{m.profiles?.full_name || 'New Member'}</Text>
                  <Text style={styles.memberPhone}>{m.profiles?.phone_number || 'No phone'}</Text>
                </View>

                <View style={styles.actionBtnRow}>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApprove(m)}
                    disabled={processingId === m.id}
                  >
                    {processingId === m.id ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.actionBtnText}>Approve</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleReject(m)}
                    disabled={processingId === m.id}
                  >
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Section 3: Active Members List */}
        <Text style={styles.sectionTitle}>Active Members ({activeMembers.length})</Text>

        {activeMembers.map((m) => {
          const badge = getRoleBadge(m.role);
          return (
            <TouchableOpacity
              key={m.id}
              style={styles.memberRow}
              onPress={() => setSelectedMember(m)}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(m.profiles?.full_name)}</Text>
              </View>

              <View style={styles.memberInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.memberName}>{m.profiles?.full_name || 'Member'}</Text>
                  {['admin', 'chairlady'].includes(m.role) ? (
                    <Text style={{ fontSize: 14, marginLeft: 4 }}>👑</Text>
                  ) : null}
                </View>
                <Text style={styles.memberPhone}>{m.profiles?.phone_number || m.profiles?.email || '—'}</Text>
              </View>

              <View style={styles.memberRight}>
                <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.roleText, { color: badge.color }]}>{badge.label}</Text>
                </View>
                <Text style={styles.trustScoreText}>⭐ {m.trust_score || 100}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* MEMBER DETAIL MODAL */}
      <Modal visible={!!selectedMember} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Member Details</Text>
              <TouchableOpacity onPress={() => setSelectedMember(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedMember && (
              <View style={styles.modalBody}>
                <View style={[styles.avatarCircle, { width: 64, height: 64, borderRadius: 32, alignSelf: 'center', marginBottom: 12 }]}>
                  <Text style={[styles.avatarText, { fontSize: 24 }]}>
                    {getInitials(selectedMember.profiles?.full_name)}
                  </Text>
                </View>

                <Text style={styles.detailName}>{selectedMember.profiles?.full_name || 'Member'}</Text>
                <Text style={styles.detailSub}>{selectedMember.profiles?.phone_number || '—'}</Text>

                <View style={styles.detailGrid}>
                  <View style={styles.detailGridBox}>
                    <Text style={styles.detailBoxLabel}>ROLE</Text>
                    <Text style={styles.detailBoxVal}>{selectedMember.role?.toUpperCase() || 'MEMBER'}</Text>
                  </View>
                  <View style={styles.detailGridBox}>
                    <Text style={styles.detailBoxLabel}>TRUST SCORE</Text>
                    <Text style={[styles.detailBoxVal, { color: colors.primary }]}>
                      {selectedMember.trust_score || 100} / 100
                    </Text>
                  </View>
                  <View style={styles.detailGridBox}>
                    <Text style={styles.detailBoxLabel}>STREAK</Text>
                    <Text style={styles.detailBoxVal}>{selectedMember.contribution_streak || 0} Months</Text>
                  </View>
                  <View style={styles.detailGridBox}>
                    <Text style={styles.detailBoxLabel}>JOINED</Text>
                    <Text style={styles.detailBoxVal}>
                      {selectedMember.created_at
                        ? new Date(selectedMember.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : '—'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => setSelectedMember(null)}
                >
                  <Text style={styles.closeModalBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  headerSub: {
    fontSize: 14,
    color: colors.textSecondary.light,
    marginTop: 2,
  },
  groupCard: {
    backgroundColor: colors.card.light,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  groupCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary.light,
    letterSpacing: 0.5,
  },
  groupCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 4,
    marginVertical: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 10,
  },
  infoTag: {
    fontSize: 12,
    color: colors.textSecondary.light,
    fontWeight: '600',
  },
  shareButton: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 6,
  },
  shareButtonText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: 'bold',
  },
  pendingSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  sectionTitleAlert: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 12,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  approveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.light,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0369A1',
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  memberPhone: {
    fontSize: 12,
    color: colors.textSecondary.light,
    marginTop: 2,
  },
  memberRight: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  trustScoreText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary.light,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card.light,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  closeBtn: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textSecondary.light,
  },
  modalBody: {
    alignItems: 'center',
  },
  detailName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  detailSub: {
    fontSize: 14,
    color: colors.textSecondary.light,
    marginBottom: 20,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginBottom: 20,
  },
  detailGridBox: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  detailBoxLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary.light,
  },
  detailBoxVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.light,
    marginTop: 4,
  },
  closeModalBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
