let cached: boolean | undefined;

/**
 * True when a WebGL context can be created without a major performance caveat (architecture C.6 step 3). Probes with a
 * 1 x 1 canvas, webgl2 first, then webgl, and releases the context straight away. The answer is cached.
 */
export function supportsWebGL(): boolean {
  if (cached !== undefined) return cached;
  cached = probe();
  return cached;
}

function probe(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const attrs: WebGLContextAttributes = { failIfMajorPerformanceCaveat: true };
    const gl = canvas.getContext('webgl2', attrs) ?? canvas.getContext('webgl', attrs);
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Test seam: forget the cached probe result. */
export function resetWebGLProbe(): void {
  cached = undefined;
}
