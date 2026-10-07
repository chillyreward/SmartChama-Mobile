import type {
  AiAssistant,
  Analytics,
  AppIntegrity,
  AppUpdates,
  CrashReporting,
  IdentityVerification,
  MobileMoney,
} from './types';

// Placeholder implementations: safe to call, do nothing. Each one marks a
// spot where a real provider plugs in later.

export const noopCrashReporting: CrashReporting = {
  name: 'none',
  init() {},
  captureException() {},
  setUser() {},
};

export const noopAnalytics: Analytics = {
  name: 'none',
  init() {},
  setConsent() {},
  track() {},
  screen() {},
  setUser() {},
};

export const noopAppIntegrity: AppIntegrity = {
  name: 'none',
  async requestToken() {
    return null;
  },
};

export const noopAppUpdates: AppUpdates = {
  name: 'none',
  async checkAndApply() {
    return false;
  },
};

export const unavailableMoney = (id: MobileMoney['id'], label: string): MobileMoney => ({
  id,
  label,
  enabled: false,
  async requestPayment() {
    throw new Error(`${label} is not available yet.`);
  },
});

export const noopIdentity: IdentityVerification = {
  name: 'none',
  enabled: false,
  async startVerification() {
    return 'unavailable';
  },
};

export const noopAi: AiAssistant = {
  name: 'none',
  enabled: false,
  async ask() {
    throw new Error('The assistant is not available yet.');
  },
};
