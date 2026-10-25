import { content } from './data/content';

/** Step 0 placeholder: an empty main over the schematic grid, so fonts and tokens are visible. */
export function App() {
  return (
    <main id="main" className="container" style={{ paddingBlock: 'var(--section-pad)' }}>
      <p className="mono-label">{content.hero.eyebrow}</p>
      <p className="lead">{content.hero.subline}</p>
      <p className="mono-value">{content.hero.strip[1]?.value}</p>
    </main>
  );
}
