import { env } from './env';

// Feature flags. Switch a feature on here once its backend and any integration
// it needs (see src/integrations) are live. Keeping unfinished features off
// avoids shipping broken screens to Play reviewers and users.

// Expo only inlines process.env.EXPO_PUBLIC_* when written out literally, so
// each flag reads its variable explicitly.
const flag = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined || raw === '') return fallback;
  return raw === 'true' || raw === '1';
};

export const features = {
  /** Phone number + SMS code sign-in (needs SMS provider on the web API). */
  phoneOtpLogin: flag(process.env.EXPO_PUBLIC_FEATURE_PHONE_OTP_LOGIN, true),
  /** Google sign-in (needs Google provider + smartchama://auth/callback redirect in Supabase). */
  googleSignIn: flag(process.env.EXPO_PUBLIC_FEATURE_GOOGLE_SIGN_IN, true),
  /** Apple sign-in (needs the Apple provider switched on in Supabase). */
  appleSignIn: flag(process.env.EXPO_PUBLIC_FEATURE_APPLE_SIGN_IN, true),
  /** Group chat (needs chama_messages table, migration Part 8). */
  groupChat: flag(process.env.EXPO_PUBLIC_FEATURE_GROUP_CHAT, true),
  /** M-Pesa STK push for contributions and loan repayments. */
  mpesaPayments: flag(process.env.EXPO_PUBLIC_FEATURE_MPESA_PAYMENTS, true),
  /** AI assistant (web /api/chat). */
  aiAssistant: flag(process.env.EXPO_PUBLIC_FEATURE_AI_ASSISTANT, false),
  /** SmartGrow investments. */
  smartGrow: flag(process.env.EXPO_PUBLIC_FEATURE_SMARTGROW, true),
  /** Merry-go-round, welfare and penalties screens. */
  merryGoRound: flag(process.env.EXPO_PUBLIC_FEATURE_MERRY_GO_ROUND, true),
  welfare: flag(process.env.EXPO_PUBLIC_FEATURE_WELFARE, true),
  /** Lock the app behind biometrics / device PIN after it has been in the background. */
  appLock: flag(process.env.EXPO_PUBLIC_FEATURE_APP_LOCK, true),
  /** Block screenshots and screen recording on money screens. */
  secureScreens: flag(process.env.EXPO_PUBLIC_FEATURE_SECURE_SCREENS, true),
  /** Pre-filled demo accounts on the sign-in screen. Never in production. */
  demoLogin: !env.isProduction && flag(process.env.EXPO_PUBLIC_FEATURE_DEMO_LOGIN, false),
} as const;

export type FeatureName = keyof typeof features;
