import { describe, expect, it } from 'vitest';
import { resetWebGLProbe, supportsWebGL } from '../lib/webgl';

describe('supportsWebGL', () => {
  it('is false where no context can be made (jsdom) and caches the answer', () => {
    resetWebGLProbe();
    expect(supportsWebGL()).toBe(false);
    expect(supportsWebGL()).toBe(false);
  });

  it('probes the lenient mode separately from the strict one', () => {
    resetWebGLProbe();
    expect(supportsWebGL(true)).toBe(false);
    expect(supportsWebGL(false)).toBe(false);
  });
});
