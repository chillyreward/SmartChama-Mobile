import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { Chama, ChamaMembership, Profile } from '../types/database';

interface AuthContextType {
  session: Session | null;
  member: (ChamaMembership & { profiles?: Profile }) | null;
  group: Chama | null;
  userMemberships: Array<ChamaMembership & { profiles?: Profile; chamas_v2?: Chama }>;
  isLoading: boolean;
  /** True when the signed-in user authenticated via Google but has not yet
   *  saved a phone number. The navigator uses this to gate the
   *  CompleteProfileScreen before allowing access to the main app. */
  needsPhoneNumber: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  switchActiveGroup: (chamaId: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  member: null,
  group: null,
  userMemberships: [],
  isLoading: true,
  needsPhoneNumber: false,
  signOut: async () => {},
  refreshAuth: async () => {},
  switchActiveGroup: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<(ChamaMembership & { profiles?: Profile }) | null>(null);
  const [group, setGroup] = useState<Chama | null>(null);
  const [userMemberships, setUserMemberships] = useState<
    Array<ChamaMembership & { profiles?: Profile; chamas_v2?: Chama }>
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [needsPhoneNumber, setNeedsPhoneNumber] = useState<boolean>(false);

  /**
   * Ensure a row exists in the `profiles` table for this user.
   *
   * Called after every sign-in. For Google users Supabase creates the
   * auth.users row automatically but NOT a profiles row — we upsert one
   * here so the rest of the app always has a profile to work with.
   *
   * Returns the profile so the caller can inspect phone_number immediately.
   */
  const ensureProfile = async (userId: string): Promise<Profile | null> => {
    try {
      // 1. Try to fetch an existing profile first
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (existing) return existing as Profile;

      // 2. No profile yet — this is a first-time Google sign-in.
      //    Pull the name/email from the Supabase auth user metadata.
      const { data: { user } } = await supabase.auth.getUser();
      const fullName: string =
        user?.user_metadata?.full_name ??
        user?.user_metadata?.name ??
        '';
      const email: string = user?.email ?? '';

      const { data: created, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: fullName,
          email,
          phone_number: '', // blank — will be filled in CompleteProfileScreen
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile for Google user:', error);
        return null;
      }

      return created as Profile;
    } catch (err) {
      console.error('ensureProfile error:', err);
      return null;
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      // Guarantee a profile row exists (handles first-time Google sign-ins)
      const profile = await ensureProfile(userId);

      // If the profile has no phone number the user must complete their
      // profile before they can access the rest of the app.
      const missingPhone = !profile?.phone_number;
      setNeedsPhoneNumber(missingPhone);

      // If phone is missing there's no point loading memberships yet —
      // the user will be routed to CompleteProfileScreen first.
      if (missingPhone) return;

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
        const typedMemberships = memberships as Array<
          ChamaMembership & { profiles?: Profile; chamas_v2?: Chama }
        >;
        setUserMemberships(typedMemberships);

        // Keep current group if already selected, otherwise default to first
        const selectedId = group?.id;
        const matched = selectedId
          ? typedMemberships.find((m) => m.chama_id === selectedId) || typedMemberships[0]
          : typedMemberships[0];

        const currentGroup = matched.chamas_v2 as Chama;

        setMember({
          ...matched,
          profiles: matched.profiles as Profile,
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
        setUserMemberships([]);
        setMember(null);
        setGroup(null);
      }
    } catch (err) {
      console.error('Unexpected error fetching user data:', err);
    }
  };

  const switchActiveGroup = (chamaId: string) => {
    const matched = userMemberships.find((m) => m.chama_id === chamaId);
    if (matched) {
      const currentGroup = matched.chamas_v2 as Chama;
      setMember({
        ...matched,
        profiles: matched.profiles as Profile,
      });
      setGroup(currentGroup || null);
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

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (mounted) {
          setSession(newSession);
          if (newSession?.user?.id) {
            await fetchUserData(newSession.user.id);
          } else {
            setUserMemberships([]);
            setMember(null);
            setGroup(null);
            setNeedsPhoneNumber(false);
          }
          setIsLoading(false);
        }
      }
    );

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
      setUserMemberships([]);
      setMember(null);
      setGroup(null);
      setNeedsPhoneNumber(false);
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
        userMemberships,
        isLoading,
        needsPhoneNumber,
        signOut,
        refreshAuth,
        switchActiveGroup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
