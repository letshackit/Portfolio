import { ANCHORS } from '../config';
import { content } from '../data/content';
import { anchorHref } from '../lib/anchors';
import './Header.css';

/** Fixed header with static anchor links. Menu, palette button and active state arrive in step 4. */
export function Header() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a className="site-header__brand" href={`#${ANCHORS.top}`}>
          <span className="site-header__mark" aria-hidden="true">
            {content.ui.monogram}
          </span>
          <span className="site-header__name">{content.meta.name}</span>
        </a>
        <nav className="site-header__nav" aria-label={content.ui.navLabel}>
          <ul className="site-header__list">
            {content.nav.map((item) => (
              <li key={item.id}>
                <a className="site-header__link mono-label" href={anchorHref(item.anchor)}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
