import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { BootScreen } from '../boot/BootScreen';
import { bootSchedule } from '../boot/bootTimeline';
import { content } from '../data/content';

describe('boot schedule', () => {
  it('ends within 1.2 s, prints the headline before the fade, and spaces lines', () => {
    const schedule = bootSchedule(content.boot.length);
    expect(schedule.done).toBeLessThanOrEqual(1200);
    expect(schedule.headline).toBeLessThan(schedule.ending);
    expect(schedule.ending).toBeLessThan(schedule.done);
    expect(schedule.stage).toBeGreaterThan(schedule.headline);
    expect(schedule.stage).toBeLessThan(schedule.ending);
    expect(schedule.appear).toHaveLength(content.boot.length);
    expect(schedule.appear[schedule.appear.length - 1]).toBeLessThan(schedule.headline);
  });
});

describe('BootScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('focuses Skip first and is an aria-modal dialog', () => {
    render(<BootScreen onDone={() => undefined} />);
    expect(screen.getByRole('dialog', { name: 'Site starting' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'SKIP' })).toHaveFocus();
    expect(document.body).toHaveClass('is-booting');
  });

  it('prints the name and the tagline as its last lines, not as a heading', () => {
    const { container } = render(<BootScreen onDone={() => undefined} />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    const echo = container.querySelector('.boot__echo');
    expect(echo).toHaveAttribute('aria-hidden', 'true');
    expect(echo).toHaveTextContent('HARSHAL SARAOGI');
    expect(echo).toHaveTextContent('Forward-deployed. I build what I spec.');
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('lets the page start its 3D stage 300 ms before the fade, once', () => {
    const onStage = vi.fn();
    const onEnding = vi.fn();
    render(<BootScreen onDone={() => undefined} onStage={onStage} onEnding={onEnding} />);
    act(() => {
      vi.advanceTimersByTime(699);
    });
    expect(onStage).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(onStage).toHaveBeenCalledTimes(1);
    expect(onEnding).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(onEnding).toHaveBeenCalledTimes(1);
    expect(onStage).toHaveBeenCalledTimes(1);
  });

  it('a skip before the stage point still releases the stage', () => {
    const onStage = vi.fn();
    render(<BootScreen onDone={() => undefined} onStage={onStage} />);
    fireEvent.keyDown(window, { key: 'a' });
    expect(onStage).toHaveBeenCalledTimes(1);
  });

  it('finishes by itself at 1.2 s and records the session', () => {
    const onDone = vi.fn();
    const view = render(<BootScreen onDone={onDone} />);
    act(() => {
      vi.advanceTimersByTime(1199);
    });
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem('hs.boot')).toBe('1');
    view.unmount();
    expect(document.body).not.toHaveClass('is-booting');
  });

  it('any key skips, within one fade; modifier-only keys do not', () => {
    const onDone = vi.fn();
    render(<BootScreen onDone={onDone} />);
    fireEvent.keyDown(window, { key: 'Shift' });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'a' });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('a click skips', () => {
    const onDone = vi.fn();
    render(<BootScreen onDone={onDone} />);
    fireEvent.pointerDown(window);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('App boot gate', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('shows the boot on a first visit and not after the session is marked', () => {
    const first = render(<App />);
    expect(screen.getByRole('dialog', { name: 'Site starting' })).toBeInTheDocument();
    first.unmount();
    window.sessionStorage.setItem('hs.boot', '1');
    render(<App />);
    expect(screen.queryByRole('dialog', { name: 'Site starting' })).toBeNull();
  });
});
