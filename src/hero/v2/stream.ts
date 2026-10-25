/**
 * A terminal that types one line at a time from a pool, forever. Time based: the caller passes `now` (ms), so a slow
 * frame or a throttled timer never changes how fast it types. Framework-free.
 */
export interface StreamLine {
  readonly tag: string;
  readonly text: string;
  /** Draws a check after the line once it is fully typed. */
  readonly ok?: boolean;
}

export interface StreamRow {
  readonly tag: string;
  readonly text: string;
  readonly ok: boolean;
  readonly typing: boolean;
}

export const CHARS_PER_SECOND = 46;
export const LINE_PAUSE_MS = 380;

export class TypedStream {
  private readonly pool: readonly StreamLine[];
  private readonly maxRows: number;
  private readonly instant: boolean;
  private done: StreamLine[] = [];
  private next = 0;
  private current: StreamLine;
  private typedChars = 0;
  private lineStart: number;
  private pausedUntil = 0;

  /** `instant` fills the terminal with finished lines and never types (reduced motion). */
  constructor(pool: readonly StreamLine[], maxRows: number, now: number, instant = false) {
    if (pool.length === 0) throw new Error('TypedStream needs at least one line');
    this.pool = pool;
    this.maxRows = maxRows;
    this.instant = instant;
    this.lineStart = now;
    if (instant) {
      for (let i = 0; i < Math.min(maxRows, pool.length); i += 1) this.done.push(this.take());
    }
    this.current = this.take();
  }

  private take(): StreamLine {
    const line = this.pool[this.next % this.pool.length];
    this.next += 1;
    return line;
  }

  tick(now: number): void {
    if (this.instant) return;
    if (now < this.pausedUntil) return;
    if (this.lineStart < this.pausedUntil) this.lineStart = this.pausedUntil;
    const target = Math.floor(((now - this.lineStart) / 1000) * CHARS_PER_SECOND);
    this.typedChars = Math.min(this.current.text.length, Math.max(this.typedChars, target));
    if (this.typedChars < this.current.text.length) return;
    this.done.push(this.current);
    if (this.done.length > this.maxRows) this.done.shift();
    this.pausedUntil = now + LINE_PAUSE_MS;
    this.current = this.take();
    this.typedChars = 0;
    this.lineStart = this.pausedUntil;
  }

  /** At most `maxRows` rows: finished lines, then the line being typed (never while `instant`). */
  view(): StreamRow[] {
    const rows: StreamRow[] = this.done.map((l) => ({ tag: l.tag, text: l.text, ok: l.ok === true, typing: false }));
    if (!this.instant) {
      rows.push({ tag: this.current.tag, text: this.current.text.slice(0, this.typedChars), ok: false, typing: true });
    }
    return rows.slice(-this.maxRows);
  }
}
