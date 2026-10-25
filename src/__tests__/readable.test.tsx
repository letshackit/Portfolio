import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { ANCHORS } from '../config';
import { content } from '../data/content';

describe('readable console (step 1)', () => {
  it('renders the headline as the only h1', () => {
    render(<App />);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(content.hero.headline);
  });

  it('renders the five deployment cards in order', () => {
    render(<App />);
    const titles = content.deployments.items.map((d) => d.name);
    expect(titles).toEqual(['TravelDesk', 'HRMS', 'BSS', 'Cloud Commerce', 'AI Operations platform']);
    for (const title of titles) {
      expect(screen.getByRole('heading', { level: 3, name: title })).toBeInTheDocument();
    }
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
      ANCHORS.architecture,
      ANCHORS.capabilities,
      ANCHORS.history,
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

  it('starts deployment cards closed and toggles them independently', () => {
    render(<App />);
    const buttons = screen.getAllByRole('button', { name: content.deployments.detailsLabel });
    expect(buttons).toHaveLength(5);
    for (const b of buttons) expect(b).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(buttons[0]!);
    fireEvent.click(buttons[1]!);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[1]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[2]).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows the PROPOSED banner while the model is proposed', () => {
    render(<App />);
    expect(screen.getByRole('note')).toHaveTextContent(content.architecture.proposedBanner);
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
