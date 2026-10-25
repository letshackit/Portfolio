import { ANCHORS } from '../config';
import { content } from '../data/content';
import { Button } from '../ui/Button';
import './Contact.css';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <p className="mono-caption site-footer__name">
          {content.meta.name} &copy; {new Date().getFullYear()}
        </p>
        <Button variant="link" href={`#${ANCHORS.top}`} icon="arrow-up">
          {content.footer.backToTop}
        </Button>
      </div>
    </footer>
  );
}
