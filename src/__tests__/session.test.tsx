import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyText } from '../lib/clipboard';
import { hasBooted, markBooted } from '../lib/session';

describe('session', () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('is not booted in a fresh session and remembers after markBooted', () => {
    expect(hasBooted()).toBe(false);
    markBooted();
    expect(hasBooted()).toBe(true);
  });

  it('uses exactly one key, hs.boot', () => {
    markBooted();
    expect(window.sessionStorage.length).toBe(1);
    expect(window.sessionStorage.getItem('hs.boot')).toBe('1');
  });

  it('survives storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(hasBooted()).toBe(false);
    expect(() => markBooted()).not.toThrow();
  });
});

describe('clipboard result mapping', () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  afterEach(() => {
    if (original) Object.defineProperty(navigator, 'clipboard', original);
    else Reflect.deleteProperty(navigator, 'clipboard');
  });

  function stubClipboard(value: unknown) {
    Object.defineProperty(navigator, 'clipboard', { value, configurable: true });
  }

  it('maps a successful write to copied and passes the text through', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ writeText });
    await expect(copyText('hello')).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('maps a rejected write to blocked', async () => {
    stubClipboard({ writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) });
    await expect(copyText('hello')).resolves.toBe('blocked');
  });

  it('maps a missing Clipboard API to blocked', async () => {
    stubClipboard(undefined);
    await expect(copyText('hello')).resolves.toBe('blocked');
  });
});
