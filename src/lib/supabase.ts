import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { env } from '../config/env';
import { secureSessionStorage } from './secureStorage';

// Talks to Supabase as the signed-in user, so row-level security decides what
// they can read and write. Privileged actions go through the web API instead
// (src/lib/api.ts).
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: secureSessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // PKCE: OAuth returns a one-time code (not tokens) in the redirect URL,
    // so an intercepted deep link can't be replayed.
    flowType: 'pkce',
  },
});

// Only refresh tokens while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
