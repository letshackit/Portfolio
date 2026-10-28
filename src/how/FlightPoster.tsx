/**
 * The poster under the 3D canvas: the conduit in one-point perspective, drawn in SVG. It is on screen from the first
 * paint, so the frame is never empty while the 3D chunk loads, and it stays if the scene never arrives.
 */
export function FlightPoster({ vertical }: { readonly vertical: boolean }) {
  if (vertical) {
    return (
      <svg className="flight__poster-svg" viewBox="0 0 390 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id="fp-glow-v" cx="50%" cy="40%" r="60%">
            <stop offset="0" stopColor="var(--cyan-500)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--cyan-500)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="390" height="640" fill="url(#fp-glow-v)" />
        <path d="M195 0V640" className="fp-rail" />
        {Array.from({ length: 12 }, (_, i) => (
          <ellipse key={i} cx="195" cy={40 + i * 54} rx="120" ry="14" className="fp-ring" style={{ opacity: 0.18 + (i % 3) * 0.1 }} />
        ))}
        <circle cx="195" cy="250" r="6" className="fp-packet" />
      </svg>
    );
  }
  return (
    <svg className="flight__poster-svg" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="fp-glow" cx="52%" cy="46%" r="55%">
          <stop offset="0" stopColor="var(--cyan-500)" stopOpacity="0.3" />
          <stop offset="1" stopColor="var(--cyan-500)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="700" fill="url(#fp-glow)" />
      <g className="fp-rail">
        <path d="M610 330 460 700M610 330 760 700M610 330 610 700" />
      </g>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const k = Math.pow(i / 8, 1.7);
        const rx = 40 + k * 640;
        const ry = 22 + k * 330;
        return <ellipse key={i} cx="610" cy={330 + k * 120} rx={rx} ry={ry} className="fp-ring" style={{ opacity: 0.15 + k * 0.5 }} />;
      })}
      <circle cx="610" cy="470" r="7" className="fp-packet" />
      <circle cx="610" cy="470" r="18" className="fp-packet-halo" />
    </svg>
  );
}
