import { useEffect, useRef } from 'react';
import { usePrefs } from '../app/providers/prefsContext';

interface Parsed {
  readonly prefix: string;
  readonly target: number;
  readonly suffix: string;
  readonly grouped: boolean;
}

const PATTERN = /^(~?)([\d,]+)(\+|%)?$/;
const DURATION_MS = 1100;

/** "~50,000", "12+", "~60%" and "116" are countable; anything else is shown as written. */
function parse(value: string): Parsed | null {
  const m = PATTERN.exec(value);
  if (!m) return null;
  const digits = m[2] ?? '';
  return { prefix: m[1] ?? '', target: Number(digits.replace(/,/g, '')), suffix: m[3] ?? '', grouped: digits.includes(',') };
}

function format(p: Parsed, n: number): string {
  return `${p.prefix}${p.grouped ? n.toLocaleString('en-US') : String(n)}${p.suffix}`;
}

/** Splits a metric string such as "116-page PRD" into its leading figure and the words that explain it. */
export function splitMetric(metric: string): { readonly figure: string; readonly caption: string } | null {
  const m = /^(~?[\d,]+(?:\+|%)?)(.*)$/.exec(metric);
  if (!m) return null;
  const caption = (m[2] ?? '').replace(/^[-\s]+/, '');
  return caption ? { figure: m[1] ?? '', caption } : null;
}

interface CountUpProps {
  readonly value: string;
  /** Counts from zero each time this flips to true; shows the final value otherwise. */
  readonly play: boolean;
  readonly className?: string;
}

/** Mono figure that counts up. The final value is always in the DOM for assistive tech and for no-JS or reduced-motion visitors. */
export function CountUp({ value, play, className }: CountUpProps) {
  const { reducedMotion } = usePrefs();
  const ref = useRef<HTMLSpanElement>(null);
  const parsed = parse(value);

  useEffect(() => {
    const el = ref.current;
    const p = parse(value);
    if (!el || !p) return;
    if (!play || reducedMotion) {
      el.textContent = format(p, p.target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(p, Math.round(p.target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [play, reducedMotion, value]);

  if (!parsed) return <span className={className}>{value}</span>;
  return (
    <>
      <span className="visually-hidden">{value}</span>
      <span ref={ref} className={className} aria-hidden="true">
        {format(parsed, parsed.target)}
      </span>
    </>
  );
}
