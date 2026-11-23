// When contributions fall due. Shared by the dashboards, group settings, the
// create/schedule API routes and the daily reminder job, so they all agree.
//
// A group's schedule is its contribution_frequency plus its rows in
// chama_contribution_dates:
//   daily                       every day, no dates
//   custom                      exactly the listed dates
//   monthly / quarterly / yearly  repeat from a start date (the latest row)
//   weekly / biweekly           repeat from a start date if there is one
//   monthly with no dates       older groups: contribution_due_day each month
// All dates are YYYY-MM-DD in Kenya time.

export type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

export type GroupSchedule = {
  frequency: string | null | undefined
  dates: string[]
  dueDay?: number | null
}

const MONTH_STEPS: Record<string, number> = { monthly: 1, quarterly: 3, yearly: 12 }
const DAY_STEPS: Record<string, number> = { weekly: 7, biweekly: 14 }

export function todayNairobi(): string {
  // en-CA formats as YYYY-MM-DD
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
}

const parse = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return { y, m: m - 1, day }
}
const fmt = (dt: Date) => dt.toISOString().slice(0, 10)
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate()

export function addDays(d: string, n: number): string {
  const { y, m, day } = parse(d)
  return fmt(new Date(Date.UTC(y, m, day + n)))
}

// The anchor's day of the month, or the last day when the month is shorter
// (a schedule starting on the 31st falls on 30 April, 28/29 February)
function addMonths(anchor: string, months: number): string {
  const { y, m, day } = parse(anchor)
  const target = new Date(Date.UTC(y, m + months, 1))
  const ty = target.getUTCFullYear()
  const tm = target.getUTCMonth()
  return fmt(new Date(Date.UTC(ty, tm, Math.min(day, daysInMonth(ty, tm)))))
}

function step(anchor: string, frequency: string, k: number): string | null {
  if (MONTH_STEPS[frequency]) return addMonths(anchor, MONTH_STEPS[frequency] * k)
  if (DAY_STEPS[frequency]) return addDays(anchor, DAY_STEPS[frequency] * k)
  return null
}

function anchorOf(s: GroupSchedule): string | null {
  if (s.dates.length) return [...s.dates].sort()[s.dates.length - 1]
  // Older monthly groups: due on contribution_due_day, counted from this month
  if (s.frequency === 'monthly' && s.dueDay) {
    const { y, m } = parse(todayNairobi())
    return fmt(new Date(Date.UTC(y, m, Math.min(Number(s.dueDay), daysInMonth(y, m)))))
  }
  return null
}

/** The next date a contribution is due, today included; null when unknown or none left. */
export function nextDueDate(s: GroupSchedule, today = todayNairobi()): string | null {
  const f = s.frequency || ''
  if (f === 'daily') return today
  if (f === 'custom') return [...s.dates].sort().find((d) => d >= today) ?? null
  const anchor = anchorOf(s)
  if (!anchor || !(MONTH_STEPS[f] || DAY_STEPS[f])) return null
  if (anchor >= today) return anchor
  // Walk forward from the anchor (bounded: ~100 years of monthly steps)
  for (let k = 1; k < 1300; k++) {
    const d = step(anchor, f, k)!
    if (d >= today) return d
  }
  return null
}

/**
 * Start of the cycle that ends on `due`: a contribution confirmed on or after
 * this date counts as paid for that due date.
 */
export function cycleStart(s: GroupSchedule, due: string): string {
  const f = s.frequency || ''
  if (f === 'daily') return due
  if (f === 'custom') {
    const before = [...s.dates].sort().filter((d) => d < due)
    return before.length ? addDays(before[before.length - 1], 1) : addDays(due, -30)
  }
  const prev = step(due, f, -1)
  return prev ? addDays(prev, 1) : addDays(due, -30)
}

export function prettyDate(d: string): string {
  const { y, m, day } = parse(d)
  return new Date(Date.UTC(y, m, day)).toLocaleDateString('en-KE', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

export function describeSchedule(s: GroupSchedule): string {
  switch (s.frequency) {
    case 'daily': return 'Every day'
    case 'custom': return 'On chosen dates'
    case 'monthly': return 'Every month'
    case 'quarterly': return 'Every 3 months'
    case 'yearly': return 'Every year'
    case 'weekly': return 'Every week'
    case 'biweekly': return 'Every 2 weeks'
    default: return 'Not set'
  }
}

// ── Validation for dates sent by clients ──

export const FREQUENCIES: Frequency[] = ['daily', 'custom', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']
// Repeat from one start date, stored as the group's single upcoming date
export const RECURRING = ['monthly', 'quarterly', 'yearly']
export const MAX_DATES = 120

/** Real dates, today (Kenya) or later, within two years, no duplicates; null if any is invalid. */
export function cleanScheduleDates(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null
  const today = todayNairobi()
  const limit = addDays(today, 2 * 366)
  const out = new Set<string>()
  for (const d of input) {
    if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null
    const parsed = new Date(d + 'T00:00:00Z')
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== d) return null
    if (d < today || d > limit) return null
    out.add(d)
  }
  return [...out].sort()
}

/** Checks a schedule sent by a client; returns the dates to store or an error message. */
export function validateSchedule(frequency: unknown, dates: unknown): { frequency: Frequency; dates: string[] } | { error: string } {
  const f = FREQUENCIES.includes(frequency as Frequency) ? (frequency as Frequency) : null
  if (!f) return { error: 'Choose a contribution schedule.' }
  const usesDates = f === 'custom' || RECURRING.includes(f)
  if (!usesDates) return { frequency: f, dates: [] }
  const clean = cleanScheduleDates(dates)
  if (!clean || clean.length === 0) {
    return { error: f === 'custom' ? 'Pick at least one contribution date (today or later).' : 'Pick the first contribution date (today or later).' }
  }
  if (clean.length > MAX_DATES) return { error: `Pick at most ${MAX_DATES} dates.` }
  return { frequency: f, dates: RECURRING.includes(f) ? clean.slice(0, 1) : clean }
}
