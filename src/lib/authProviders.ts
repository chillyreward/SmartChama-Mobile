import { useEffect, useState } from 'react';
import { env } from '../config/env';

// Which social sign-in providers are switched on in Supabase (public auth
// settings). Buttons only show for these, so users never hit a
// "provider is not enabled" error.
export type SocialProvider = 'google' | 'apple';

let cache: Promise<Record<string, boolean>> | null = null;

function fetchEnabled(): Promise<Record<string, boolean>> {
  if (!cache) {
    cache = fetch(`${env.supabaseUrl}/auth/v1/settings`, { headers: { apikey: env.supabaseAnonKey } })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: any) => d?.external ?? {})
      .catch(() => {
        cache = null; // retry next time (e.g. offline at launch)
        return {};
      });
  }
  return cache;
}

export function useEnabledSocialProviders(): SocialProvider[] {
  const [enabled, setEnabled] = useState<SocialProvider[]>([]);
  useEffect(() => {
    let alive = true;
    fetchEnabled().then((ext) => {
      if (alive) setEnabled((['google', 'apple'] as SocialProvider[]).filter((p) => ext[p]));
    });
    return () => {
      alive = false;
    };
  }, []);
  return enabled;
}
