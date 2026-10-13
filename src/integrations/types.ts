// Contracts for third-party integrations. Screens and services depend only on
// these interfaces; src/integrations/index.ts decides which implementation is
// active. To add a real provider, implement the interface in its own file and
// register it in index.ts (see docs/INTEGRATIONS.md).

/** Crash & error reporting (e.g. Sentry, Firebase Crashlytics). */
export interface CrashReporting {
  readonly name: string;
  init(): void;
  captureException(error: unknown, context?: Record<string, unknown>): void;
  /** Use the opaque user id only: never phone, email or name. */
  setUser(userId: string | null): void;
}

/** Product analytics (e.g. Firebase Analytics, PostHog). Must respect consent. */
export interface Analytics {
  readonly name: string;
  init(): void;
  setConsent(granted: boolean): void;
  track(event: string, properties?: Record<string, string | number | boolean>): void;
  screen(name: string): void;
  setUser(userId: string | null): void;
}

/** Push notifications (Expo push / FCM). */
export interface PushNotifications {
  readonly name: string;
  /** Ask for permission (Android 13+ runtime prompt) and save the device token. */
  register(userId: string): Promise<string | null>;
  /** Remove this device's token from the profile (on sign-out). */
  unregister(userId: string): Promise<void>;
}

/** Device / app attestation (Google Play Integrity API). */
export interface AppIntegrity {
  readonly name: string;
  /**
   * Returns an integrity token for the server to verify with Google, bound to
   * a server-issued nonce. Null means "not available": the server decides
   * whether to allow the request.
   */
  requestToken(nonce: string): Promise<string | null>;
}

/** App updates: Play in-app updates for native releases, expo-updates for OTA JS fixes. */
export interface AppUpdates {
  readonly name: string;
  /** Returns true if an update was found and applied (app may reload). */
  checkAndApply(): Promise<boolean>;
}

/** Mobile money provider. M-Pesa is live; others (Airtel Money, cards) slot in here. */
export interface MobileMoney {
  readonly id: 'mpesa' | 'airtel_money' | 'card';
  readonly label: string;
  readonly enabled: boolean;
  /** Starts a payment request on the member's phone; resolves with the server's contribution id. */
  requestPayment(input: {
    phone: string;
    amount: number;
    chamaId: string;
    membershipId: string;
    reference?: string;
  }): Promise<{ contributionId: string; checkoutRequestId: string }>;
}

/** Identity verification / KYC (e.g. Smile ID, IPRS lookup via a licensed partner). */
export interface IdentityVerification {
  readonly name: string;
  readonly enabled: boolean;
  /** Starts verification for the signed-in user; resolves with a status the server confirms. */
  startVerification(): Promise<'verified' | 'pending' | 'unavailable'>;
}

/** AI assistant (web /api/chat). */
export interface AiAssistant {
  readonly name: string;
  readonly enabled: boolean;
  ask(message: string, history: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string>;
}

export interface IntegrationRegistry {
  crashReporting: CrashReporting;
  analytics: Analytics;
  push: PushNotifications;
  appIntegrity: AppIntegrity;
  appUpdates: AppUpdates;
  mobileMoney: Record<MobileMoney['id'], MobileMoney>;
  identity: IdentityVerification;
  ai: AiAssistant;
}
