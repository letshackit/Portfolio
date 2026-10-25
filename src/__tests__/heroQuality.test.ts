import { describe, expect, it } from 'vitest';
import { dprFor, LAST_TIER, startTier, stepDown, TIERS } from '../hero/v2/stage/quality';

describe('hero quality tiers', () => {
  it('degrade monotonically: pixels first, then particles, then the film effects', () => {
    for (let i = 1; i < TIERS.length; i += 1) {
      const a = TIERS[i - 1];
      const b = TIERS[i];
      expect(b.dpr).toBeLessThanOrEqual(a.dpr);
      expect(b.msaa).toBeLessThanOrEqual(a.msaa);
      expect(b.reflect).toBeLessThanOrEqual(a.reflect);
      expect(b.drones).toBeLessThanOrEqual(a.drones);
      expect(b.packets).toBeLessThanOrEqual(a.packets);
      expect(b.sparkles).toBeLessThanOrEqual(a.sparkles);
    }
    expect(TIERS[1].sparkles).toBeLessThan(TIERS[0].sparkles);
    expect(TIERS[LAST_TIER].reflect).toBe(0);
    expect(TIERS[LAST_TIER].noise).toBe(false);
  });

  it('steps down one tier at a time and stops at the last', () => {
    expect(stepDown(0)).toBe(1);
    expect(stepDown(1)).toBe(2);
    expect(stepDown(2)).toBe(2);
  });

  it('starts phones and coarse pointers one tier down', () => {
    expect(startTier(false, false)).toBe(0);
    expect(startTier(true, false)).toBe(1);
    expect(startTier(false, true)).toBe(1);
  });

  it('caps the pixel ratio by tier and never goes below 1', () => {
    expect(dprFor(0, 3)).toBe(TIERS[0].dpr);
    expect(dprFor(2, 3)).toBe(1);
    expect(dprFor(0, 1)).toBe(1);
    expect(dprFor(0, 0.5)).toBe(1);
  });
});
