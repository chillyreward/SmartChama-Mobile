// Trust score breakdown. Mirrors /api/trust-score/calculate on the web so
// members can see exactly where their points come from.
export type TrustRow = { created_at: string; amount: number; payment_method: string | null; mpesa_receipt: string | null };

export function trustBreakdown(rows: TrustRow[], joinedAt: Date | null) {
  const now = new Date();
  const start = joinedAt || (rows[0] ? new Date(rows[0].created_at) : now);
  const monthsActive = Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1);
  const weights: Record<string, number> = {};
  rows.forEach((c) => {
    const d = new Date(c.created_at);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    const w = c.payment_method === 'mpesa' && c.mpesa_receipt ? 1 : 0.5;
    weights[k] = Math.max(weights[k] || 0, w);
  });
  const confirmed = Object.values(weights).reduce((a, b) => a + b, 0);
  let streak = 0;
  const cur = new Date(now.getFullYear(), now.getMonth(), 1);
  while (weights[`${cur.getFullYear()}-${cur.getMonth()}`] !== undefined) { streak++; cur.setMonth(cur.getMonth() - 1); }
  const contribution = Math.min(confirmed / monthsActive, 1) * 55;
  const tenure = Math.min(monthsActive / 24, 1) * 25;
  const participation = (Math.min(streak, 12) / 12) * 20;
  const paidMonths = Object.keys(weights).length;
  return {
    monthsActive,
    paidMonths,
    streak,
    totalSaved: rows.reduce((s, r) => s + Number(r.amount || 0), 0),
    parts: [
      { label: 'Paying every month', points: Math.round(contribution), max: 55, detail: `Contributions in ${paidMonths} of your ${monthsActive} months. M-Pesa payments count fully, cash counts half.` },
      { label: 'Time in the group', points: Math.round(tenure), max: 25, detail: `${monthsActive} ${monthsActive === 1 ? 'month' : 'months'} so far. Full marks at two years.` },
      { label: 'Unbroken streak', points: Math.round(participation), max: 20, detail: `${streak} ${streak === 1 ? 'month' : 'months'} in a row up to this month. Full marks at twelve.` },
    ],
  };
}

export function standing(score: number) {
  if (score >= 80) return { label: 'Strong standing', note: 'You pay reliably and have done for a while.' };
  if (score >= 60) return { label: 'Good standing', note: 'A solid record. A longer unbroken streak is the quickest way up.' };
  if (score >= 40) return { label: 'Building', note: 'Paying every month, on M-Pesa, moves this fastest.' };
  return { label: 'Just starting', note: 'Your score grows with each month you contribute.' };
}
