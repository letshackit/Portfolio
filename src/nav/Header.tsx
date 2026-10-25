import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { useUi } from '../app/providers/uiContext';
import { ANCHORS, type AnchorId } from '../config';
import { content } from '../data/content';
import { scrollToAnchor } from '../lib/scroll';
import { shortcutLabel } from '../lib/platform';
import { Icon } from '../ui/Icon';
import { MobileMenu } from './MobileMenu';
import './Header.css';

/** Width from which the section links show inline and the menu button disappears (architecture E.2). */
const INLINE_NAV_MIN = 900;

/** Plain left click only: modified clicks keep their browser meaning (new tab, download). */
function isPlainClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/** Fixed header: brand, section links with the active one marked, palette button, mobile menu. */
export function Header() {
  const { activeSection, setPaletteOpen } = useUi();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setMenuOpen(false);
    if (restoreFocus) menuButtonRef.current?.focus();
  }, []);

  // The inline links take over at wide widths, so an open menu must not linger.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(`(min-width: ${INLINE_NAV_MIN}px)`);
    const onChange = () => {
      if (list.matches) setMenuOpen(false);
    };
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, []);

  const go = (event: MouseEvent, id: AnchorId) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    void scrollToAnchor(id, { focus: true });
  };

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a
          className="site-header__brand"
          href={`#${ANCHORS.top}`}
          aria-label={content.meta.name}
          onClick={(event) => go(event, ANCHORS.top)}
        >
          <span className="site-header__mark" aria-hidden="true">
            {content.ui.monogram}
          </span>
          <span className="site-header__name">{content.meta.name}</span>
        </a>
        <nav className="site-header__nav" aria-label={content.ui.navLabel}>
          <ul className="site-header__list">
            {content.nav.map((item) => {
              const id = ANCHORS[item.anchor];
              return (
                <li key={item.id}>
                  <a
                    className="site-header__link mono-label"
                    href={`#${id}`}
                    aria-current={activeSection === id ? 'location' : undefined}
                    onClick={(event) => go(event, id)}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="site-header__actions">
          <button
            type="button"
            className="btn btn--secondary site-header__btn"
            aria-label={content.palette.openPalette}
            onClick={() => setPaletteOpen(true)}
          >
            <Icon name="command" />
            <span className="site-header__shortcut" aria-hidden="true">
              {shortcutLabel()}
            </span>
          </button>
          <button
            id="menu-button"
            ref={menuButtonRef}
            type="button"
            className="btn btn--secondary site-header__btn site-header__menu-btn"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {content.palette.menu}
          </button>
        </div>
      </div>
      {menuOpen ? (
        <MobileMenu
          activeSection={activeSection}
          onClose={closeMenu}
          onOpenPalette={() => setPaletteOpen(true)}
        />
      ) : null}
    </header>
  );
}
