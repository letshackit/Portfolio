import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { ANCHORS, type AnchorId } from '../config';
import { content } from '../data/content';
import { lockScroll, scrollToAnchor } from '../lib/scroll';

interface MobileMenuProps {
  readonly activeSection: AnchorId | null;
  /** Close the menu. `restoreFocus` returns focus to the menu button. */
  readonly onClose: (restoreFocus: boolean) => void;
  readonly onOpenPalette: () => void;
}

/** Narrow-screen section list: focus trap, Escape, restores focus to the menu button (FR-29..31). */
export function MobileMenu({ activeSection, onClose, onOpenPalette }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lockScroll(true);
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();

    const onWindowKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose(true);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      // The menu button toggles itself; any other outside press just dismisses.
      if (target instanceof Element && target.closest('#menu-button')) return;
      onClose(false);
    };
    window.addEventListener('keydown', onWindowKey);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      lockScroll(false);
      window.removeEventListener('keydown', onWindowKey);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [onClose]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const items = panelRef.current?.querySelectorAll<HTMLElement>('a, button');
    if (!items || items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const onLink = (event: MouseEvent<HTMLAnchorElement>, id: AnchorId) => {
    event.preventDefault();
    onClose(true);
    // Scroll only once the menu has closed and released its scroll lock: unlocking mid smooth-scroll cuts the jump short.
    window.requestAnimationFrame(() => void scrollToAnchor(id, { focus: true }));
  };

  return (
    <>
      {/* Dimmed backdrop: a press on it falls outside the panel, so the pointerdown handler above dismisses the menu. */}
      <div className="mobile-menu__scrim" aria-hidden="true" />
    <div
      id="mobile-menu"
      ref={panelRef}
      className="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label={content.ui.navLabel}
      onKeyDown={onKeyDown}
    >
      <ul>
        {content.nav.map((item) => {
          const id = ANCHORS[item.anchor];
          return (
            <li key={item.id}>
              <a
                className="mobile-menu__row mono-label"
                href={`#${id}`}
                aria-current={activeSection === id ? 'location' : undefined}
                onClick={(event) => onLink(event, id)}
              >
                {item.label}
              </a>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            className="mobile-menu__row mobile-menu__row--button mono-label"
            onClick={() => {
              onClose(true);
              onOpenPalette();
            }}
          >
            {content.palette.menuPalette}
          </button>
        </li>
      </ul>
    </div>
    </>
  );
}
