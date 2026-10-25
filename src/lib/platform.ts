/** True on Apple platforms, where the palette shortcut is Cmd+K instead of Ctrl+K. */
export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const source = navigator.platform || navigator.userAgent || '';
  return /mac|iphone|ipad|ipod/i.test(source);
}

/** Label for the palette shortcut shown on the header button. */
export function shortcutLabel(): string {
  return isApplePlatform() ? 'CMD K' : 'CTRL K';
}
