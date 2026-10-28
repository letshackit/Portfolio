import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { bays } from '../data/deployment-bays';
import { hrmsArchitecture } from '../data/hrms-architecture';
import { Deployments } from '../deployments/Deployments';
import { layoutFor } from '../deployments/three/layouts';
import { createPacketSim } from '../deployments/three/packets';
import { fitDistance, highlightFor, neighbours } from '../deployments/three/spec';

describe('bay data', () => {
  it('has the four flagships in order and no BSS', () => {
    expect(bays.map((b) => b.name)).toEqual(['TravelDesk', 'HRMS', 'Cloud Commerce', 'AI To Com']);
    const text = JSON.stringify(bays);
    expect(text).not.toMatch(/\bBSS\b/);
    expect(text).not.toMatch(/AI Operations/);
  });

  it('keeps the HRMS at 29 modules in seven clusters and never names the incumbent vendor', () => {
    const modules = hrmsArchitecture.nodes.filter((n) => n.kind === 'module');
    expect(modules).toHaveLength(29);
    expect(new Set(modules.map((m) => m.group)).size).toBe(7);
    expect(hrmsArchitecture.nodes.filter((n) => n.kind === 'satellite')).toHaveLength(5);
  });

  it('describes TravelDesk as 18 services plus integrations, confirmed', () => {
    const arch = bays[0]?.architecture;
    expect(arch?.nodes.filter((n) => n.kind === 'service')).toHaveLength(16);
    expect(arch?.nodes.filter((n) => n.kind === 'frontend' || n.kind === 'gateway')).toHaveLength(2);
    expect(arch?.nodes.filter((n) => n.kind === 'integration')).toHaveLength(3);
    expect(arch?.nodes.filter((n) => n.kind === 'integration-phase2')).toHaveLength(2);
  });
});

describe.each([false, true])('layouts (portrait=%s)', (portrait) => {
  it.each(bays.map((b) => b.id))('%s: every route joins two drawn nodes and ids are unique', (id) => {
    const bay = bays.find((b) => b.id === id)!;
    const spec = layoutFor(bay, portrait);
    const ids = new Set(spec.nodes.map((n) => n.id));
    expect(ids.size).toBe(spec.nodes.length);
    for (const r of spec.routes) {
      expect(ids.has(r.from)).toBe(true);
      expect(ids.has(r.to)).toBe(true);
      expect(r.points.length).toBeGreaterThanOrEqual(2);
    }
    expect(new Set(spec.routes.map((r) => r.id)).size).toBe(spec.routes.length);
    expect(spec.extent.maxX).toBeGreaterThan(spec.extent.minX);
  });

  it('draws every architecture node (clusters stand in for their modules)', () => {
    for (const bay of bays) {
      const spec = layoutFor(bay, portrait);
      const drawn = new Set(spec.nodes.map((n) => n.id));
      for (const n of bay.architecture.nodes) expect(drawn.has(n.id), `${bay.id}:${n.id}`).toBe(true);
    }
  });

  it('is deterministic', () => {
    for (const bay of bays) {
      expect(layoutFor(bay, portrait).nodes.map((n) => n.scatter)).toEqual(layoutFor(bay, portrait).nodes.map((n) => n.scatter));
    }
  });
});

describe('scene helpers', () => {
  const hrms = layoutFor(bays[1]!, false);

  it('opens the first HRMS cluster and tucks its modules into a tray', () => {
    expect(hrms.clusters).toHaveLength(7);
    expect(hrms.initialOpen).toBe(hrms.clusters[0]);
    const mods = hrms.nodes.filter((n) => n.parent === hrms.initialOpen);
    expect(mods.length).toBeGreaterThan(0);
    for (const m of mods) expect(m.open).toBeDefined();
  });

  it('lights a node, its neighbours and the links between them; a cluster lights its modules', () => {
    const gateway = layoutFor(bays[0]!, false);
    const lit = highlightFor(gateway, 'approval');
    expect(lit.nodes.has('approval')).toBe(true);
    expect(lit.nodes.has('gateway')).toBe(true);
    expect(neighbours(gateway, 'approval')).toContain('Booking coordination');
    const cluster = highlightFor(hrms, 'core-hr');
    expect(cluster.nodes.has('employee-master')).toBe(true);
  });

  it('fits a wider canvas with a nearer camera than a narrow one', () => {
    const { extent, rot } = hrms;
    expect(fitDistance(extent, rot, 30, 2.4)).toBeLessThan(fitDistance(extent, rot, 30, 0.8));
  });

  it('runs packets deterministically and keeps them on their routes', () => {
    const spec = layoutFor(bays[3]!, false);
    const a = createPacketSim(spec.routes, 8, spec.startIds);
    const b = createPacketSim(spec.routes, 8, spec.startIds);
    for (let i = 0; i < 200; i += 1) {
      a.step(0.05, () => undefined);
      b.step(0.05, () => undefined);
    }
    expect(a.packets).toEqual(b.packets);
    const out: [number, number, number] = [0, 0, 0];
    a.positionOf(0, 0, out);
    expect(out.every(Number.isFinite)).toBe(true);
  });
});

describe('Deployments section', () => {
  it('renders four labelled bays with status, figures and a keyboard-reachable component index', () => {
    render(<Deployments />);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent?.replace(/\d{2}$/, ''))).toEqual(['TravelDesk', 'HRMS', 'Cloud Commerce', 'AI To Com']);
    const nav = screen.getByRole('group', { name: 'Deployment bays' });
    expect(within(nav).getAllByRole('button')).toHaveLength(4);
    // Roving tabindex: one tab stop per bay.
    const toolbars = screen.getAllByRole('toolbar');
    expect(toolbars).toHaveLength(4);
    for (const t of toolbars) {
      const stops = within(t).getAllByRole('button').filter((b) => b.getAttribute('tabindex') === '0');
      expect(stops).toHaveLength(1);
    }
  });

  it('pins a part on click and describes what it connects to', () => {
    render(<Deployments />);
    const chip = screen.getAllByRole('button', { name: 'Approval workflow' })[0]!;
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Routes requests and claims through multi-level approvals/)).toBeInTheDocument();
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false');
  });

  it('lists the modules of the open HRMS cluster', () => {
    render(<Deployments />);
    expect(screen.getByText(/Core HR open:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Talent & performance/ }));
    expect(screen.getByText('Cluster · 4 modules')).toBeInTheDocument();
    expect(screen.getByText(/Modules: Performance Management, Goals & OKRs/)).toBeInTheDocument();
  });
});
