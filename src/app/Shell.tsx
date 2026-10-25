import { Architecture } from '../architecture/Architecture';
import { Capabilities } from '../capabilities/Capabilities';
import { Contact } from '../contact/Contact';
import { Footer } from '../contact/Footer';
import { CommandPalette } from '../palette/CommandPalette';
import { Cursor } from '../ui/Cursor';
import { Toast } from '../ui/Toast';
import { Deployments } from '../deployments/Deployments';
import { Hero } from '../hero/v2/Hero';
import { History } from '../history/History';
import { HowIWork } from '../how/HowIWork';
import { PAGE_START_ID } from '../lib/scroll';
import { Header } from '../nav/Header';
import { SkipLink } from '../nav/SkipLink';
import { Recognition } from '../recognition/Recognition';
import '../ui/ui.css';
import './Shell.css';

/** Page frame: skip link, header, one main with the sections in PRD order, footer. */
export function Shell() {
  return (
    <>
      <div id={PAGE_START_ID} className="page-start" tabIndex={-1} />
      <SkipLink />
      <Header />
      {/* Plain divs in native mode; ScrollSmoother takes them over on desktop (ADR-002). Header and overlays stay outside. */}
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main id="main" tabIndex={-1}>
            <Hero />
            <HowIWork />
            <Deployments />
            <Architecture />
            <Capabilities />
            <History />
            <Recognition />
            <Contact />
          </main>
          <Footer />
        </div>
      </div>
      <CommandPalette />
      <Toast />
      <Cursor />
    </>
  );
}
