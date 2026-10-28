import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrefsContext, defaultPrefs, type Prefs } from '../app/providers/prefsContext';
import { Architecture } from '../architecture/Architecture';
import { travelDeskArchitecture as model } from '../data/traveldesk-architecture';
import { BOX_H, BOX_W, layoutArch, type ArchOrientation, type Box } from '../lib/archLayout';

const count = (kind: string) => model.nodes.filter((n) => n.kind === kind).length;

describe('traveldesk architecture data', () => {
  it('has 1 front end, 1 gateway and 16 domain services (18 service nodes)', () => {
    expect(count('frontend')).toBe(1);
    expect(count('gateway')).toBe(1);
    expect(count('domain')).toBe(16);
  });

  it('has 3 live and 2 Phase-2 integrations', () => {
    expect(count('integration')).toBe(3);
    expect(count('integration-phase2')).toBe(2);
  });

  it('has unique ids, edges that resolve, and is confirmed', () => {
    const ids = new Set(model.nodes.map((n) => n.id));
    expect(ids.size).toBe(model.nodes.length);
    for (const e of model.edges) {
      expect(ids.has(e.from)).toBe(true);
      expect(ids.has(e.to)).toBe(true);
    }
    expect(model.status).toBe('confirmed');
  });

  it('never names the HRIS vendor', () => {
    const text = JSON.stringify(model).toLowerCase();
    expect(text).not.toContain([...'gnortselpoep'].reverse().join(''));
    expect(model.nodes.find((n) => n.id === 'hris')?.label).toBe('Enterprise HRIS');
  });
});

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

describe.each<ArchOrientation>(['horizontal', 'vertical'])('archLayout %s', (orientation) => {
  const layout = layoutArch(model, orientation);

  it('places every node once, inside the viewBox, at the fixed box size', () => {
    expect(layout.boxes.size).toBe(model.nodes.length);
    for (const n of model.nodes) {
      const b = layout.boxes.get(n.id);
      expect(b).toBeDefined();
      if (!b) continue;
      expect(b.w).toBe(BOX_W);
      expect(b.h).toBe(BOX_H);
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(layout.viewBox[0]);
      expect(b.y + b.h).toBeLessThanOrEqual(layout.viewBox[1]);
    }
  });

  it('has no overlapping boxes', () => {
    const all = [...layout.boxes.entries()];
    for (let i = 0; i < all.length; i += 1) {
      for (let j = i + 1; j < all.length; j += 1) {
        const [ida, a] = all[i] as [string, Box];
        const [idb, b] = all[j] as [string, Box];
        expect(overlaps(a, b), `${ida} overlaps ${idb}`).toBe(false);
      }
    }
  });

  it('gives every edge a path', () => {
    expect(layout.edges).toHaveLength(model.edges.length);
    for (const e of layout.edges) expect(e.d.startsWith('M')).toBe(true);
  });
});

function renderAt(prefs: Partial<Prefs>) {
  return render(
    <PrefsContext.Provider value={{ ...defaultPrefs, ...prefs }}>
      <Architecture />
    </PrefsContext.Provider>,
  );
}

describe('Architecture diagram interaction (desktop)', () => {
  const desktop = { isWide: true, isDesktop: true, pointerFine: true };

  it('renders the SVG and a button per node, in front end, gateway, domain, integrations order', () => {
    const { container } = renderAt(desktop);
    expect(container.querySelector('svg.arch-svg')).not.toBeNull();
    expect(container.querySelectorAll('rect.arch-box')).toHaveLength(23);
    const labels = screen.getAllByRole('button').map((b) => b.textContent);
    const order = ['frontend', 'gateway', 'domain', 'integration', 'integration-phase2'];
    const expected = order.flatMap((k) => model.nodes.filter((n) => n.kind === k).map((n) => n.label));
    expect(labels).toEqual(expected);
  });

  it('highlights a focused node, shows its caption, dims others and clears on Escape', () => {
    const { container } = renderAt(desktop);
    const approval = screen.getByRole('button', { name: 'Approval workflow' });
    fireEvent.focus(approval);
    expect(approval).toHaveAttribute('data-state', 'on');
    expect(screen.getByRole('button', { name: 'Notifications' })).toHaveAttribute('data-state', 'dim');
    expect(screen.getByRole('button', { name: 'Booking coordination' })).toHaveAttribute('data-state', 'on');
    const caption = container.querySelector('.arch-caption');
    expect(caption).toHaveTextContent(/^Approval workflow — .* · connects to: .*Booking coordination/);
    fireEvent.keyDown(approval, { key: 'Escape' });
    expect(approval).toHaveAttribute('data-state', 'idle');
    expect(caption).toHaveTextContent('Hover or focus a service');
  });

  it('pins on click and clears when the background is pressed (touch)', () => {
    const { container } = renderAt(desktop);
    const ocr = screen.getByRole('button', { name: 'Receipt capture & OCR' });
    fireEvent.click(ocr);
    expect(ocr).toHaveAttribute('aria-pressed', 'true');
    fireEvent.pointerLeave(ocr);
    expect(ocr).toHaveAttribute('data-state', 'on');
    const bg = container.querySelector('.arch-svg__bg');
    expect(bg).not.toBeNull();
    if (bg) fireEvent.pointerDown(bg);
    expect(ocr).toHaveAttribute('aria-pressed', 'false');
    expect(ocr).toHaveAttribute('data-state', 'idle');
  });

  it('gives each button an accessible description with role and connections', () => {
    renderAt(desktop);
    const btn = screen.getByRole('button', { name: 'SAP' });
    expect(btn).toHaveAccessibleDescription(/Integration\. .* Connects to: SAP finance adapter\./);
  });
});

describe('Architecture list fallback (narrow)', () => {
  it('has no SVG, four labelled groups, and expands one row to show connections', () => {
    const { container } = renderAt({});
    expect(container.querySelector('svg.arch-svg')).toBeNull();
    const list = screen.getByRole('list', { name: /TravelDesk services/ });
    expect(within(list).getAllByRole('heading', { level: 3 })).toHaveLength(4);
    const row = screen.getByRole('button', { name: 'Approval workflow' });
    expect(row).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'true');
  });
});
