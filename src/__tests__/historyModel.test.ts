import { describe, expect, it } from 'vitest';
import { content } from '../data/content';
import { buildModel, monthIndexOf, monthLabel, parseMonth, parseRange } from '../history/timelineModel';

const NOW = new Date(2026, 9, 29);

describe('history timeline model', () => {
  it('reads months and ranges out of the copy', () => {
    expect(parseMonth('Apr 2026')).toBe(2026 * 12 + 3);
    expect(parseRange('Jul 2025 — Mar 2026', NOW)).toEqual({ start: 2025 * 12 + 6, end: 2026 * 12 + 3 });
    const live = parseRange('Apr 2026 — present', NOW);
    expect(live?.start).toBe(2026 * 12 + 3);
    expect(live?.end).toBeCloseTo(monthIndexOf(NOW), 5);
    expect(parseMonth('no date here')).toBeNull();
  });

  it('keeps every employer, newest first, with its span in the copy words', () => {
    const model = buildModel(content.history.entries, NOW);
    expect(model.stations).toHaveLength(content.history.entries.length);
    const starts = model.stations.map((s) => s.start);
    expect([...starts].sort((a, b) => b - a)).toEqual(starts);
    expect(model.stations[0]?.short).toBe('Paytm');
    expect(model.stations[0]?.dates).toBe('Jul 2025 — present');
    expect(model.stations[0]?.current).toBe(true);
    expect(model.stations[2]?.dates).toBe('Sep 2022 — Dec 2023');
  });

  it('finds the two promotions, both nine months in', () => {
    const model = buildModel(content.history.entries, NOW);
    const promoted = model.stations.filter((s) => s.promotion);
    expect(promoted.map((s) => s.short)).toEqual(['Paytm', 'ANS Commerce']);
    for (const s of promoted) expect(s.promotion?.months).toBe(9);
    expect(promoted[0]?.promotion?.label).toBe('Promoted in 9 months');
  });

  it('labels year marks inside the span', () => {
    const model = buildModel(content.history.entries, NOW);
    expect(model.years.map((y) => y.year)).toEqual([2022, 2023, 2024, 2025, 2026]);
    expect(monthLabel(2026 * 12 + 3)).toBe('APR 2026');
  });
});
