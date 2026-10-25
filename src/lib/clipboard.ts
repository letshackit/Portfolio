export type CopyResult = 'copied' | 'blocked';

/**
 * Write text to the clipboard. 'blocked' covers no Clipboard API, an insecure context and a denied permission;
 * callers show a manual-copy fallback for it (FR-40).
 */
export async function copyText(text: string): Promise<CopyResult> {
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  if (!clipboard || typeof clipboard.writeText !== 'function') return 'blocked';
  try {
    await clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'blocked';
  }
}
