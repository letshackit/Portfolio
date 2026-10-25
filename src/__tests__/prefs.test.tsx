import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrefsProvider } from '../app/providers/PrefsProvider';
import { usePrefs } from '../app/providers/prefsContext';

function Probe() {
  const p = usePrefs();
  return <p data-testid="p">{`rm=${p.reducedMotion} fine=${p.pointerFine}`}</p>;
}

function stubMatchMedia(matching: (q: string) => boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) => ({
      matches: matching(query),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  );
}

describe('PrefsProvider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sets reducedMotion when the reduce query matches', () => {
    stubMatchMedia((q) => q.includes('prefers-reduced-motion'));
    render(<PrefsProvider><Probe /></PrefsProvider>);
    expect(screen.getByTestId('p')).toHaveTextContent('rm=true fine=false');
  });

  it('leaves reducedMotion false when nothing matches', () => {
    stubMatchMedia(() => false);
    render(<PrefsProvider><Probe /></PrefsProvider>);
    expect(screen.getByTestId('p')).toHaveTextContent('rm=false fine=false');
  });
});
