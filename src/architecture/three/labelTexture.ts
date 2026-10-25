/**
 * Block labels are drawn into a canvas texture with the page's own Geist Mono instead of a 3D text library: no worker,
 * no second font file, and nothing the Content-Security-Policy (`script-src 'self'`) could block.
 */
import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three';

/** Texture pixels per world unit. */
const PX_PER_UNIT = 380;

export function fontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return Promise.resolve();
  return Promise.all([document.fonts.load('500 40px "Geist Mono"'), document.fonts.ready]).then(() => undefined);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
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

export interface LabelSpec {
  readonly text: string;
  /** Face size in world units. */
  readonly width: number;
  readonly height: number;
  /** Cap height in world units. */
  readonly fontSize: number;
  readonly color: string;
}

export function makeLabelTexture({ text, width, height, fontSize, color }: LabelSpec): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * PX_PER_UNIT);
  canvas.height = Math.round(height * PX_PER_UNIT);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const px = fontSize * PX_PER_UNIT;
    ctx.font = `500 ${px}px "Geist Mono", ui-monospace, Menlo, monospace`;
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px * 0.04}px`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = wrap(ctx, text, canvas.width * 0.88);
    const lead = px * 1.2;
    const top = canvas.height / 2 - ((lines.length - 1) * lead) / 2;
    lines.forEach((l, i) => ctx.fillText(l, canvas.width / 2, top + i * lead));
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  return tex;
}
