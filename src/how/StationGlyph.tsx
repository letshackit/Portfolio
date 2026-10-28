/**
 * Static line drawings of the seven stations: the still version of what the flight builds in 3D. Used by the list
 * that reduced-motion visitors (and browsers without WebGL) get, so nothing about the pipeline is lost without the scene.
 * Cyan is structure, amber is the work in flight; both come from the page's custom properties.
 */
interface GlyphProps {
  readonly id: string;
}

const SCATTER: ReadonlyArray<readonly [number, number]> = [
  [18, 30],
  [44, 112],
  [30, 70],
  [64, 24],
  [70, 126],
  [92, 48],
  [20, 128],
  [100, 100],
  [56, 82],
];

const CLUSTER: ReadonlyArray<readonly [number, number]> = [
  [160, 62],
  [182, 56],
  [200, 74],
  [172, 80],
  [190, 94],
  [158, 96],
  [214, 62],
  [176, 38],
  [206, 40],
  [150, 78],
  [222, 90],
];

function Research() {
  return (
    <>
      {SCATTER.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" className="glyph__dim" />
      ))}
      <path d="M112 75h26" className="glyph__line" />
      <path d="m133 69 7 6-7 6" className="glyph__line" fill="none" />
      <g className="glyph__line">
        <path d="M160 62 182 56 200 74 172 80 160 62M172 80 190 94 158 96 172 80M200 74 214 62M182 56 176 38M200 74 222 90M160 62 150 78 158 96M182 56 206 40" fill="none" />
      </g>
      {CLUSTER.map(([x, y], i) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={i === 3 ? 4.6 : 3} className={i === 3 ? 'glyph__hot' : 'glyph__node'} />
      ))}
    </>
  );
}

function Prd() {
  return (
    <>
      {[5, 4, 3, 2, 1, 0].map((i) => (
        <rect key={i} x={46 + i * 5} y={24 + i * -2} width="62" height="86" rx="3" className="glyph__sheet" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M58 ${44 + i * 11}h${i === 3 ? 20 : 40}`} className={i === 2 ? 'glyph__hot-line' : 'glyph__dim-line'} />
      ))}
      {[11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((i) => (
        <rect key={i} x={134 + i * 2.6} y={20 - i * 0.6} width="58" height="86" rx="3" className="glyph__sheet" />
      ))}
      <path d="M146 40h30M146 52h40M146 64h26" className="glyph__dim-line" />
      <path d="M46 124h62M134 124h60" className="glyph__line" />
    </>
  );
}

function Ux() {
  return (
    <>
      {[
        [18, 18],
        [92, 18],
        [166, 18],
      ].map(([x, y], i) => (
        <g key={x}>
          <rect x={x} y={y} width="58" height="40" rx="4" className="glyph__sheet" />
          <path d={`M${x! + 8} ${y! + 10}h20M${x! + 8} ${y! + 20}h42M${x! + 8} ${y! + 29}h${i === 1 ? 14 : 30}`} className={i === 1 ? 'glyph__hot-line' : 'glyph__dim-line'} />
        </g>
      ))}
      {[
        [18, 88],
        [92, 88],
      ].map(([x, y]) => (
        <g key={x}>
          <rect x={x} y={y} width="58" height="40" rx="4" className="glyph__sheet" />
          <path d={`M${x! + 8} ${y! + 12}h42M${x! + 8} ${y! + 22}h28`} className="glyph__dim-line" />
        </g>
      ))}
      <rect x="170" y="80" width="26" height="52" rx="5" className="glyph__sheet" />
      <path d="M76 38h16M150 38h16M47 58v30M121 58v30M195 58v22" className="glyph__hot-line" />
    </>
  );
}

function Prototype() {
  return (
    <>
      <rect x="28" y="14" width="184" height="122" rx="8" className="glyph__sheet" />
      <path d="M28 34h184" className="glyph__line" />
      <circle cx="40" cy="24" r="2.4" className="glyph__hot" />
      <circle cx="49" cy="24" r="2.4" className="glyph__node" />
      <circle cx="58" cy="24" r="2.4" className="glyph__node" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x={42 + (i % 4) * 42}
          y={46 + Math.floor(i / 4) * 44}
          width="34"
          height="36"
          rx="5"
          className={i === 2 ? 'glyph__tile glyph__tile--hot' : 'glyph__tile'}
        />
      ))}
    </>
  );
}

function Jira() {
  const cols = [4, 3, 4, 2, 3, 4, 3, 2];
  return (
    <>
      <rect x="14" y="10" width="212" height="130" rx="6" className="glyph__sheet" />
      {cols.map((n, c) => (
        <g key={c}>
          <path d={`M${24 + c * 25} 22h18`} className="glyph__hot-line" />
          {Array.from({ length: n }, (_, r) => (
            <rect key={r} x={24 + c * 25} y={32 + r * 24} width="18" height="14" rx="2.5" className={c === 2 && r === 1 ? 'glyph__tile glyph__tile--hot' : 'glyph__tile'} />
          ))}
        </g>
      ))}
    </>
  );
}

function Qa() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <ellipse cx={92 + i * 24} cy="75" rx={44 - i * 6} ry={58 - i * 8} className={i === 2 ? 'glyph__ring glyph__ring--hot' : 'glyph__ring'} />
        </g>
      ))}
      {[
        [92, 17],
        [136, 75],
        [92, 133],
        [48, 75],
        [124, 36],
        [124, 114],
        [60, 36],
        [60, 114],
      ].map(([x, y], i) => (
        <circle key={i} cx={x! + 8} cy={y} r="2.6" className="glyph__hot" />
      ))}
      <path d="m168 62 8 8 16-18" className="glyph__check" />
    </>
  );
}

function Deploy() {
  return (
    <>
      <path d="M20 148 104 40M220 148 136 40M60 148 110 40M180 148 130 40" className="glyph__dim-line" />
      {[132, 116, 100, 84, 68, 54].map((y, i) => (
        <path key={y} d={`M${100 - (148 - y) * 0.36} ${y}H${140 + (148 - y) * 0.36}`} className="glyph__ring-line" style={{ opacity: 0.25 + i * 0.12 }} />
      ))}
      <rect x="104" y="6" width="32" height="46" rx="3" className="glyph__sheet" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M110 ${14 + i * 10}h20`} className={i === 1 ? 'glyph__hot-line' : 'glyph__dim-line'} />
      ))}
      <circle cx="120" cy="104" r="5" className="glyph__hot" />
      <circle cx="120" cy="104" r="10" className="glyph__halo" />
    </>
  );
}

const GLYPHS: Record<string, () => JSX.Element> = {
  research: Research,
  prd: Prd,
  ux: Ux,
  prototype: Prototype,
  'jira-confluence': Jira,
  'qa-uat': Qa,
  deploy: Deploy,
};

export function StationGlyph({ id }: GlyphProps) {
  const Glyph = GLYPHS[id] ?? Research;
  return (
    <svg className="glyph" viewBox="0 0 240 150" aria-hidden="true" focusable="false">
      <Glyph />
    </svg>
  );
}
