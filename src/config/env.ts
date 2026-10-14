// Build-time configuration. Values come from EXPO_PUBLIC_* environment variables,
// which Expo inlines into the JavaScript bundle at build time:
//   - local dev: .env (copy .env.example)
//   - EAS builds: the `env` block of each profile in eas.json, or EAS secrets
//
// Only PUBLIC values belong here. Everything in the bundle can be extracted
// from the APK, so never add a service-role key, M-Pesa secret or API secret.
// Anything privileged must go through the web API, which holds those secrets.

function required(name: string, value: string | undefined): string {
  if (!value || !value.trim()) {
    throw new Error(`Missing ${name}. Copy .env.example to .env (or set it in eas.json) and rebuild.`);
  }
  return value.trim().replace(/\/+$/, '');
}

function requireHttps(name: string, value: string): string {
  if (!value.startsWith('https://')) {
    throw new Error(`${name} must use https:// (cleartext traffic is disabled).`);
  }
  return value;
}

export type AppEnvironment = 'development' | 'preview' | 'production';

const appEnv = (process.env.EXPO_PUBLIC_APP_ENV as AppEnvironment) || 'development';

const apiBaseUrl = requireHttps('EXPO_PUBLIC_API_BASE_URL', required('EXPO_PUBLIC_API_BASE_URL', process.env.EXPO_PUBLIC_API_BASE_URL));

export const env = {
  appEnv,
  isProduction: appEnv === 'production',

  supabaseUrl: requireHttps('EXPO_PUBLIC_SUPABASE_URL', required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL)),
  // The anon key is public by design: row-level security protects the data.
  supabaseAnonKey: required('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),

  apiBaseUrl,
  privacyPolicyUrl: `${apiBaseUrl}/privacy`,
  termsUrl: `${apiBaseUrl}/terms`,
  deleteAccountUrl: `${apiBaseUrl}/account/delete`,
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@akibora.co.ke',

  // Deep link used for Google OAuth (PKCE) redirects: akibora://auth/callback
  scheme: 'akibora',
} as const;
