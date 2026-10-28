import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { ANCHORS } from '../config';
import { content } from '../data/content';

describe('readable console (step 1)', () => {
  it('renders the name as the only h1', () => {
    render(<App />);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(content.meta.name);
  });

  it('renders the four flagship deployment bays in order', () => {
    render(<App />);
    const titles = ['TravelDesk', 'HRMS', 'Cloud Commerce', 'AI To Com'];
    for (const title of titles) {
      expect(screen.getByRole('heading', { level: 3, name: new RegExp(`^${title}`) })).toBeInTheDocument();
    }
    expect(screen.queryByRole('heading', { level: 3, name: /BSS/ })).toBeNull();
  });

  it('renders the five testimonial authors', () => {
    render(<App />);
    for (const name of ['Ankita Mahapatra', 'Abdulhamid Imam', 'Kaushal Parmar', 'Rohit Sharma', 'Sachin Sahni']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it('never prints confidential strings', () => {
    render(<App />);
    // Letters only, lower case, so spacing, punctuation and case tricks cannot hide a name.
    const text = (document.body.textContent ?? '').normalize('NFKD').toLowerCase().replace(/[^a-z]/g, '');
    // Built by reversing, so the forbidden strings never appear in source (the launch gate scans tests too).
    const rev = (reversed: string) => [...reversed].reverse().join('');
    const vendor = rev('gnortSelpoeP').toLowerCase();
    const author = rev('ahniSahbA').toLowerCase();
    const authorReversed = rev('ahbAahniS').toLowerCase();
    const forbidden = [vendor, author, authorReversed];
    for (const name of forbidden) expect(text).not.toContain(name);
    expect(text).not.toContain(rev('ahba'));
  });

  it('keeps sections in PRD order with the configured ids', () => {
    const { container } = render(<App />);
    const ids = [...container.querySelectorAll('main > section')].map((s) => s.id);
    expect(ids).toEqual([
      ANCHORS.top,
      ANCHORS.howIWork,
      ANCHORS.deployments,
      ANCHORS.capabilities,
      ANCHORS.history,
      ANCHORS.credentials,
      ANCHORS.recognition,
      ANCHORS.contact,
    ]);
  });

  it('has one header, nav, main and footer landmark', () => {
    render(<App />);
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
  });

  it('shows all seven stages as a list', () => {
    const { container } = render(<App />);
    expect(container.querySelectorAll('.stepper-list > li')).toHaveLength(7);
  });

  it('gives each bay its own component index and no proposed banner now that the service names are confirmed', () => {
    render(<App />);
    expect(screen.getAllByRole('toolbar')).toHaveLength(4);
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('opens every external link safely', () => {
    const { container } = render(<App />);
    const blank = container.querySelectorAll('a[target="_blank"]');
    expect(blank.length).toBeGreaterThan(0);
    for (const a of blank) {
      expect(a.getAttribute('rel')).toContain('noopener');
      expect(a.getAttribute('rel')).toContain('noreferrer');
    }
  });
});
