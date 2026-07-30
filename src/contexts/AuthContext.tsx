import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { Chama, ChamaMembership, Profile } from '../types/database';

interface AuthContextType {
  session: Session | null;
  member: (ChamaMembership & { profiles?: Profile }) | null;
  group: Chama | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  member: null,
  group: null,
  isLoading: true,
  signOut: async () => {},
  refreshAuth: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<(ChamaMembership & { profiles?: Profile }) | null>(null);
  const [group, setGroup] = useState<Chama | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Query chama_memberships joined with chamas_v2 and profiles
      const { data: memberships, error } = await supabase
        .from('chama_memberships')
        .select(`
          *,
          profiles (*),
          chamas_v2 (*)
        `)
        .eq('profile_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching membership data:', error);
        return;
      }

      if (memberships && memberships.length > 0) {
        const currentMembership = memberships[0];
        const currentGroup = currentMembership.chamas_v2 as Chama;

        setMember({
          ...currentMembership,
          profiles: currentMembership.profiles as Profile,
        });
        setGroup(currentGroup || null);

        // Register push token
        try {
          const { registerForPushNotificationsAsync } = await import('../lib/notifications');
          await registerForPushNotificationsAsync(userId);
        } catch (pushErr) {
          console.log('Push notification registration skipped:', pushErr);
        }
      } else {
        setMember(null);
        setGroup(null);
      }
    } catch (err) {
      console.error('Unexpected error fetching user data:', err);
    }
  };

  const refreshAuth = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session?.user?.id) {
      await fetchUserData(data.session.user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          setSession(data.session);
          if (data.session?.user?.id) {
            await fetchUserData(data.session.user.id);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (mounted) {
        setSession(newSession);
        if (newSession?.user?.id) {
          await fetchUserData(newSession.user.id);
        } else {
          setMember(null);
          setGroup(null);
        }
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      await SecureStore.deleteItemAsync('supabase.auth.token').catch(() => {});
      setSession(null);
      setMember(null);
      setGroup(null);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        member,
        group,
        isLoading,
        signOut,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
