import { useEffect, useMemo, useRef, useState } from 'react';
import { TypedStream, type StreamLine, type StreamRow } from './stream';

/** How often the typed view is refreshed. The stream itself is time based, so this only sets the visual cadence. */
const TICK_MS = 60;

const same = (a: readonly StreamRow[], b: readonly StreamRow[]): boolean =>
  a.length === b.length && a.every((r, i) => r.text === b[i].text && r.ok === b[i].ok && r.typing === b[i].typing);

interface StreamOptions {
  /** Reduced motion: the finished log, rendered at once, never typing. */
  readonly instant: boolean;
  /** The page has entered (boot over): typing starts then, not behind the boot screen. */
  readonly active: boolean;
  /** Off screen or tab hidden: no timer runs. */
  readonly paused: boolean;
}

/** Rows of a typing terminal. Renders at most `maxRows`; with `instant` the first render already holds the final log. */
export function useStream(pool: readonly StreamLine[], maxRows: number, { instant, active, paused }: StreamOptions): StreamRow[] {
  const finished = useMemo(() => (instant ? new TypedStream(pool, maxRows, 0, true).view() : []), [instant, pool, maxRows]);
  const [rows, setRows] = useState<StreamRow[]>([]);
  const stream = useRef<TypedStream | null>(null);

  useEffect(() => {
    if (instant || !active || paused) return;
    const s = (stream.current ??= new TypedStream(pool, maxRows, performance.now()));
    const id = window.setInterval(() => {
      s.tick(performance.now());
      const next = s.view();
      setRows((prev) => (same(prev, next) ? prev : next));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [instant, active, paused, pool, maxRows]);

  return instant ? finished : rows;
}
