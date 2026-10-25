import { describe, expect, it } from 'vitest';
import { content } from '../data/content';

const ALLOWED_STATUS = ['UAT', 'In development', 'Prototype delivered', 'Scoping'];
const EXPECTED_METRICS: Record<string, readonly string[]> = {
  TravelDesk: ['116-page PRD', '18 microservices', '56 stories across 10 epics', '6-engineer team'],
  HRMS: ['~50,000 employees', '461-page, 13-module PRD', '12+ vendors studied', '5 satellite services'],
  BSS: ['~60% of build delivered personally'],
  'Cloud Commerce': ['8 modules', '3 months', '100+ APIs scoped', '~1 month of discovery and build cut'],
  'AI Operations platform': [],
};

describe('content integrity', () => {
  it('lists five deployments in PRD order', () => {
    expect(content.deployments.items.map((d) => d.name)).toEqual(Object.keys(EXPECTED_METRICS));
  });

  it('uses only the four allowed status values', () => {
    for (const d of content.deployments.items) expect(ALLOWED_STATUS).toContain(d.status);
    expect(new Set(content.deployments.items.map((d) => d.status)).size).toBe(4);
  });

  it('carries every résumé metric on its card', () => {
    for (const d of content.deployments.items) expect(d.metrics).toEqual(EXPECTED_METRICS[d.name]);
  });

  it('has unique deployment ids', () => {
    const ids = content.deployments.items.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has five testimonials from the cleared authors only', () => {
    expect(content.recognition.quotes.map((q) => q.author)).toEqual([
      'Ankita Mahapatra',
      'Abdulhamid Imam',
      'Kaushal Parmar',
      'Rohit Sharma',
      'Sachin Sahni',
    ]);
  });

  it('contains no forbidden strings and no testimonial contact details', () => {
    const blob = JSON.stringify(content);
    // Built from parts so the forbidden strings never appear in source.
    for (const bad of [[...'gnortSelpoeP'].reverse().join(''), [...'ahbA'].reverse().join(''), [...'ahniS'].reverse().join('')]) {
      expect(blob.toLowerCase()).not.toContain(bad.toLowerCase());
    }
    for (const q of content.recognition.quotes) {
      const text = [q.attribution, q.context, ...q.text, q.pull ?? '', ...(q.bullets ?? [])].join(' ');
      expect(text).not.toMatch(/@|\+?\d[\d\s-]{8,}\d/);
    }
  });

  it('has seven pipeline stages with sequential indexes', () => {
    expect(content.howIWork.stages.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6].map((i) => content.howIWork.stages[0].index + i));
    expect(content.howIWork.stages).toHaveLength(7);
  });
});
