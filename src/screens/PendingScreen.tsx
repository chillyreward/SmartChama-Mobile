import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button, Panel, T } from '../ui';

/** Shown while an official has not yet approved this member. */
export function WaitingForApproval({ groupName, note }: { groupName?: string | null; note?: string }) {
  const { refreshAuth, signOut } = useAuth();
  const { colors } = useTheme();
  const [checking, setChecking] = useState(false);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <View style={{ flex: 1, padding: 22, justifyContent: 'center' }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="hourglass-outline" size={26} color={colors.lavenderInk} />
        </View>
        <T v="hero" style={{ marginTop: 20 }}>Waiting for approval</T>
        <T v="body" tone="ink2" style={{ marginTop: 10 }}>
          {note || `Your request to join ${groupName || 'the group'} is with its officials. The group opens for you as soon as one of them approves it.`}
        </T>
        <Panel tone="sage" style={{ marginTop: 22 }}>
          <T v="small" tone="sageInk">If it is taking long, ask your chair or treasurer to open Members and look under Waiting for you.</T>
        </Panel>
        <View style={{ gap: 10, marginTop: 28 }}>
          <Button label="Check again" size="lg" loading={checking} onPress={async () => { setChecking(true); await refreshAuth(); setChecking(false); }} />
          <Button label="Sign out" variant="ghost" onPress={signOut} />
        </View>
      </View>
    </SafeAreaView>
  );
}

export const PendingScreen: React.FC = () => {
  const { group } = useAuth();
  return <WaitingForApproval groupName={group?.name} />;
};
