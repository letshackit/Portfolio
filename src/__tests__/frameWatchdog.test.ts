import { describe, expect, it } from 'vitest';
import { createWatchdog } from '../lib/frameWatchdog';

describe('FrameWatchdog', () => {
  const frames = (w: ReturnType<typeof createWatchdog>, n: number, ms: number) => {
    for (let i = 0; i < n; i += 1) w.tick(ms / 1000);
  };

  it('does nothing at a healthy frame rate', () => {
    const calls: string[] = [];
    const w = createWatchdog({ onDegrade: () => calls.push('degrade'), onFail: () => calls.push('fail') });
    frames(w, 600, 16);
    expect(calls).toEqual([]);
  });

  it('degrades once on a slow mean, then fails if it stays slow', () => {
    const calls: string[] = [];
    const w = createWatchdog({ onDegrade: () => calls.push('degrade'), onFail: () => calls.push('fail') });
    frames(w, 30 + 180, 36);
    expect(calls).toEqual(['degrade']);
    frames(w, 10 + 180, 45);
    expect(calls).toEqual(['degrade', 'fail']);
  });

  it('recovers after degrading when the second window is fine', () => {
    const calls: string[] = [];
    const w = createWatchdog({ onDegrade: () => calls.push('degrade'), onFail: () => calls.push('fail') });
    frames(w, 210, 36);
    frames(w, 400, 20);
    expect(calls).toEqual(['degrade']);
  });

  it('ignores the long delta of a resumed loop', () => {
    const calls: string[] = [];
    const w = createWatchdog({ onDegrade: () => calls.push('degrade'), onFail: () => calls.push('fail') });
    frames(w, 30, 16);
    w.tick(5);
    frames(w, 400, 16);
    expect(calls).toEqual([]);
  });
});
