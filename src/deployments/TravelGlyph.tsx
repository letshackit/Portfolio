import { usePrefs } from '../app/providers/prefsContext';

interface Node {
  readonly x: number;
  readonly y: number;
}

const COLS = 4;
const ROWS = 4;
const BUS_X = 122;

/** 18 nodes: the front end, the gateway and a 4 x 4 block of domain services (architecture: Next.js, gateway, 16 services). */
const NODES: readonly Node[] = [
  { x: 24, y: 66 },
  { x: 84, y: 66 },
  ...Array.from({ length: COLS * ROWS }, (_, k) => ({ x: 160 + Math.floor(k / ROWS) * 52, y: 16 + (k % ROWS) * 33 })),
];

const ROW_YS = Array.from({ length: ROWS }, (_, r) => 16 + r * 33);
const PACKET_PATH = 'M24 66 H84 H122 V49 H160 H316';

interface TravelGlyphProps {
  /** True once the card has revealed: the nodes light in sequence, then an amber packet starts to run. */
  readonly lit: boolean;
}

/** Decorative glyph for the flagship card. The services themselves are named and explained in the Architecture section. */
export function TravelGlyph({ lit }: TravelGlyphProps) {
  const { reducedMotion } = usePrefs();
  return (
    <svg className="td-glyph" viewBox="0 0 340 132" aria-hidden="true" focusable="false" data-lit={lit || undefined}>
      <g className="td-glyph__lines">
        <path d="M24 66 H122" />
        <path d={`M${BUS_X} 16 V115`} />
        {ROW_YS.map((y) => (
          <path key={y} d={`M${BUS_X} ${y} H316`} />
        ))}
      </g>
      {NODES.map((n, i) => (
        <circle
          key={i}
          className="td-glyph__node"
          cx={n.x}
          cy={n.y}
          r={i < 2 ? 5.5 : 4}
          style={{ '--i': i } as React.CSSProperties}
        />
      ))}
      {lit && !reducedMotion ? (
        <circle className="td-glyph__packet" r="3.2">
          <animateMotion dur="3.4s" begin="1.9s" repeatCount="indefinite" path={PACKET_PATH} calcMode="spline" keyTimes="0;1" keySplines="0.65 0 0.35 1" />
        </circle>
      ) : null}
    </svg>
  );
}
