import { SESSION_KEYS } from '../config';

/**
 * The only persisted state on the site (NFR-30): one sessionStorage key, no cookies.
 * Storage can throw (Safari private mode, disabled storage); a throw means "not booted, cannot remember".
 */
export function hasBooted(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEYS.booted) === '1';
  } catch {
    return false;
  }
}

export function markBooted(): void {
  try {
    window.sessionStorage.setItem(SESSION_KEYS.booted, '1');
  } catch {
    // Storage unavailable: the boot shows again next time. Acceptable (architecture E.1).
  }
}
