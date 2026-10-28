/**
 * The career as numbers: every role's dates (parsed from the copy in content.ts, never retyped) become positions on one
 * time axis. The 3D spine, the HUD and the cards all read this model, so they cannot disagree. Framework-free.
 */
import type { HistoryEntry } from '../data/content.types';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

/** A month as `year * 12 + month0`; fractions are positions inside the month. */
export type MonthIndex = number;

export interface RoleSpan {
  readonly id: string;
  readonly title: string;
  readonly dates: string;
  readonly start: MonthIndex;
  readonly end: MonthIndex;
}

export interface Promotion {
  /** Joined here. */
  readonly from: MonthIndex;
  /** Promoted here (the start of the next role). */
  readonly at: MonthIndex;
  readonly months: number;
  /** The marker copy, verbatim ("Promoted in 9 months"). */
  readonly label: string;
}

export interface Station {
  readonly id: string;
  readonly company: string;
  /** Company without the parenthetical group name, for the 3D label ("Paytm"). */
  readonly short: string;
  readonly location: string;
  readonly roles: readonly RoleSpan[];
  readonly start: MonthIndex;
  readonly end: MonthIndex;
  readonly center: MonthIndex;
  /** First start to last end, in the copy's own words ("Jul 2025 — present"). */
  readonly dates: string;
  readonly current: boolean;
  readonly promotion: Promotion | null;
}

export interface TimelineModel {
  /** Same order as the copy: newest first. */
  readonly stations: readonly Station[];
  readonly min: MonthIndex;
  readonly max: MonthIndex;
  /** Months from the earliest start to now. */
  readonly span: number;
  /** January of every year inside the span. */
  readonly years: readonly { readonly year: number; readonly at: MonthIndex }[];
}

const RANGE_SPLIT = /\s+[—–-]\s+/;
const MONTH_YEAR = /([A-Za-z]{3})[A-Za-z]*\s+(\d{4})/;

export function monthIndexOf(date: Date): MonthIndex {
  const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return date.getFullYear() * 12 + date.getMonth() + (date.getDate() - 1) / days;
}

/** "Apr 2026" to the start of that month; null when the text names no month. */
export function parseMonth(text: string): MonthIndex | null {
  const hit = MONTH_YEAR.exec(text);
  if (!hit) return null;
  const month = MONTHS.indexOf((hit[1] ?? '').toLowerCase() as (typeof MONTHS)[number]);
  return month < 0 ? null : Number(hit[2]) * 12 + month;
}

/** "Jul 2025 — Mar 2026" to [start of Jul 2025, end of Mar 2026]; "present" ends now. */
export function parseRange(dates: string, now: Date): { start: MonthIndex; end: MonthIndex } | null {
  const [from, to = ''] = dates.split(RANGE_SPLIT);
  const start = parseMonth(from ?? '');
  if (start === null) return null;
  if (/present/i.test(to)) return { start, end: Math.max(start + 1, monthIndexOf(now)) };
  const last = parseMonth(to);
  return { start, end: (last ?? start) + 1 };
}

function shortName(company: string): string {
  return company.replace(/\s*\(.*\)\s*$/, '').trim();
}

function spanLabel(entry: HistoryEntry): string {
  const first = entry.roles[entry.roles.length - 1]?.dates.split(RANGE_SPLIT)[0] ?? '';
  const last = entry.roles[0]?.dates.split(RANGE_SPLIT)[1] ?? '';
  return last ? `${first} — ${last}` : first;
}

function buildStation(entry: HistoryEntry, now: Date): Station | null {
  const roles: RoleSpan[] = [];
  for (const role of entry.roles) {
    const range = parseRange(role.dates, now);
    if (range) roles.push({ id: role.id, title: role.title, dates: role.dates, ...range });
  }
  if (roles.length === 0) return null;
  const start = Math.min(...roles.map((r) => r.start));
  const end = Math.max(...roles.map((r) => r.end));
  const byStart = [...roles].sort((a, b) => a.start - b.start);
  const next = byStart[1];
  const promotion: Promotion | null =
    entry.marker && next
      ? { from: start, at: next.start, months: Math.round(next.start - start), label: entry.marker }
      : null;
  return {
    id: entry.id,
    company: entry.company,
    short: shortName(entry.company),
    location: entry.location,
    roles,
    start,
    end,
    center: (start + end) / 2,
    dates: spanLabel(entry),
    current: entry.roles.some((r) => /present/i.test(r.dates)),
    promotion,
  };
}

export function buildModel(entries: readonly HistoryEntry[], now: Date): TimelineModel {
  const stations = entries.map((e) => buildStation(e, now)).filter((s): s is Station => s !== null);
  const min = Math.min(...stations.map((s) => s.start));
  const max = Math.max(...stations.map((s) => s.end));
  const years: { year: number; at: MonthIndex }[] = [];
  for (let y = Math.ceil(min / 12); y * 12 <= max; y += 1) years.push({ year: y, at: y * 12 });
  return { stations, min, max, span: max - min, years };
}

/** "OCT 2026" style label for a month index. */
export function monthLabel(at: MonthIndex): string {
  const m = Math.floor(at);
  const name = (MONTHS[((m % 12) + 12) % 12] ?? 'jan').toUpperCase();
  return `${name} ${Math.floor(m / 12)}`;
}
