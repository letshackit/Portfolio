import { describe, expect, it } from 'vitest';
import { content } from '../data/content';
import { specFor } from '../credentials/slots';
import { dprFor, LAST_TIER, PIXEL_BUDGET, startTier, stepDown, TIERS } from '../credentials/stage/quality';
import { createVaultStore } from '../credentials/vaultStore';

function box(left: number, top: number, width: number, height: number): HTMLElement {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) });
  return el;
}

describe('credentials vault', () => {
  it('measures every slot relative to the container, centre and size', () => {
    const store = createVaultStore();
    store.container = box(100, 400, 1000, 900);
    store.register('pgp', box(160, 460, 300, 300));
    store.register('gone', box(0, 0, 0, 0));
    store.measure();
    expect(store.rects.get('pgp')).toEqual({ cx: 210, cy: 210, w: 300, h: 300 });
    expect(store.rects.has('gone')).toBe(false);
    store.register('pgp', null);
    expect(store.rects.has('pgp')).toBe(false);
  });

  it('gives every credential in content.ts a badge, with the degrees and publication as their own kinds', () => {
    const { degrees, certifications, publication } = content.history.education;
    expect(specFor(degrees[0].id, degrees[0].issuer).kind).toBe('hero');
    expect(specFor(degrees[1].id, degrees[1].issuer).kind).toBe('stone');
    for (const c of certifications) {
      const spec = specFor(c.id, c.issuer);
      expect(spec.kind).toBe('cert');
      expect(spec.main.length).toBeGreaterThan(0);
    }
    expect(specFor(publication.id, '').kind).toBe('paper');
    // Five certifications, five different silhouettes (the critic's "samey hexagons").
    expect(new Set(certifications.map((c) => specFor(c.id, c.issuer).body)).size).toBe(certifications.length);
  });

  it('degrades monotonically and never past the last tier', () => {
    for (let i = 1; i < TIERS.length; i += 1) {
      expect(TIERS[i].dpr).toBeLessThanOrEqual(TIERS[i - 1].dpr);
      expect(TIERS[i].msaa).toBeLessThanOrEqual(TIERS[i - 1].msaa);
      expect(TIERS[i].particles).toBeLessThanOrEqual(TIERS[i - 1].particles);
    }
    expect(TIERS[LAST_TIER].transmission).toBe(false);
    expect(stepDown(LAST_TIER)).toBe(LAST_TIER);
    expect(startTier(true, false)).toBe(1);
    expect(startTier(false, false)).toBe(0);
  });

  it('keeps the canvas inside the pixel budget however tall the vault is', () => {
    const dpr = dprFor(0, 3, 1280, 1300);
    expect(1280 * dpr * 1300 * dpr).toBeLessThanOrEqual(PIXEL_BUDGET * 1.001);
    expect(dprFor(0, 3, 390, 2000)).toBe(2);
    expect(dprFor(2, 3, 390, 2000)).toBe(1);
  });
});
