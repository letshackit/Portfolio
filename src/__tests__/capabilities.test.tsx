import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Capabilities } from '../capabilities/Capabilities';
import { lookFor, totalSkills } from '../capabilities/domains';
import { CAM_AZIMUTH_OFFSET, damp, hubAngle, hubPosition, nodeSlot, RING_RADIUS, unwrapAngle } from '../capabilities/cap3d/layout';
import { dprFor, pinnedTier, stepDown } from '../capabilities/cap3d/quality';
import { content } from '../data/content';

const groups = content.capabilities.groups;

describe('capability layout', () => {
  it('puts the four hubs a quarter turn apart on the ring', () => {
    for (let i = 0; i < groups.length; i++) {
      const [x, , z] = hubPosition(i, groups.length);
      expect(Math.hypot(x, z)).toBeCloseTo(RING_RADIUS, 6);
    }
    expect(hubAngle(1, 4)).toBeCloseTo(Math.PI / 2, 6);
  });

  it('opens every cluster into distinct slots, label outside, starting at twelve o clock', () => {
    for (const g of groups) {
      const slots = g.skills.map((_, i) => nodeSlot(i, g.skills.length));
      expect(new Set(slots.map((s) => `${s.x.toFixed(3)},${s.y.toFixed(3)}`)).size).toBe(g.skills.length);
      expect(slots[0].side).toBe('above');
      for (const s of slots) {
        if (s.side === 'right') expect(s.x).toBeGreaterThan(0);
        if (s.side === 'left') expect(s.x).toBeLessThan(0);
      }
    }
  });

  it('flies the camera the short way round', () => {
    const cur = 6.0;
    const target = unwrapAngle(cur, 0.2 + CAM_AZIMUTH_OFFSET);
    expect(Math.abs(target - cur)).toBeLessThan(Math.PI);
    expect(damp(0, 1, 3, 10)).toBeGreaterThan(0.99);
    expect(damp(0, 1, 3, 0)).toBe(0);
  });
});

describe('capability stage quality', () => {
  it('steps down one tier at a time and never past the last', () => {
    expect(stepDown(0)).toBe(1);
    expect(stepDown(1)).toBe(2);
    expect(stepDown(2)).toBe(2);
    expect(dprFor(2, 3)).toBe(1);
    expect(dprFor(0, 3)).toBe(2);
  });

  it('pins a tier from the quality switch only', () => {
    expect(pinnedTier('?quality=high')).toBe(0);
    expect(pinnedTier('?quality=low')).toBe(2);
    expect(pinnedTier('?quality=nope')).toBeNull();
    expect(pinnedTier('')).toBeNull();
  });
});

describe('Capabilities (stacked variant, no matchMedia)', () => {
  it('keeps the section anchor and heading', () => {
    const { container } = render(<Capabilities />);
    const section = container.querySelector('section#capabilities');
    expect(section).not.toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: content.capabilities.heading })).toBeInTheDocument();
  });

  it('renders every domain with all of its skills verbatim and its proof link', () => {
    render(<Capabilities />);
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(groups.length);
    groups.forEach((group, i) => {
      const card = within(cards[i]);
      expect(card.getByRole('heading', { level: 3, name: group.name })).toBeInTheDocument();
      expect(card.getAllByRole('listitem').map((li) => li.textContent)).toEqual([...group.skills]);
      expect(card.getByRole('link', { name: group.proof })).toHaveAttribute('href', `#${group.anchor === 'howIWork' ? 'how-i-work' : group.anchor}`);
    });
  });

  it('draws the AI-native domain in amber and the rest in cyan', () => {
    expect(groups.map((g) => lookFor(g).tone)).toEqual(['cyan', 'cyan', 'amber', 'cyan']);
    expect(totalSkills(groups)).toBe(groups.reduce((n, g) => n + g.skills.length, 0));
  });
});
