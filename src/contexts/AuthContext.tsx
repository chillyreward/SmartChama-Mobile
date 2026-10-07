import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';
import { logger } from '../lib/logger';
import { integrations } from '../integrations';
import { Chama, ChamaMembership, Profile } from '../types/database';

type MembershipRow = ChamaMembership & { profiles?: Profile; chamas_v2?: Chama };

interface AuthContextType {
  session: Session | null;
  member: (ChamaMembership & { profiles?: Profile }) | null;
  group: Chama | null;
  userMemberships: MembershipRow[];
  isLoading: boolean;
  /** Signed in (e.g. with Google) but no phone number saved yet: the navigator
   *  shows CompleteProfileScreen before the main app. */
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

// Memberships that should open the app: active ones first, then pending requests.
const VISIBLE_STATUSES = ['active', 'pending'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<(ChamaMembership & { profiles?: Profile }) | null>(null);
  const [group, setGroup] = useState<Chama | null>(null);
  const [userMemberships, setUserMemberships] = useState<MembershipRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [needsPhoneNumber, setNeedsPhoneNumber] = useState<boolean>(false);
  const selectedGroupId = useRef<string | null>(null);
  const pushRegisteredFor = useRef<string | null>(null);

  const clearUserState = () => {
    setUserMemberships([]);
    setMember(null);
    setGroup(null);
    setNeedsPhoneNumber(false);
    selectedGroupId.current = null;
  };

  /**
   * The database trigger (handle_new_user) creates a profile for every new
   * account, including Google sign-ins. This only covers accounts created
   * before that trigger existed.
   */
  const loadProfile = async (userId: string): Promise<Profile | null> => {
    const { data: existing } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (existing) return existing as Profile;

    const { data: { user } } = await supabase.auth.getUser();
    const { data: created, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        full_name: user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? 'Member',
        email: user?.email ?? null,
        // Left NULL (not ''): phone numbers are unique, and '' would collide
        // with the next user who hasn't added one either.
        phone_number: null,
      })
      .select()
      .single();
    if (error) {
      logger.error('Could not create profile', error);
      return null;
    }
    return created as Profile;
  };

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const profile = await loadProfile(userId);
      const missingPhone = !profile?.phone_number;
      setNeedsPhoneNumber(missingPhone);
      if (missingPhone) return;

      const { data: memberships, error } = await supabase
        .from('chama_memberships')
        .select('*, profiles (*), chamas_v2 (*)')
        .eq('profile_id', userId)
        .in('status', VISIBLE_STATUSES)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching memberships', error);
        return;
      }

      const rows = (memberships ?? []) as MembershipRow[];
      // Active memberships first so the app opens on a usable group
      rows.sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active'));
      setUserMemberships(rows);

      if (rows.length === 0) {
        setMember(null);
        setGroup(null);
        return;
      }

      const matched = rows.find((m) => m.chama_id === selectedGroupId.current) ?? rows[0];
      selectedGroupId.current = matched.chama_id;
      setMember({ ...matched, profiles: matched.profiles as Profile });
      setGroup((matched.chamas_v2 as Chama) || null);

      // Ask for notification permission once per sign-in, after the user is
      // in an active group (Android 13+ runtime prompt in context, not at launch).
      if (matched.status === 'active' && pushRegisteredFor.current !== userId) {
        pushRegisteredFor.current = userId;
        integrations.push.register(userId).catch((err) => logger.warn('Push registration skipped', { err: String(err) }));
      }
    } catch (err) {
      logger.error('Unexpected error fetching user data', err);
    }
  }, []);

  const switchActiveGroup = (chamaId: string) => {
    const matched = userMemberships.find((m) => m.chama_id === chamaId);
    if (!matched) return;
    selectedGroupId.current = chamaId;
    setMember({ ...matched, profiles: matched.profiles as Profile });
    setGroup((matched.chamas_v2 as Chama) || null);
    // Cached queries belong to the previous group
    queryClient.clear();
  };

  const refreshAuth = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session?.user?.id) await fetchUserData(data.session.user.id);
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        if (data.session?.user?.id) {
          integrations.crashReporting.setUser(data.session.user.id);
          await fetchUserData(data.session.user.id);
        }
      })
      .catch((err) => logger.error('Auth initialization error', err))
      .finally(() => mounted && setIsLoading(false));

    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession?.user?.id) {
        integrations.crashReporting.setUser(newSession.user.id);
        // Don't await inside the callback (supabase-js deadlocks on nested auth calls)
        setTimeout(() => {
          fetchUserData(newSession.user.id).finally(() => mounted && setIsLoading(false));
        }, 0);
      } else {
        clearUserState();
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signOut = async () => {
    setIsLoading(true);
    try {
      const userId = session?.user?.id;
      if (userId) await integrations.push.unregister(userId).catch(() => {});
      await supabase.auth.signOut();
    } catch (err) {
      logger.error('Sign out error', err);
    } finally {
      // Drop cached financial data and identifiers for the previous user
      queryClient.clear();
      integrations.crashReporting.setUser(null);
      integrations.analytics.setUser(null);
      pushRegisteredFor.current = null;
      setSession(null);
      clearUserState();
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
