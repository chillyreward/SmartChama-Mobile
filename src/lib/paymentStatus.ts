import { supabase } from './supabase';

export type PaymentOutcome =
  | { status: 'confirmed'; receipt: string | null }
  | { status: 'failed'; reason: string | null }
  | { status: 'timeout' };

/**
 * Watches one contribution row (the one the server created for this STK push)
 * until the server marks it confirmed or failed. The server only confirms after
 * verifying the payment with Safaricom, so the app never decides on its own.
 *
 * Returns a cancel function: call it when the screen unmounts.
 */
export function watchPayment(
  contributionId: string,
  onOutcome: (outcome: PaymentOutcome) => void,
  { intervalMs = 4000, timeoutMs = 120000 } = {}
): () => void {
  let stopped = false;
  const startedAt = Date.now();

  const tick = async () => {
    if (stopped) return;
    const { data } = await supabase
      .from('contributions_v2')
      .select('status, mpesa_receipt, failed_reason')
      .eq('id', contributionId)
      .maybeSingle();
    if (stopped) return;

    if (data?.status === 'confirmed') {
      stopped = true;
      onOutcome({ status: 'confirmed', receipt: data.mpesa_receipt ?? null });
      return;
    }
    if (data?.status === 'failed' || data?.status === 'partial') {
      stopped = true;
      onOutcome({ status: 'failed', reason: data.failed_reason ?? null });
      return;
    }
    if (Date.now() - startedAt >= timeoutMs) {
      stopped = true;
      onOutcome({ status: 'timeout' });
      return;
    }
    setTimeout(tick, intervalMs);
  };

  setTimeout(tick, intervalMs);
  return () => {
    stopped = true;
  };
}
