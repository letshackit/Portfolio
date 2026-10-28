import { describe, expect, it } from 'vitest';
import { travelDeskArchitecture as model } from '../data/traveldesk-architecture';

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
