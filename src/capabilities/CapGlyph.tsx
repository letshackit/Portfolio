import type { Shape, Tone } from './domains';

interface CapGlyphProps {
  readonly shape: Shape;
  readonly tone: Tone;
  /** One satellite per skill: the glyph is a miniature of the 3D cluster (hub plus its skills). */
  readonly skills: number;
}

const C = 60;
const SAT_R = 50;

/** Edge paths of the hub, drawn in a 120 x 120 box centred on (60, 60): the 2D shadow of each Platonic solid. */
const HUB: Readonly<Record<Shape, string>> = {
  octa: 'M60 30 L88 60 L60 90 L32 60 Z M60 30 L60 90 M32 60 L88 60 M60 42 L76 60 L60 78 L44 60 Z',
  cube: 'M60 32 L84 46 L84 74 L60 88 L36 74 L36 46 Z M60 60 L36 46 M60 60 L84 46 M60 60 L60 88',
  icosa: 'M60 31 L85 45.5 L85 74.5 L60 89 L35 74.5 L35 45.5 Z M60 31 L60 89 M35 45.5 L85 74.5 M85 45.5 L35 74.5 M60 43 L72 66 L48 66 Z',
  tetra: 'M60 32 L88 82 L32 82 Z M60 32 L60 64 M32 82 L60 64 M88 82 L60 64',
};

/** Decorative: the same shape language as the 3D stage, so the stacked cards read as that scene's shadow. */
export function CapGlyph({ shape, tone, skills }: CapGlyphProps) {
  const sats = Array.from({ length: skills }, (_, i) => {
    const a = -Math.PI / 2 + (i / skills) * Math.PI * 2;
    return { x: C + Math.cos(a) * SAT_R, y: C + Math.sin(a) * SAT_R };
  });
  return (
    <svg className="cap-glyph" data-tone={tone} viewBox="0 0 120 120" fill="none" aria-hidden="true" focusable="false">
      <circle className="cap-glyph__orbit" cx={C} cy={C} r={SAT_R} />
      <g className="cap-glyph__ring">
        {sats.map((s, i) => (
          <g key={i}>
            <line className="cap-glyph__spoke" x1={C} y1={C} x2={s.x} y2={s.y} />
            <circle className="cap-glyph__sat" cx={s.x} cy={s.y} r={2.4} />
          </g>
        ))}
      </g>
      <path className="cap-glyph__hub" d={HUB[shape]} pathLength={1} />
      <circle className="cap-glyph__core" cx={C} cy={C} r={3} />
    </svg>
  );
}
