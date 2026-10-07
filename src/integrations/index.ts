import type { IntegrationRegistry } from './types';
import {
  noopAi,
  noopAnalytics,
  noopAppIntegrity,
  noopCrashReporting,
  noopIdentity,
  unavailableMoney,
} from './noop';
import { mpesa } from './mpesa';
import { expoPush } from './expoPush';
import { otaUpdates } from './otaUpdates';

// The one place that decides which provider backs each integration.
// Swap a no-op for a real implementation here; nothing else changes.
//
//  Integration       Active now          Planned / slot for
//  ---------------   -----------------   ---------------------------------------
//  crashReporting    none                Sentry or Firebase Crashlytics
//  analytics         none                Firebase Analytics / PostHog (consent-gated)
//  push              Expo push (FCM)     -
//  appIntegrity      none                Google Play Integrity API (+ server check)
//  appUpdates        EAS Update (OTA)    + Play in-app updates for native releases
//  mobileMoney       M-Pesa (via API)    Airtel Money, card payments
//  identity          none                Smile ID / licensed IPRS KYC partner
//  ai                none                web /api/chat assistant
export const integrations: IntegrationRegistry = {
  crashReporting: noopCrashReporting,
  analytics: noopAnalytics,
  push: expoPush,
  appIntegrity: noopAppIntegrity,
  appUpdates: otaUpdates,
  mobileMoney: {
    mpesa,
    airtel_money: unavailableMoney('airtel_money', 'Airtel Money'),
    card: unavailableMoney('card', 'Card'),
  },
  identity: noopIdentity,
  ai: noopAi,
};

export function initIntegrations() {
  integrations.crashReporting.init();
  integrations.analytics.init();
  // Analytics stays off until the user consents (Data safety + Kenya DPA).
  integrations.analytics.setConsent(false);
}

export type { IntegrationRegistry } from './types';
