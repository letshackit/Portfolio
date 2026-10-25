/**
 * Scrolling seam (ADR-002, architecture E.4). Only this module knows whether a smoother exists.
 * Native mode is the default; motion.ts attaches ScrollSmoother through attachSmoother() when eligible.
 */
import type { MouseEvent } from 'react';
import { ANCHORS, type AnchorId } from '../config';

/** Focus sentinel at the very start of the page: focus lands here when the boot ends, so the next Tab reaches the skip link (FR-23). */
export const PAGE_START_ID = 'page-start';

export type ScrollMode = 'native' | 'smoother';

/** The slice of ScrollSmoother this module uses, so scroll.ts does not import gsap. */
export interface SmootherHandle {
  paused(value: boolean): void;
  scrollTo(target: Element, smooth: boolean, position: string): void;
}

export interface ScrollOptions {
  readonly instant?: boolean;
  readonly focus?: boolean;
}

/** Longest wait for a smooth scroll to settle where `scrollend` is unsupported. */
const SETTLE_FALLBACK_MS = 650;
/** Minimum wait before focusing, so a closing dialog's focus restore never wins. */
const FOCUS_DELAY_MS = 30;

let smoother: SmootherHandle | null = null;
let refreshHook: (() => void) | null = null;
let lockCount = 0;

export function getMode(): ScrollMode {
  return smoother ? 'smoother' : 'native';
}

/** Called by motion.ts. `onRefresh` forwards to ScrollTrigger so this module never imports gsap. */
export function attachSmoother(instance: SmootherHandle | null, onRefresh?: () => void): void {
  smoother = instance;
  refreshHook = instance ? (onRefresh ?? null) : null;
  if (instance) {
    // Hand an open dialog's scroll lock from the root element over to the smoother.
    const root = document.documentElement;
    root.style.overflow = '';
    root.style.scrollbarGutter = '';
    if (lockCount > 0) instance.paused(true);
  } else if (lockCount > 0) {
    const root = document.documentElement;
    root.style.overflow = 'hidden';
    root.style.scrollbarGutter = 'stable';
  }
}

/** Height of the fixed header, so smoother jumps land the heading clear of it (native mode uses scroll-padding-top). */
function headerOffset(): number {
  return document.querySelector('header')?.getBoundingClientRect().height ?? 0;
}

export function isAnchorId(value: string): value is AnchorId {
  return (Object.values(ANCHORS) as string[]).includes(value);
}

/** Section id named by an in-page href such as "#deployments", or null for anything else. */
function anchorIdFromHref(href: string | null): AnchorId | null {
  if (!href || !href.startsWith('#')) return null;
  const id = href.slice(1);
  return isAnchorId(id) ? id : null;
}

/**
 * Click handler for in-page links: routes a plain left click through scrollToAnchor so ScrollSmoother, the hash
 * and focus stay in step. Modified clicks and unknown targets keep their native meaning.
 */
export function onAnchorClick(event: MouseEvent<HTMLAnchorElement>): void {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const id = anchorIdFromHref(event.currentTarget.getAttribute('href'));
  if (!id) return;
  event.preventDefault();
  void scrollToAnchor(id, { focus: true });
}

/** The element that takes focus after a jump: the section heading, or the section itself. */
function focusTarget(id: AnchorId): HTMLElement | null {
  const heading = document.getElementById(`${id}-heading`);
  if (heading) return heading;
  return document.getElementById(id);
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function waitForSettle(instant: boolean): Promise<void> {
  return new Promise((resolve) => {
    if (instant) {
      window.setTimeout(resolve, FOCUS_DELAY_MS);
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener('scrollend', finish);
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(finish, SETTLE_FALLBACK_MS);
    window.addEventListener('scrollend', finish, { once: true });
  });
}

/**
 * Jump to a section like a header link does: scroll, update the hash without a history entry, then move focus
 * to the heading (FR-28). Reduced motion or `instant` jumps without animation (FR-31).
 */
export async function scrollToAnchor(id: AnchorId, options: ScrollOptions = {}): Promise<void> {
  const section = document.getElementById(id);
  if (!section) return;
  const instant = options.instant === true || prefersReducedMotion();

  if (smoother) {
    smoother.scrollTo(section, !instant, `top ${Math.round(headerOffset())}px`);
  } else if (typeof section.scrollIntoView === 'function') {
    // scroll-padding-top on html (base.css) keeps the heading clear of the fixed header.
    section.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'start' });
  }
  try {
    window.history.replaceState(null, '', `#${id}`);
  } catch {
    // Some sandboxed contexts refuse replaceState; the scroll itself has already happened.
  }

  await waitForSettle(instant);
  if (options.focus) {
    const target = focusTarget(id);
    if (target) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  }
}

/** Freeze page scrolling while a dialog is open. Reference counted so nested dialogs unwind in any order. */
export function lockScroll(on: boolean): void {
  lockCount = Math.max(0, lockCount + (on ? 1 : -1));
  const locked = lockCount > 0;
  if (smoother) smoother.paused(locked);
  const root = document.documentElement;
  if (smoother) return;
  root.style.overflow = locked ? 'hidden' : '';
  root.style.scrollbarGutter = locked ? 'stable' : '';
}

/** Recalculate after layout changes (a details panel opened). No-op in native mode. */
export function refresh(): void {
  refreshHook?.();
}
