import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three';

export interface LabelLine {
  readonly text: string;
  readonly font: string;
  readonly color: string;
  /** Baseline offset as a fraction of the canvas height. */
  readonly y: number;
  readonly tracking?: number;
  /** A soft halo behind the text (flare labels); off for crisp station names. */
  readonly glow?: boolean;
}

export const SANS = '"Geist", "Geist Fallback", system-ui, sans-serif';
export const MONO = '"Geist Mono", "Geist Mono Fallback", ui-monospace, Menlo, monospace';

/** Canvas text drawn once into a texture: the scene needs no font loader, and the label is sharp at 2x. */
export function drawLabel(lines: readonly LabelLine[], width = 1024, height = 256): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d');
  if (g) {
    g.clearRect(0, 0, width, height);
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    for (const line of lines) {
      g.font = line.font;
      g.fillStyle = line.color;
      const ctx = g as CanvasRenderingContext2D & { letterSpacing?: string };
      if (line.tracking !== undefined && 'letterSpacing' in ctx) ctx.letterSpacing = `${line.tracking}px`;
      if (line.glow) {
        g.shadowColor = line.color;
        g.shadowBlur = 8;
        g.fillText(line.text, width / 2, height * line.y);
        g.shadowBlur = 0;
      }
      g.fillText(line.text, width / 2, height * line.y);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

/** Resolves when the two faces the labels use are loaded (or after a short cap), so the canvas is never drawn in a fallback. */
export function fontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return Promise.resolve();
  const load = Promise.all([
    document.fonts.load(`600 64px ${SANS}`),
    document.fonts.load(`500 32px ${MONO}`),
  ]).then(() => undefined);
  const cap = new Promise<void>((resolve) => window.setTimeout(resolve, 1500));
  return Promise.race([load, cap]);
}

/** A soft round falloff for halos and glows. */
export function softDot(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d');
  if (g) {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.2, 'rgba(255,255,255,0.55)');
    grd.addColorStop(0.55, 'rgba(255,255,255,0.12)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
