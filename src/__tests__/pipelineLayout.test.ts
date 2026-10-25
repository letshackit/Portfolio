import { describe, expect, it } from 'vitest';
import { HORIZONTAL, VERTICAL, layoutFor, pointAtFraction, toPercent, toWorld } from '../lib/pipelineLayout';

describe.each([
  ['horizontal', HORIZONTAL],
  ['vertical', VERTICAL],
])('pipelineLayout %s', (orientation, layout) => {
  it('has 7 nodes and 6 chained edges', () => {
    expect(layout.orientation).toBe(orientation);
    expect(layout.nodes).toHaveLength(7);
    expect(layout.edges).toHaveLength(6);
    layout.edges.forEach((edge, i) => {
      expect(edge.from).toBe(i);
      expect(edge.to).toBe(i + 1);
      expect(edge.d.startsWith('M ')).toBe(true);
    });
  });

  it('keeps every node inside the viewBox', () => {
    const [w, h] = layout.viewBox;
    for (const n of layout.nodes) {
      expect(n.x).toBeGreaterThan(0);
      expect(n.x).toBeLessThan(w);
      expect(n.y).toBeGreaterThan(0);
      expect(n.y).toBeLessThan(h);
    }
  });

  it('joins the edges into one path with a single M and six Q segments', () => {
    expect(layout.packetPath.match(/M/g)).toHaveLength(1);
    expect(layout.packetPath.match(/Q/g)).toHaveLength(6);
  });

  it('places still points on the path ends', () => {
    expect(pointAtFraction(layout, 0)).toEqual(layout.nodes[0]);
    expect(pointAtFraction(layout, 1)).toEqual(layout.nodes[6]);
  });
});

describe('pipelineLayout geometry', () => {
  it('matches the architecture numbers', () => {
    expect(HORIZONTAL.viewBox).toEqual([1000, 340]);
    expect(HORIZONTAL.nodes[0]).toEqual({ x: 80, y: 170 });
    expect(HORIZONTAL.nodes[6]).toEqual({ x: 920, y: 170 });
    expect(HORIZONTAL.edges[0].d).toBe('M 80 170 Q 150 153 220 170');
    expect(HORIZONTAL.label).toBe('below');
    expect(VERTICAL.viewBox).toEqual([360, 480]);
    expect(VERTICAL.nodes[6]).toEqual({ x: 40, y: 432 });
    expect(VERTICAL.edges[0].d).toBe('M 40 48 Q 57 80 40 112');
    expect(VERTICAL.label).toBe('right');
  });

  it('picks the layout by width', () => {
    expect(layoutFor(true)).toBe(HORIZONTAL);
    expect(layoutFor(false)).toBe(VERTICAL);
  });

  it('maps to percentages and to world space with Z = 0', () => {
    expect(toPercent(HORIZONTAL.nodes[0], HORIZONTAL)).toEqual({ left: '8%', top: '50%' });
    const [x, y, z] = toWorld(HORIZONTAL.nodes[0], HORIZONTAL);
    expect(x).toBeCloseTo(-4.368, 3);
    expect(y).toBeCloseTo(0, 6);
    expect(z).toBe(0);
  });
});
