import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three';

const FAMILY = '"Geist Mono", ui-monospace, Menlo, Consolas, monospace';

/** Draws text one character at a time with extra tracking (ctx.letterSpacing is missing on older Safari). */
function tracked(g: CanvasRenderingContext2D, text: string, cx: number, y: number, tracking: number): void {
  const widths = [...text].map((ch) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * Math.max(0, widths.length - 1);
  let x = cx - total / 2;
  [...text].forEach((ch, i) => {
    g.fillText(ch, x, y);
    x += widths[i] + tracking;
  });
}

function paint(canvas: HTMLCanvasElement, top: string, main: string): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const { width: w, height: h } = canvas;
  g.clearRect(0, 0, w, h);
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  // Fit the mark to 86 % of the width, then size the small line from it.
  let size = h * 0.42;
  g.font = `600 ${size}px ${FAMILY}`;
  const probe = [...main].reduce((a, ch) => a + g.measureText(ch).width, 0) + size * 0.06 * Math.max(0, main.length - 1);
  if (probe > w * 0.86) size *= (w * 0.86) / probe;
  g.fillStyle = '#e9fdff';
  g.shadowColor = 'rgba(34, 211, 238, 0.9)';
  g.shadowBlur = size * 0.22;
  g.font = `600 ${size}px ${FAMILY}`;
  tracked(g, main, w / 2, h * 0.78, size * 0.06);
  g.shadowBlur = 0;
  const small = Math.min(h * 0.17, size * 0.46);
  g.font = `500 ${small}px ${FAMILY}`;
  g.fillStyle = '#67e8f9';
  tracked(g, top, w / 2, h * 0.3, small * 0.28);
  g.fillStyle = 'rgba(103, 232, 249, 0.55)';
  g.fillRect(w * 0.3, h * 0.4, w * 0.4, Math.max(2, h * 0.008));
}

/**
 * A transparent texture carrying a badge's mark. Drawn at once with whatever font is available, and drawn again when
 * Geist Mono has loaded, so the first frame never waits on a font.
 */
export function createGlyphTexture(top: string, main: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  paint(canvas, top, main);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  if (typeof document.fonts?.load === 'function') {
    void document.fonts.load(`600 40px ${FAMILY}`).then(() => {
      paint(canvas, top, main);
      tex.needsUpdate = true;
    });
  }
  return tex;
}

/** A soft round falloff for the halos behind each badge and for the drifting particles. */
export function createSoftTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  if (g) {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.3, 'rgba(255,255,255,0.45)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}
