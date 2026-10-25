import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { content } from '../data/content';

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

function renderBooted() {
  window.sessionStorage.setItem('hs.boot', '1');
  return render(<App />);
}

describe('integration of steps 2 to 6', () => {
  it('keeps the page content inside the smoother wrapper and the header outside it', () => {
    renderBooted();
    const wrapper = document.getElementById('smooth-wrapper');
    const main = document.getElementById('main');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelector('#smooth-content')?.contains(main)).toBe(true);
    expect(wrapper?.querySelector('footer')).not.toBeNull();
    expect(wrapper?.querySelector('header')).toBeNull();
  });

  it('offers a copy-email button in Contact', () => {
    renderBooted();
    const contact = document.getElementById('contact');
    expect(contact).not.toBeNull();
    expect(within(contact as HTMLElement).getByRole('button', { name: content.palette.copyButton })).toBeTruthy();
  });

  it('positions hero stage buttons through the frame variables with a static fallback', () => {
    renderBooted();
    const item = document.querySelector<HTMLElement>('.pipeline-overlay__item');
    expect(item?.style.getPropertyValue('--px')).toMatch(/^var\(--px-0, /);
    expect(item?.style.getPropertyValue('--py')).toMatch(/^var\(--py-0, /);
  });

  it('labels the hero stage list differently from the stepper list', () => {
    renderBooted();
    expect(screen.getAllByLabelText(content.ui.heroStagesLabel).length).toBe(1);
    expect(content.ui.heroStagesLabel).not.toBe(content.ui.stageListLabel);
  });
});
