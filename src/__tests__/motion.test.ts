import { createElement } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrefsContext, defaultPrefs, type Prefs } from '../app/providers/prefsContext';
import { UiContext, type UiContextValue } from '../app/providers/uiContext';
import { attachSmoother, getMode, lockScroll, onAnchorClick, refresh, scrollToAnchor, type SmootherHandle } from '../lib/scroll';
import { revealProps, useMotion } from '../lib/reveal';

const startMotion = vi.fn(() => ({ dispose: vi.fn() }));
vi.mock('../lib/motion', () => ({ startMotion: (...args: unknown[]) => startMotion(...(args as [])) }));

const ui: UiContextValue = {
  paletteOpen: false,
  activeSection: null,
  selectedStage: null,
  stageFocusRequest: 0,
  hoveredStage: null,
  toast: null,
  setPaletteOpen: () => undefined,
  setActiveSection: () => undefined,
  setSelectedStage: () => undefined,
  requestStageFocus: () => undefined,
  setHoveredStage: () => undefined,
  showToast: () => undefined,
};

let layoutCallback: (() => void) | undefined;

function Probe() {
  useMotion(true, layoutCallback);
  return null;
}

function mount(prefs: Prefs) {
  return render(
    createElement(
      PrefsContext.Provider,
      { value: prefs },
      createElement(UiContext.Provider, { value: ui }, createElement(Probe)),
    ),
  );
}

const flushFrames = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 60));
  });
};

describe('useMotion loading (ADR-007)', () => {
  beforeEach(() => startMotion.mockClear());

  it('never imports the motion chunk under reduced motion', async () => {
    mount({ ...defaultPrefs, reducedMotion: true });
    await flushFrames();
    expect(startMotion).not.toHaveBeenCalled();
  });

  it('starts motion after first paint when motion is allowed', async () => {
    mount({ ...defaultPrefs, reducedMotion: false });
    await flushFrames();
    expect(startMotion).toHaveBeenCalledTimes(1);
  });

  it('forwards layout refreshes to the caller (hash landing is redone once pins settle)', async () => {
    const onLayout = vi.fn();
    layoutCallback = onLayout;
    mount({ ...defaultPrefs, reducedMotion: false });
    await flushFrames();
    const options = (startMotion.mock.calls as unknown as [{ onLayout: () => void }][])[0]?.[0];
    options?.onLayout();
    layoutCallback = undefined;
    expect(onLayout).toHaveBeenCalledTimes(1);
  });

  it('disposes on unmount', async () => {
    const dispose = vi.fn();
    startMotion.mockReturnValueOnce({ dispose });
    const view = mount({ ...defaultPrefs });
    await flushFrames();
    view.unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});

describe('reveal markup', () => {
  it('only names the reveal kind; it never hides anything (FR-7)', () => {
    expect(revealProps('lines')).toEqual({ 'data-reveal': 'lines' });
    expect(revealProps('block')).toEqual({ 'data-reveal': 'block' });
  });
});

describe('scroll seam with a smoother attached', () => {
  const handle = (): SmootherHandle & { paused: ReturnType<typeof vi.fn>; scrollTo: ReturnType<typeof vi.fn> } => ({
    paused: vi.fn(),
    scrollTo: vi.fn(),
  });

  afterEach(() => {
    attachSmoother(null);
    document.body.innerHTML = '';
  });

  it('switches mode and forwards refresh', () => {
    const onRefresh = vi.fn();
    expect(getMode()).toBe('native');
    attachSmoother(handle(), onRefresh);
    expect(getMode()).toBe('smoother');
    refresh();
    expect(onRefresh).toHaveBeenCalledTimes(1);
    attachSmoother(null);
    expect(getMode()).toBe('native');
    refresh();
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('pauses the smoother, not the root element, while locked', () => {
    const h = handle();
    attachSmoother(h);
    lockScroll(true);
    expect(h.paused).toHaveBeenLastCalledWith(true);
    expect(document.documentElement.style.overflow).toBe('');
    lockScroll(false);
    expect(h.paused).toHaveBeenLastCalledWith(false);
  });

  it('jumps through the smoother and still moves focus to the heading', async () => {
    document.body.innerHTML = '<section id="history"><h2 id="history-heading">History</h2></section>';
    const h = handle();
    attachSmoother(h);
    await scrollToAnchor('history', { instant: true, focus: true });
    expect(h.scrollTo).toHaveBeenCalledWith(document.getElementById('history'), false, 'top 0px');
    expect(document.activeElement).toBe(document.getElementById('history-heading'));
  });

  it('native mode still uses scrollIntoView and focus', async () => {
    document.body.innerHTML = '<section id="history"><h2 id="history-heading">History</h2></section>';
    const section = document.getElementById('history') as HTMLElement;
    section.scrollIntoView = vi.fn();
    await scrollToAnchor('history', { instant: true, focus: true });
    expect(section.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).toBe(document.getElementById('history-heading'));
  });
});

describe('onAnchorClick', () => {
  it('routes a plain click on an in-page link through scrollToAnchor and leaves modified clicks alone', () => {
    document.body.innerHTML = '<section id="deployments"></section><a id="l" href="#deployments">go</a>';
    const link = document.getElementById('l') as HTMLAnchorElement;
    const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.addEventListener('click', (e) => onAnchorClick(e as unknown as import('react').MouseEvent<HTMLAnchorElement>));
    link.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(true);
    const modified = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
    link.dispatchEvent(modified);
    expect(modified.defaultPrevented).toBe(false);
  });
});
