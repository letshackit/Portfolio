import { describe, expect, it } from 'vitest';
import { CONSOLE_LINES, DEPLOY_LINES, EYEBROW, lineToText } from '../hero/v2/copy';
import { CHARS_PER_SECOND, LINE_PAUSE_MS, TypedStream, type StreamLine } from '../hero/v2/stream';

const POOL: StreamLine[] = [
  { tag: 'a', text: 'abcd' },
  { tag: 'b', text: 'wxyz', ok: true },
  { tag: 'c', text: 'long enough' },
];

/** Milliseconds to type `n` characters at the stream's speed, rounded up. */
const typingMs = (n: number) => Math.ceil((n / CHARS_PER_SECOND) * 1000) + 1;

describe('TypedStream', () => {
  it('types the first line character by character on the clock it is given', () => {
    const s = new TypedStream(POOL, 4, 1000);
    expect(s.view()).toEqual([{ tag: 'a', text: '', ok: false, typing: true }]);
    s.tick(1000 + typingMs(2));
    expect(s.view()[0]).toMatchObject({ text: 'ab', typing: true });
  });

  it('finishes a line, pauses, then starts the next from the pool', () => {
    const s = new TypedStream(POOL, 4, 0);
    s.tick(typingMs(4));
    const rows = s.view();
    expect(rows[0]).toMatchObject({ tag: 'a', text: 'abcd', typing: false });
    expect(rows[1]).toMatchObject({ tag: 'b', text: '', typing: true });
    // Nothing is typed during the pause.
    s.tick(typingMs(4) + LINE_PAUSE_MS - 20);
    expect(s.view()[1].text).toBe('');
    s.tick(typingMs(4) + LINE_PAUSE_MS + typingMs(2));
    expect(s.view()[1].text.length).toBeGreaterThan(0);
  });

  it('marks ok only on finished lines, and never exceeds maxRows', () => {
    const s = new TypedStream(POOL, 3, 0);
    let t = 0;
    for (let i = 0; i < 400; i += 1) {
      t += 50;
      s.tick(t);
      const rows = s.view();
      expect(rows.length).toBeLessThanOrEqual(3);
      for (const r of rows) if (r.typing) expect(r.ok).toBe(false);
    }
  });

  it('loops the pool forever', () => {
    const s = new TypedStream(POOL, 6, 0);
    let t = 0;
    for (let i = 0; i < 2000; i += 1) {
      t += 50;
      s.tick(t);
    }
    const tags = s.view().map((r) => r.tag);
    expect(tags.length).toBeGreaterThan(3);
    expect(new Set(tags).size).toBe(3);
  });

  it('a long stall jumps to the end of the line being typed, no further', () => {
    const s = new TypedStream(POOL, 4, 0);
    s.tick(60_000);
    expect(s.view()[0]).toMatchObject({ text: 'abcd', typing: false });
    expect(s.view()[1]).toMatchObject({ tag: 'b', text: '', typing: true });
  });

  it('instant mode holds the finished log at once and never types', () => {
    const s = new TypedStream(POOL, 6, 0, true);
    const rows = s.view();
    expect(rows.map((r) => r.text)).toEqual(['abcd', 'wxyz', 'long enough']);
    expect(rows.every((r) => !r.typing)).toBe(true);
    s.tick(99_999);
    expect(s.view()).toEqual(rows);
  });

  it('rejects an empty pool', () => {
    expect(() => new TypedStream([], 4, 0)).toThrow();
  });
});

describe('hero copy', () => {
  it('derives the console from the content file, with no empty numbers', () => {
    expect(CONSOLE_LINES.length).toBeGreaterThan(4);
    for (const l of CONSOLE_LINES) {
      expect(l.text.trim()).not.toBe('');
      expect(l.text).not.toMatch(/undefined|NaN/);
    }
  });

  it('ends the DEPLOY stream gates with checks and describes every line in text', () => {
    expect(DEPLOY_LINES.filter((l) => l.ok).length).toBeGreaterThan(5);
    expect(lineToText({ tag: 'qa', text: 'coverage gate', ok: true })).toBe('qa: coverage gate, passed');
  });

  it('keeps the eyebrow to the ask', () => {
    expect(EYEBROW).toBe('OPEN TO FORWARD DEPLOYED ENGINEER ROLES');
  });
});
