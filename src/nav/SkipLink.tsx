import type { MouseEvent } from 'react';
import { content } from '../data/content';
import './Header.css';

/** Move focus into main so the next Tab starts inside the content (FR-26). */
function focusMain(event: MouseEvent<HTMLAnchorElement>) {
  const main = document.getElementById('main');
  if (!main) return;
  event.preventDefault();
  main.focus();
  main.scrollIntoView();
}

export function SkipLink() {
  return (
    <a className="skip-link" href="#main" onClick={focusMain}>
      {content.ui.skipLink}
    </a>
  );
}
