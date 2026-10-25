import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrefsProvider } from '../app/providers/PrefsProvider';
import { UiProvider } from '../app/providers/UiProvider';
import { content } from '../data/content';
import { Stepper } from '../how/Stepper';
import { LiveDot } from '../ui/LiveDot';

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

function renderStepper() {
  return render(
    <PrefsProvider>
      <UiProvider>
        <Stepper />
      </UiProvider>
    </PrefsProvider>,
  );
}

describe('Stepper tabs mode', () => {
  it('selects stage 1 on load with tablist, tab and tabpanel roles', () => {
    mockMedia(wide);
    renderStepper();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(7);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tabpanel')).toHaveTextContent(stages[0].artifact);
  });

  it('moves selection and focus with Left and Right, wrapping at the ends', () => {
    mockMedia(wide);
    renderStepper();
    const tabs = () => screen.getAllByRole('tab');
    fireEvent.keyDown(tabs()[0], { key: 'ArrowRight' });
    expect(tabs()[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs()[1]).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent(stages[1].artifact);
    fireEvent.keyDown(tabs()[1], { key: 'ArrowLeft' });
    expect(tabs()[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs()[0], { key: 'ArrowLeft' });
    expect(tabs()[6]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs()[6], { key: 'Home' });
    expect(tabs()[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs()[0], { key: 'End' });
    expect(tabs()[6]).toHaveFocus();
  });

  it('selects on click', () => {
    mockMedia(wide);
    renderStepper();
    fireEvent.click(screen.getAllByRole('tab')[3]);
    expect(screen.getAllByRole('tab')[3]).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Stepper list mode', () => {
  it('shows all seven stages and no tabs on narrow screens', () => {
    mockMedia(() => false);
    renderStepper();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(7);
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
