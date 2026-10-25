import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UiProvider } from '../app/providers/UiProvider';
import { useUi } from '../app/providers/uiContext';
import { content } from '../data/content';
import { CommandPalette } from '../palette/CommandPalette';
import { buildCommands, filterCommands, moveIndex } from '../palette/commands';
import { Toast } from '../ui/Toast';

function Opener() {
  const { setPaletteOpen } = useUi();
  return (
    <button type="button" onClick={() => setPaletteOpen(true)}>
      open
    </button>
  );
}

function renderPalette() {
  return render(
    <UiProvider>
      <Opener />
      <CommandPalette />
      <Toast />
    </UiProvider>,
  );
}

function stubClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
  vi.restoreAllMocks();
});

describe('palette logic', () => {
  const commands = buildCommands();

  it('has exactly 11 commands: 8 Go to, then résumé, email, LinkedIn', () => {
    expect(commands).toHaveLength(11);
    expect(commands.filter((c) => c.label.startsWith('Go to'))).toHaveLength(8);
    expect(commands.slice(8).map((c) => c.label)).toEqual(['Download résumé', 'Copy email', 'Open LinkedIn']);
  });

  it('filters case- and accent-insensitively; empty query keeps all', () => {
    expect(filterCommands(commands, '').length).toBe(11);
    expect(filterCommands(commands, 'RESUME').map((c) => c.id)).toEqual(['resume']);
    expect(filterCommands(commands, '  deploy ').map((c) => c.id)).toEqual(['goto-deployments']);
    expect(filterCommands(commands, 'zzz')).toEqual([]);
  });

  it('wraps the highlight in both directions', () => {
    expect(moveIndex(0, -1, 11)).toBe(10);
    expect(moveIndex(10, 1, 11)).toBe(0);
    expect(moveIndex(3, 1, 11)).toBe(4);
    expect(moveIndex(0, 1, 0)).toBe(0);
  });
});

describe('CommandPalette', () => {
  it('opens on Ctrl+K and Cmd+K and toggles closed', () => {
    renderPalette();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'K', metaKey: true });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('lists 11 options, focuses the input, and filters with a no-match row', () => {
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = screen.getByRole('combobox');
    expect(input).toHaveFocus();
    expect(screen.getAllByRole('option')).toHaveLength(11);
    fireEvent.change(input, { target: { value: 'RESUME' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(screen.getByRole('option')).toHaveTextContent('No matching command');
  });

  it('moves the highlight with Down and Up', () => {
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = screen.getByRole('combobox');
    const options = () => screen.getAllByRole('option');
    expect(options()[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(options()[1]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', options()[1].id);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(options()[10]).toHaveAttribute('aria-selected', 'true');
  });

  it('Escape closes and returns focus to the opener', () => {
    renderPalette();
    const opener = screen.getByRole('button', { name: 'open' });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
  });

  it('keeps focus inside on Tab and locks page scroll while open', () => {
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(input).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe('hidden');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('Copy email writes the address, closes, and announces Email copied', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ writeText });
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'copy' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(writeText).toHaveBeenCalledWith(content.contact.email);
    expect(screen.getByRole('status')).toHaveTextContent('Email copied');
  });

  it('shows the address and a mailto link when the clipboard is blocked', async () => {
    stubClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'copy' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByDisplayValue(content.contact.email)).toBeInTheDocument());
    expect(within(dialog).getByRole('link', { name: 'Write an email' })).toHaveAttribute(
      'href',
      `mailto:${content.contact.email}`,
    );
  });

  it('Open LinkedIn opens a new tab with noopener noreferrer', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.click(screen.getByRole('option', { name: /Open LinkedIn/ }));
    expect(open).toHaveBeenCalledWith(content.contact.linkedin, '_blank', 'noopener,noreferrer');
  });

  it('Download résumé clicks a download link with the file name', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe(content.contact.resumeFileName);
    });
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.click(screen.getByRole('option', { name: /Download résumé/ }));
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('a Go to command closes the palette and focuses the section heading', async () => {
    renderPalette();
    const heading = document.createElement('h2');
    heading.id = 'contact-heading';
    const section = document.createElement('section');
    section.id = 'contact';
    section.appendChild(heading);
    document.body.appendChild(section);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'contact' } });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(heading).toHaveFocus());
    section.remove();
  });
});
