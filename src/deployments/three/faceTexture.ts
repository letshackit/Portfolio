/**
 * Face labels are drawn into a canvas texture with the page's own Geist Mono (no 3D text library, no worker, nothing
 * the Content-Security-Policy could block). A label is a title, optionally over a smaller tag line.
 */
import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three';
import { fontsReady } from '../../architecture/three/labelTexture';

export { fontsReady };

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
    const subPx = px * 0.66;
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
    ctx.fillStyle = spec.color;
    lines.forEach((l, i) => ctx.fillText(l, x, top + i * lead));
    if (spec.sub) {
      ctx.font = `500 ${subPx}px "Geist Mono", ui-monospace, Menlo, monospace`;
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${subPx * 0.12}px`;
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
