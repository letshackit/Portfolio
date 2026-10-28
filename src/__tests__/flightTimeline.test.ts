import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DWELL, STATIONS, activeStation, assemble, passed, progressForStation, progressToS, stationVisible } from '../how/flight/timeline';
import { dprFor, LAST_TIER, pinnedQuality, startTier, stepDown, TIERS } from '../how/flight/quality';
import { cameraArc, makeLayout, pathPoint, pathTangent, stationArc } from '../how/flight/track';

describe('flight timeline', () => {
  it('maps scroll to the camera monotonically, from before station 1 to just past station 7', () => {
    let prev = -Infinity;
    for (let i = 0; i <= 200; i += 1) {
      const s = progressToS(i / 200);
      expect(s).toBeGreaterThan(prev);
      prev = s;
    }
    expect(progressToS(0)).toBeLessThan(0);
    expect(progressToS(1)).toBeGreaterThan(STATIONS - 1);
    expect(DWELL).toBeLessThan(1);
  });

  it('rests on every station: progressForStation inverts progressToS', () => {
    for (let i = 0; i < STATIONS; i += 1) {
      expect(progressToS(progressForStation(i))).toBeCloseTo(i, 4);
      expect(activeStation(progressToS(progressForStation(i)))).toBe(i);
    }
  });

  it('crawls near a station and speeds up between two', () => {
    const speed = (p: number) => (progressToS(p + 1e-4) - progressToS(p - 1e-4)) / 2e-4;
    const at = speed(progressForStation(3));
    const between = speed((progressForStation(3) + progressForStation(4)) / 2);
    expect(at).toBeLessThan(between * 0.5);
  });

  it('assembles a station before the camera reaches it and dims it after it has passed', () => {
    expect(assemble(3, 1.5)).toBe(0);
    expect(assemble(3, 3)).toBe(1);
    expect(assemble(3, 2.5)).toBeGreaterThan(0);
    expect(assemble(3, 2.5)).toBeLessThan(1);
    expect(passed(3, 3)).toBe(0);
    expect(passed(3, 4.5)).toBe(1);
    expect(stationVisible(3, 0)).toBe(false);
    expect(stationVisible(3, 3)).toBe(true);
  });
});

describe('flight track', () => {
  it('runs away from the viewer in landscape and straight down in portrait', () => {
    const land = makeLayout(false);
    const port = makeLayout(true);
    const a = new Vector3();
    const b = new Vector3();
    pathPoint(land, 10, a);
    pathPoint(land, 20, b);
    expect(b.z).toBeLessThan(a.z);
    pathPoint(port, 10, a);
    pathPoint(port, 20, b);
    expect(b.y).toBeLessThan(a.y);
    expect(Math.abs(b.z - a.z)).toBeLessThan(1e-6);
    expect(pathTangent(land, 30, new Vector3()).length()).toBeCloseTo(1, 6);
    expect(pathTangent(port, 30, new Vector3()).length()).toBeCloseTo(1, 6);
  });

  it('puts every station ahead of the camera while it rests on it, and the server beyond the last station', () => {
    for (const portrait of [false, true]) {
      const L = makeLayout(portrait);
      for (let i = 0; i < STATIONS; i += 1) {
        expect(stationArc(L, i) - cameraArc(L, i)).toBeCloseTo(L.ahead, 6);
      }
      expect(L.serverArc).toBeGreaterThan(stationArc(L, STATIONS - 1));
      expect(L.totalArc).toBeGreaterThan(L.serverArc);
    }
  });
});

describe('flight quality tiers', () => {
  it('degrade monotonically and never turn anti-aliasing off', () => {
    for (let i = 1; i < TIERS.length; i += 1) {
      expect(TIERS[i].dpr).toBeLessThanOrEqual(TIERS[i - 1].dpr);
      expect(TIERS[i].density).toBeLessThanOrEqual(TIERS[i - 1].density);
      expect(TIERS[i].dust).toBeLessThanOrEqual(TIERS[i - 1].dust);
    }
    for (const t of TIERS) expect(t.msaa).toBeGreaterThanOrEqual(2);
    expect(TIERS[LAST_TIER].noise).toBe(false);
  });

  it('steps down one tier at a time, starts phones one down, and pins from ?quality=', () => {
    expect(stepDown(0)).toBe(1);
    expect(stepDown(LAST_TIER)).toBe(LAST_TIER);
    expect(startTier(false, false)).toBe(0);
    expect(startTier(true, false)).toBe(1);
    expect(dprFor(0, 3)).toBe(2);
    expect(dprFor(2, 3)).toBe(1);
    expect(pinnedQuality('?quality=high')).toBe(0);
    expect(pinnedQuality('?quality=mid')).toBe(1);
    expect(pinnedQuality('?quality=low')).toBe(LAST_TIER);
    expect(pinnedQuality('')).toBeNull();
  });
});
