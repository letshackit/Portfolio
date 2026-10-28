/**
 * Face labels are drawn into a canvas texture with the page's own Geist Mono (no 3D text library, no worker, nothing
 * the Content-Security-Policy could block). A label is a title, optionally over a smaller tag line.
 */
import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three';

/** Resolves once the page's mono face is loaded, so the first canvas draw never falls back to a system font. */
export function fontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return Promise.resolve();
  return Promise.all([document.fonts.load('500 40px "Geist Mono"'), document.fonts.ready]).then(() => undefined);
}

/** Texture pixels per world unit. */
const PX_PER_UNIT = 320;

export interface FaceSpec {
  readonly title: string;
  readonly sub?: string;
  /** World-unit size of the plane the texture is stretched over. */
  readonly width: number;
  readonly height: number;
  /** Title font size in world units. */
  readonly fontSize: number;
  readonly color: string;
  readonly subColor: string;
  readonly align?: 'center' | 'left';
  /** A dark backing plate behind the text, for labels that sit over a mesh and its wires. */
  readonly plate?: boolean;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function makeFaceTexture(spec: FaceSpec): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(8, Math.round(spec.width * PX_PER_UNIT));
  canvas.height = Math.max(8, Math.round(spec.height * PX_PER_UNIT));
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const px = spec.fontSize * PX_PER_UNIT;
    const subPx = px * 0.86;
    const left = spec.align === 'left';
    ctx.textAlign = left ? 'left' : 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `500 ${px}px "Geist Mono", ui-monospace, Menlo, monospace`;
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px * 0.03}px`;
    const x = left ? canvas.width * 0.04 : canvas.width / 2;
    const lines = wrap(ctx, spec.title, canvas.width * 0.9);
    const lead = px * 1.18;
    const subGap = spec.sub ? subPx * 1.25 : 0;
    const block = (lines.length - 1) * lead + subGap;
    const top = canvas.height / 2 - block / 2;
    if (spec.plate) {
      const titleW = Math.max(...lines.map((l) => ctx.measureText(l).width), 0);
      // The tag line is set smaller and wider-spaced: approximate its run from the glyph advance (mono: ~0.6em + spacing).
      const subW = spec.sub ? spec.sub.length * subPx * 0.68 : 0;
      const textW = Math.max(titleW, subW);
      const padX = px * 0.55;
      const padY = px * 0.42;
      const w = Math.min(canvas.width - 4, textW + padX * 2);
      const h = Math.min(canvas.height - 4, block + px * 0.7 + padY * 2);
      const r = Math.min(h / 2, px * 0.5);
      const x0 = canvas.width / 2 - w / 2;
      const y0 = canvas.height / 2 - h / 2;
      ctx.beginPath();
      ctx.roundRect(x0, y0, w, h, r);
      ctx.fillStyle = 'rgba(7, 8, 10, 0.86)';
      ctx.fill();
      ctx.lineWidth = Math.max(2, px * 0.05);
      ctx.strokeStyle = spec.subColor;
      ctx.globalAlpha = 0.55;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = spec.color;
    lines.forEach((l, i) => ctx.fillText(l, x, top + i * lead));
    if (spec.sub) {
      ctx.font = `600 ${subPx}px "Geist Mono", ui-monospace, Menlo, monospace`;
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${subPx * 0.08}px`;
      ctx.fillStyle = spec.subColor;
      ctx.fillText(spec.sub, x, top + (lines.length - 1) * lead + subGap);
    }
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  return tex;
}
