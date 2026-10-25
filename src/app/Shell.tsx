import { Architecture } from '../architecture/Architecture';
import { Capabilities } from '../capabilities/Capabilities';
import { Contact } from '../contact/Contact';
import { Footer } from '../contact/Footer';
import { Deployments } from '../deployments/Deployments';
import { Hero } from '../hero/Hero';
import { History } from '../history/History';
import { HowIWork } from '../how/HowIWork';
import { Header } from '../nav/Header';
import { SkipLink } from '../nav/SkipLink';
import { Recognition } from '../recognition/Recognition';
import '../ui/ui.css';

/** Page frame: skip link, header, one main with the sections in PRD order, footer. */
export function Shell() {
  return (
    <>
      <SkipLink />
      <Header />
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
    </>
  );
}
