import { env } from '../config/env';
import { integrations } from '../integrations';

// Logs to the console in development only. Production builds send errors to
// the crash-reporting integration (no-op until one is configured) and never
// print request bodies, tokens or phone numbers to logcat.

export const logger = {
  debug(...args: unknown[]) {
    if (!env.isProduction) console.log(...args);
  },
  warn(message: string, context?: Record<string, unknown>) {
    if (!env.isProduction) console.warn(message, context ?? '');
  },
  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    if (!env.isProduction) console.error(message, error ?? '', context ?? '');
    integrations.crashReporting.captureException(error ?? new Error(message), { message, ...context });
  },
};
