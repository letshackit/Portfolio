/**
 * The still behind the 3D stage: the same idea drawn in SVG (a path receding to a vanishing point, four hex stations,
 * the nearest one amber). It is what shows before the canvas arrives, with reduced data, and without WebGL, so the
 * stage box is never empty and nothing moves when the canvas fades in over it.
 */
export function Poster() {
  const stations = [
    { x: 250, y: 470, s: 1, amber: true },
    { x: 330, y: 330, s: 0.62, amber: false },
    { x: 400, y: 245, s: 0.4, amber: false },
    { x: 452, y: 192, s: 0.25, amber: false },
  ];
  const hex = (cx: number, cy: number, r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
    }).join(' ');
  return (
    <svg className="tl3__poster-svg" viewBox="0 0 800 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="tl3-spine" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#f59e0b" />
          <stop offset="0.35" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke="#22d3ee" strokeOpacity="0.16" strokeWidth="1" fill="none">
        {[-6, -4, -2, 0, 2, 4, 6, 8, 10].map((k) => (
          <line key={k} x1={470 + k * 18} y1="168" x2={470 + k * 120 - 170} y2="640" />
        ))}
        {[200, 230, 275, 340, 430, 560].map((y) => (
          <line key={y} x1="0" y1={y} x2="800" y2={y} />
        ))}
      </g>
      <path d="M250 640 C 250 520 320 420 330 330 S 420 230 452 192 S 470 170 472 150" stroke="url(#tl3-spine)" strokeWidth="3" fill="none" />
      <path d="M250 640 C 250 520 320 420 330 330 S 420 230 452 192 S 470 170 472 150" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="12" fill="none" />
      {stations.map((s, i) => (
        <g key={i}>
          <polygon
            points={hex(s.x, s.y, 130 * s.s)}
            fill={s.amber ? '#f59e0b' : '#22d3ee'}
            fillOpacity="0.05"
            stroke={s.amber ? '#f59e0b' : '#22d3ee'}
            strokeOpacity={s.amber ? 0.9 : 0.55}
            strokeWidth={Math.max(1, 3 * s.s)}
          />
          <circle cx={s.x} cy={s.y} r={14 * s.s + 2} fill={s.amber ? '#fbbf24' : '#22d3ee'} fillOpacity={s.amber ? 1 : 0.8} />
        </g>
      ))}
    </svg>
  );
}
