import { describe, expect, it } from 'vitest';
import { travelDeskArchitecture as model } from '../data/traveldesk-architecture';
import { layout3d } from '../architecture/three/layout3d';
import { createPacketSim } from '../architecture/three/packets3d';
import { blockRect, fitProjection, projectPoint } from '../architecture/three/projection';

const layout = layout3d(model);

describe('layout3d', () => {
  it('lays out every node once and every edge as a route', () => {
    expect(layout.blocks).toHaveLength(model.nodes.length);
    expect(new Set(layout.blocks.map((b) => b.id)).size).toBe(model.nodes.length);
    expect(layout.routes).toHaveLength(model.edges.length);
  });

  it('puts the front end above the gateway above the 16 domain services', () => {
    const y = (id: string) => layout.blocks.find((b) => b.id === id)?.pos[1] ?? NaN;
    const domain = layout.blocks.filter((b) => b.kind === 'domain');
    expect(domain).toHaveLength(16);
    expect(y('frontend')).toBeGreaterThan(y('gateway'));
    for (const b of domain) expect(y('gateway')).toBeGreaterThan(b.pos[1]);
  });

  it('is deterministic', () => {
    expect(layout3d(model).blocks.map((b) => b.scatter)).toEqual(layout.blocks.map((b) => b.scatter));
  });
});

describe('projection', () => {
  it.each([1.6, 2.1, 2.6])('fits every block inside the frame at aspect %s', (aspect) => {
    const proj = fitProjection(layout, aspect);
    for (const b of layout.blocks) {
      const r = blockRect(b, proj);
      expect(r.left).toBeGreaterThanOrEqual(0);
      expect(r.top).toBeGreaterThanOrEqual(0);
      expect(r.left + r.width).toBeLessThanOrEqual(100);
      expect(r.top + r.height).toBeLessThanOrEqual(100);
    }
  });

  it('keeps the overlay order of the stack: front end is above the gateway on screen', () => {
    const proj = fitProjection(layout, 2.1);
    const top = (id: string) => blockRect(layout.blocks.find((b) => b.id === id)!, proj).top;
    expect(top('frontend')).toBeLessThan(top('gateway'));
    expect(projectPoint([0, layout.extent.cy, 0], proj)).not.toBeNull();
  });
});

describe('packet sim', () => {
  it('starts at the front end, moves along routes and reports arrivals', () => {
    const sim = createPacketSim(layout.routes, 6, 'frontend', 3);
    const arrived: string[] = [];
    for (let i = 0; i < 400; i += 1) sim.step(0.05, (id) => arrived.push(id));
    expect(arrived).toContain('gateway');
    expect(new Set(arrived).size).toBeGreaterThan(3);
    const out: [number, number, number] = [0, 0, 0];
    sim.positionOf(0, out);
    expect(out.every(Number.isFinite)).toBe(true);
  });
});
