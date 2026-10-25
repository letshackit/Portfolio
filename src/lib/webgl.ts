const cached: { strict?: boolean; lenient?: boolean } = {};

/**
 * True when a WebGL context can be created without a major performance caveat (architecture C.6 step 3). Probes with a
 * 1 x 1 canvas, webgl2 first, then webgl, and releases the context straight away. The answer is cached.
 * `allowSoftware` accepts a software renderer too (QA and screenshots on machines without a GPU); the page never asks for it.
 */
export function supportsWebGL(allowSoftware = false): boolean {
  const key = allowSoftware ? 'lenient' : 'strict';
  cached[key] ??= probe(!allowSoftware);
  return cached[key];
}

function probe(failIfMajorPerformanceCaveat: boolean): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const attrs: WebGLContextAttributes = { failIfMajorPerformanceCaveat };
    const gl = canvas.getContext('webgl2', attrs) ?? canvas.getContext('webgl', attrs);
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Test seam: forget the cached probe results. */
export function resetWebGLProbe(): void {
  delete cached.strict;
  delete cached.lenient;
}
