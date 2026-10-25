import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrefsProvider } from '../app/providers/PrefsProvider';
import { content } from '../data/content';
import { Hero } from '../hero/v2/Hero';
import { CAPTION, CONSOLE_LINES, DEPLOY_LINES, lineToText } from '../hero/v2/copy';

afterEach(() => {
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

function mockMedia(matches: (q: string) => boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matches(query),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function renderHero() {
  return render(
    <PrefsProvider>
      <Hero />
    </PrefsProvider>,
  );
}

describe('hero v2, with no 3D (jsdom has no WebGL)', () => {
  it('renders the name as the only h1, labelling the section', () => {
    mockMedia(() => false);
    const { container } = renderHero();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(content.meta.name);
    expect(container.querySelector('section')).toHaveAccessibleName(content.meta.name);
  });

  it('renders every piece of copy at once: eyebrow, tagline, caption, badge, status bar', () => {
    mockMedia(() => false);
    const { container } = renderHero();
    expect(container).toHaveTextContent('OPEN TO FORWARD DEPLOYED ENGINEER ROLES');
    expect(container).toHaveTextContent('Forward-deployed.');
    expect(container).toHaveTextContent('I build what I spec.');
    expect(screen.getByText(CAPTION)).toBeInTheDocument();
    const badge = screen.getByLabelText('Operator ID');
    expect(within(badge).getByRole('img')).toHaveAttribute('src', '/hero/harshal-badge.webp');
    expect(within(badge).getByRole('link', { name: 'RÉSUMÉ' })).toHaveAttribute('href', content.contact.resumePath);
    const bar = screen.getByRole('group', { name: 'Live status' });
    expect(bar).toHaveTextContent('LIVE');
    expect(bar).toHaveTextContent(content.meta.employer);
  });

  it('gives assistive tech the whole console and DEPLOY log as text, while the animated rows are hidden', () => {
    mockMedia(() => false);
    renderHero();
    const consoleRegion = screen.getByRole('region', { name: /agent console/i });
    for (const l of CONSOLE_LINES) expect(consoleRegion).toHaveTextContent(lineToText(l));
    const pane = screen.getByRole('complementary', { name: /deploy/i });
    for (const l of DEPLOY_LINES) expect(pane).toHaveTextContent(lineToText(l));
    expect(consoleRegion.querySelector('.hv2__term-body')).toHaveAttribute('aria-hidden', 'true');
  });

  it('opens external links safely and mounts no canvas without WebGL', () => {
    mockMedia(() => false);
    const { container } = renderHero();
    for (const a of container.querySelectorAll('a[target="_blank"]')) {
      expect(a.getAttribute('rel')).toContain('noopener');
      expect(a.getAttribute('rel')).toContain('noreferrer');
    }
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('under reduced motion shows the finished logs at once and marks the section entered', () => {
    mockMedia((q) => q.includes('prefers-reduced-motion') || q.includes('min-width'));
    const { container } = renderHero();
    expect(container.querySelector('.hv2')).toHaveAttribute('data-entered');
    const rows = container.querySelectorAll('.hv2__console .hv2__term-body .hv2__row:not(.hv2__row--cmd)');
    expect(rows.length).toBe(CONSOLE_LINES.length);
    expect(container.querySelector('.hv2__caret')).toBeNull();
  });

  it('waits for the boot before entering, when a boot will run', () => {
    mockMedia(() => false);
    const { container } = renderHero();
    expect(container.querySelector('.hv2')).not.toHaveAttribute('data-entered');
  });

  it('enters at once for a visitor who has already booted this session', () => {
    mockMedia(() => false);
    window.sessionStorage.setItem('hs.boot', '1');
    const { container } = renderHero();
    expect(container.querySelector('.hv2')).toHaveAttribute('data-entered');
  });
});
