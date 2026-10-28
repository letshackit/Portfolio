import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrefsProvider } from '../app/providers/PrefsProvider';
import { UiProvider } from '../app/providers/UiProvider';
import { content } from '../data/content';
import { Flight } from '../how/Flight';
import { Pipeline } from '../how/Pipeline';
import { StageList } from '../how/StageList';
import { LiveDot } from '../ui/LiveDot';

// The 3D chunk and the scroll engine are lazy imports; neither is under test here and neither runs in jsdom.
vi.mock('../how/flight/FlightStage', () => ({ default: () => null }));
vi.mock('../how/flightMotion', () => ({ startFlight: () => Promise.resolve(null) }));

function mockMedia(matches: (q: string) => boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) => ({
      matches: matches(query),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  );
}

const stages = content.howIWork.stages;
const wide = (q: string) => q.includes('min-width') && !q.includes('reduce');

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

function renderWith(node: ReactNode) {
  return render(
    <PrefsProvider>
      <UiProvider>{node}</UiProvider>
    </PrefsProvider>,
  );
}

describe('Flight rail', () => {
  it('selects stage 1 on load with tablist, tab and tabpanel roles, one panel per stage', () => {
    mockMedia(wide);
    const { container } = renderWith(<Flight quality={null} onFail={() => undefined} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(7);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    // Only the active panel is exposed; all seven are in the DOM.
    expect(screen.getByRole('tabpanel')).toHaveTextContent(stages[0].artifact);
    expect(container.querySelectorAll('.flight__panel')).toHaveLength(7);
    expect(container.querySelectorAll('.flight__panel[data-active]')).toHaveLength(1);
  });

  it('moves selection and focus with Left and Right, stopping at the ends', () => {
    mockMedia(wide);
    renderWith(<Flight quality={null} onFail={() => undefined} />);
    const tabs = () => screen.getAllByRole('tab');
    fireEvent.keyDown(tabs()[0], { key: 'ArrowRight' });
    expect(tabs()[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs()[1]).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent(stages[1].artifact);
    fireEvent.keyDown(tabs()[1], { key: 'ArrowLeft' });
    expect(tabs()[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs()[0], { key: 'ArrowLeft' });
    expect(tabs()[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs()[0], { key: 'End' });
    expect(tabs()[6]).toHaveAttribute('aria-selected', 'true');
    expect(tabs()[6]).toHaveFocus();
    fireEvent.keyDown(tabs()[6], { key: 'ArrowRight' });
    expect(tabs()[6]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs()[6], { key: 'Home' });
    expect(tabs()[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('selects on click', () => {
    mockMedia(wide);
    renderWith(<Flight quality={null} onFail={() => undefined} />);
    fireEvent.click(screen.getAllByRole('tab')[3]);
    expect(screen.getAllByRole('tab')[3]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent(stages[3].artifact);
  });

  it('uses the vertical layout on a portrait screen', () => {
    mockMedia((q) => q.includes('orientation: portrait'));
    const { container } = renderWith(<Flight quality={null} onFail={() => undefined} />);
    expect(container.querySelector('.flight')).toHaveAttribute('data-layout', 'vertical');
  });
});

describe('Still list', () => {
  it('shows all seven stages, each with a drawing, and no tabs', () => {
    mockMedia(() => false);
    const { container } = renderWith(<StageList />);
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(7);
    expect(container.querySelectorAll('.stepper-list__art svg')).toHaveLength(7);
    for (const stage of stages) expect(screen.getByText(stage.artifact)).toBeInTheDocument();
  });
});

describe('Pipeline mode', () => {
  it('falls back to the still list without WebGL (jsdom has none)', () => {
    mockMedia(wide);
    const { container } = renderWith(<Pipeline />);
    expect(container.querySelector('.flight')).toBeNull();
    expect(container.querySelectorAll('.stepper-list > li')).toHaveLength(7);
  });

  it('gives reduced motion the still list', () => {
    mockMedia((q) => q.includes('prefers-reduced-motion') || wide(q));
    const { container } = renderWith(<Pipeline />);
    expect(container.querySelector('.flight')).toBeNull();
    expect(container.querySelectorAll('.stepper-list > li')).toHaveLength(7);
  });
});

describe('LiveDot', () => {
  it('pulses only when live and motion is allowed', () => {
    mockMedia(() => false);
    const { container, rerender } = render(
      <PrefsProvider>
        <LiveDot tone="amber" live />
      </PrefsProvider>,
    );
    expect(container.querySelector('.live-dot')).toHaveAttribute('data-live');
    rerender(
      <PrefsProvider>
        <LiveDot tone="amber" />
      </PrefsProvider>,
    );
    expect(container.querySelector('.live-dot')).not.toHaveAttribute('data-live');
  });

  it('never pulses under reduced motion', () => {
    mockMedia((q) => q.includes('prefers-reduced-motion'));
    const { container } = render(
      <PrefsProvider>
        <LiveDot tone="amber" live />
      </PrefsProvider>,
    );
    expect(container.querySelector('.live-dot')).not.toHaveAttribute('data-live');
  });
});
