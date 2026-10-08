import { env } from '../config/env';
import { supabase } from './supabase';

// Single client for the SmartChama web API (Next.js on Vercel). Every request
// carries the user's Supabase access token as a Bearer token; the API derives
// the user from it and never trusts ids sent in the body.

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Send without a session (sign-in, OTP). */
  anonymous?: boolean;
  timeoutMs?: number;
};

export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'POST', body, anonymous = false, timeoutMs = 20000 } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (!anonymous) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new ApiError('Please sign in again.', 401);
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err: any) {
    throw new ApiError(
      err?.name === 'AbortError'
        ? 'The server took too long to respond. Check your connection and try again.'
        : 'Could not reach SmartChama. Check your internet connection.',
      0
    );
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error || 'Something went wrong. Please try again.', res.status, data?.code);
  }
  return data as T;
}

// ---- Typed endpoints used by the app ----

export type StkPushResult = { success: true; contributionId: string; checkoutRequestId: string; timeoutSeconds?: number };

export const endpoints = {
  sendOtp: (phone_number: string) =>
    api<{ success: boolean }>('/api/auth/send-otp', { body: { phone_number, purpose: 'login' }, anonymous: true }),

  verifyOtp: (phone_number: string, code: string) =>
    api<{ success: boolean; isNewUser: boolean; token_hash: string | null }>('/api/auth/verify-otp', {
      body: { phone_number, code },
      anonymous: true,
    }),

  joinChama: (code: string) =>
    api<{ success: boolean; chamaId: string; chamaName: string; pending: boolean; alreadyMember: boolean }>(
      '/api/admin/create-group',
      { body: { code } }
    ),

  stkPush: (input: { phone: string; amount: number; chama_id: string; membership_id: string; account_ref?: string; loan_id?: string }) =>
    api<StkPushResult>('/api/mpesa/stk-push', { body: input, timeoutMs: 30000 }),

  deleteAccount: () => api<{ success: boolean }>('/api/account/delete', { body: { confirm: 'DELETE' } }),

  /** Text a 6-digit code to a number the user wants to add or change. */
  sendPhoneCode: (phone_number: string) =>
    api<{ success: boolean; phone: string }>('/api/phone/send-code', { body: { phone_number } }),

  /** Confirm the code; the server then saves the number as verified. */
  verifyPhone: (phone_number: string, code: string) =>
    api<{ success: boolean; phone: string }>('/api/phone/verify', { body: { phone_number, code } }),
};
