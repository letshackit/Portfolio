import { ANCHORS } from '../config';
import { content } from '../data/content';
import { Button } from '../ui/Button';
import { contactCopy } from './contactCopy';
import './Contact.css';

const HOST = new URL(content.meta.url).hostname;

/** Status bar: the last frame of the HUD. The dot is amber because it is a live indicator. */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <p className="site-footer__status mono-caption">
          <span className="site-footer__dot" aria-hidden="true" />
          {contactCopy.statusNominal} · {HOST} · &copy; {new Date().getFullYear()}
        </p>
        <Button variant="link" href={`#${ANCHORS.top}`} icon="arrow-up">
          {content.footer.backToTop}
        </Button>
      </div>
    </footer>
  );
}
