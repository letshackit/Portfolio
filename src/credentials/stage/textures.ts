import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three';
import type { BadgeSpec, Emblem } from '../slots';

const MONO = '"Geist Mono", ui-monospace, Menlo, Consolas, monospace';
const SANS = '"Geist", "Helvetica Neue", Arial, sans-serif';

type Ctx = CanvasRenderingContext2D;

const TAU = Math.PI * 2;

function makeCanvas(w: number, h = w): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

/** Runs `paint` now, and again when the brand fonts have arrived, so the first frame never waits on a font. */
function withFonts(tex: CanvasTexture, paint: () => void): void {
  paint();
  if (typeof document.fonts?.load === 'function') {
    void Promise.all([document.fonts.load(`700 40px ${SANS}`), document.fonts.load(`600 40px ${MONO}`)]).then(() => {
      paint();
      tex.needsUpdate = true;
    });
  }
}

/** Text one character at a time with extra tracking (ctx.letterSpacing is missing on older Safari). */
function tracked(g: Ctx, text: string, cx: number, y: number, tracking: number): void {
  const widths = [...text].map((ch) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * Math.max(0, widths.length - 1);
  let x = cx - total / 2;
  [...text].forEach((ch, i) => {
    g.fillText(ch, x, y);
    x += widths[i] + tracking;
  });
}

function trackedWidth(g: Ctx, text: string, tracking: number): number {
  return [...text].reduce((a, ch) => a + g.measureText(ch).width, 0) + tracking * Math.max(0, [...text].length - 1);
}

/** Shrinks a font size until a tracked line fits `max` px. */
function fit(g: Ctx, text: string, weight: number, family: string, size: number, trackEm: number, max: number): number {
  g.font = `${weight} ${size}px ${family}`;
  const w = trackedWidth(g, text, size * trackEm);
  return w > max ? size * (max / w) : size;
}

/** Text laid along a circle, clockwise, centred on 12 o'clock and repeated to close the ring exactly. */
function ringText(g: Ctx, text: string, cx: number, cy: number, r: number, size: number, weight: number): void {
  g.font = `${weight} ${size}px ${MONO}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const chars = [...`${text} · `];
  const widths = chars.map((ch) => g.measureText(ch).width);
  const unitW = widths.reduce((a, b) => a + b, 0);
  const circ = TAU * r;
  const copies = Math.max(1, Math.round(circ / (unitW * 1.12)));
  const extra = (circ - copies * unitW) / (copies * chars.length);
  let a = -(unitW + extra * chars.length) / r / 2;
  for (let c = 0; c < copies; c += 1) {
    chars.forEach((ch, i) => {
      const step = (widths[i] + extra) / r;
      g.save();
      g.translate(cx, cy);
      g.rotate(a + step / 2);
      g.translate(0, -r);
      g.fillText(ch, 0, 0);
      g.restore();
      a += step;
    });
  }
}

interface Ink {
  readonly main: string;
  readonly soft: string;
  readonly accent: string;
}

const GOLD: Ink = { main: '#ffe3ad', soft: 'rgba(251, 191, 36, 0.8)', accent: '#67e8f9' };
const STEEL: Ink = { main: '#e6fdff', soft: 'rgba(103, 232, 249, 0.82)', accent: '#fbbf24' };

/** The abstract mark in the upper half of a medallion's face, in the unit disc (radius 1), centred on (0, 0). */
function drawEmblem(g: Ctx, emblem: Emblem, ink: Ink): void {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = ink.soft;
  g.fillStyle = ink.soft;
  g.lineWidth = 0.028;
  switch (emblem) {
    case 'gantt': {
      // A three-row schedule with a milestone.
      const rows: [number, number, number][] = [
        [-0.55, -0.4, 0.55],
        [-0.3, 0, 0.62],
        [-0.55, 0.4, 0.3],
      ];
      g.lineWidth = 0.1;
      rows.forEach(([x, y, w], i) => {
        g.strokeStyle = i === 1 ? ink.accent : ink.soft;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + w, y);
        g.stroke();
      });
      g.strokeStyle = ink.main;
      g.lineWidth = 0.025;
      g.beginPath();
      g.moveTo(-0.74, -0.64);
      g.lineTo(-0.74, 0.64);
      g.stroke();
      g.fillStyle = ink.accent;
      g.beginPath();
      g.moveTo(0.64, -0.12);
      g.lineTo(0.78, 0);
      g.lineTo(0.64, 0.12);
      g.closePath();
      g.fill();
      break;
    }
    case 'nodes': {
      // A small network: seven nodes, edges between neighbours.
      const pts: [number, number][] = [
        [-0.7, 0.2],
        [-0.4, -0.45],
        [0, 0.05],
        [0.35, -0.5],
        [0.72, 0.1],
        [0.3, 0.55],
        [-0.25, 0.6],
      ];
      const links: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [6, 0], [2, 6], [4, 5]];
      g.lineWidth = 0.022;
      for (const [a, b] of links) {
        g.beginPath();
        g.moveTo(pts[a][0], pts[a][1]);
        g.lineTo(pts[b][0], pts[b][1]);
        g.stroke();
      }
      pts.forEach(([x, y], i) => {
        g.fillStyle = i === 2 ? ink.accent : ink.main;
        g.beginPath();
        g.arc(x, y, i === 2 ? 0.1 : 0.065, 0, TAU);
        g.fill();
      });
      break;
    }
    case 'cloud': {
      g.lineWidth = 0.05;
      g.beginPath();
      g.moveTo(-0.62, 0.34);
      g.arc(-0.42, 0.1, 0.24, Math.PI * 0.5, Math.PI * 1.5);
      g.arc(-0.05, -0.12, 0.36, Math.PI, TAU - 0.35);
      g.arc(0.44, 0.04, 0.26, -Math.PI * 0.55, Math.PI * 0.5);
      g.closePath();
      g.stroke();
      g.fillStyle = ink.accent;
      for (const x of [-0.3, 0, 0.3]) {
        g.beginPath();
        g.arc(x, 0.62, 0.05, 0, TAU);
        g.fill();
      }
      break;
    }
    case 'shield': {
      g.lineWidth = 0.05;
      g.beginPath();
      g.moveTo(0, -0.74);
      g.lineTo(0.58, -0.52);
      g.lineTo(0.58, 0.1);
      g.quadraticCurveTo(0.56, 0.46, 0, 0.78);
      g.quadraticCurveTo(-0.56, 0.46, -0.58, 0.1);
      g.lineTo(-0.58, -0.52);
      g.closePath();
      g.stroke();
      g.strokeStyle = ink.accent;
      g.lineWidth = 0.07;
      g.beginPath();
      g.moveTo(-0.24, 0.02);
      g.lineTo(-0.05, 0.22);
      g.lineTo(0.28, -0.2);
      g.stroke();
      break;
    }
    case 'orbit': {
      // A ring, a body, and a bar chart rising beneath it.
      g.lineWidth = 0.04;
      g.save();
      g.rotate(-0.45);
      g.scale(1, 0.38);
      g.beginPath();
      g.arc(0, 0, 0.78, 0, TAU);
      g.stroke();
      g.restore();
      g.fillStyle = ink.main;
      g.beginPath();
      g.arc(0, 0, 0.2, 0, TAU);
      g.fill();
      g.fillStyle = ink.accent;
      g.beginPath();
      g.arc(0.58, -0.28, 0.08, 0, TAU);
      g.fill();
      g.fillStyle = ink.soft;
      [0.18, 0.34, 0.52].forEach((h, i) => g.fillRect(-0.34 + i * 0.28, 0.78 - h, 0.14, h));
      break;
    }
    case 'lattice': {
      g.lineWidth = 0.02;
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * TAU;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(Math.cos(a) * 0.7, Math.sin(a) * 0.7);
        g.stroke();
        g.beginPath();
        g.arc(Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0.07, 0, TAU);
        g.fill();
      }
      break;
    }
    case 'cube':
    case 'page':
      break;
  }
}

/**
 * A medallion's face: dark machined metal, the title and issuer running round the rim, a bezel of ticks, an abstract
 * emblem, the issuer's wordmark and a line under it. `glow` is the same drawing as light on black (the emissive and
 * bump map): the colour pass keeps the ink dimmer so the metal still reads under the lights.
 */
function paintCoin(canvas: HTMLCanvasElement, spec: BadgeSpec, glow: boolean): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const S = canvas.width;
  const R = S / 2;
  const ink = spec.metal === 'gold' ? GOLD : STEEL;
  g.clearRect(0, 0, S, S);
  g.fillStyle = '#000';
  g.fillRect(0, 0, S, S);
  if (!glow) {
    g.save();
    g.translate(R, R);
    g.scale(R, R);
    const base = g.createRadialGradient(-0.3, -0.35, 0.05, 0, 0, 1);
    base.addColorStop(0, spec.metal === 'gold' ? '#1c1a15' : '#16242a');
    base.addColorStop(0.6, spec.metal === 'gold' ? '#0d0c0a' : '#0a1418');
    base.addColorStop(1, '#050809');
    g.fillStyle = base;
    g.beginPath();
    g.arc(0, 0, 1, 0, TAU);
    g.fill();
    // Machining lines.
    g.lineWidth = 0.004;
    for (let r = 0.2; r < 0.7; r += 0.018) {
      g.strokeStyle = `rgba(255,255,255,${0.018 + 0.02 * Math.abs(Math.sin(r * 40))})`;
      g.beginPath();
      g.arc(0, 0, r, 0, TAU);
      g.stroke();
    }
    g.restore();
  }

  const col = (c: string) => (glow ? '#ffffff' : c);
  g.save();
  g.globalAlpha = glow ? 1 : 0.9;
  // Rings: an outer hairline, the rim text band, an inner bezel.
  g.lineWidth = Math.max(1.5, S * 0.0045);
  g.strokeStyle = col(ink.soft);
  for (const r of [0.97, 0.745]) {
    g.beginPath();
    g.arc(R, R, R * r, 0, TAU);
    g.stroke();
  }
  g.lineWidth = Math.max(1, S * 0.003);
  g.beginPath();
  g.arc(R, R, R * 0.7, 0, TAU);
  g.stroke();
  // Ticks.
  for (let i = 0; i < 90; i += 1) {
    const a = (i / 90) * TAU;
    const long = i % 5 === 0;
    const r0 = R * (long ? 0.655 : 0.675);
    const r1 = R * 0.7;
    g.lineWidth = long ? S * 0.005 : S * 0.0028;
    g.strokeStyle = col(long ? ink.accent : ink.soft);
    g.beginPath();
    g.moveTo(R + Math.sin(a) * r0, R - Math.cos(a) * r0);
    g.lineTo(R + Math.sin(a) * r1, R - Math.cos(a) * r1);
    g.stroke();
  }
  // Rim text.
  g.fillStyle = col(ink.main);
  ringText(g, spec.ring, R, R, R * 0.855, R * 0.082, 600);
  // Emblem.
  g.save();
  g.translate(R, R - R * 0.27);
  g.scale(R * 0.34, R * 0.34);
  drawEmblem(g, spec.emblem, { main: col(ink.main), soft: col(ink.soft), accent: col(ink.accent) });
  g.restore();
  // Wordmark and the line under it.
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  const wordSize = fit(g, spec.word, 700, SANS, R * 0.3, 0.04, R * 1.18);
  g.font = `700 ${wordSize}px ${SANS}`;
  g.fillStyle = col('#ffffff');
  if (!glow) {
    g.shadowColor = spec.metal === 'gold' ? 'rgba(245,158,11,0.9)' : 'rgba(34,211,238,0.9)';
    g.shadowBlur = wordSize * 0.35;
  }
  tracked(g, spec.word, R, R + R * 0.22, wordSize * 0.04);
  g.shadowBlur = 0;
  const subSize = fit(g, spec.sub, 500, MONO, R * 0.075, 0.2, R * 1.1);
  g.font = `500 ${subSize}px ${MONO}`;
  g.fillStyle = col(ink.main);
  tracked(g, spec.sub, R, R + R * 0.43, subSize * 0.2);
  g.fillStyle = col(ink.accent);
  g.fillRect(R - R * 0.14, R + R * 0.29, R * 0.28, Math.max(2, S * 0.006));
  g.restore();
}

export interface CoinTextures {
  readonly map: CanvasTexture;
  readonly glow: CanvasTexture;
}

export function createCoinTextures(spec: BadgeSpec, size: number): CoinTextures {
  const a = makeCanvas(size);
  const b = makeCanvas(size);
  const map = toTexture(a);
  const glow = toTexture(b);
  withFonts(map, () => paintCoin(a, spec, false));
  withFonts(glow, () => paintCoin(b, spec, true));
  return { map, glow };
}

/**
 * The engraved plate on a monument's face: a dark, softly edged ground (the glass behind it is bright, so without one
 * the letters wash out), a small line above, the wordmark, a hairline and the line under it. Transparent elsewhere.
 */
export function createPlateTexture(spec: BadgeSpec): CanvasTexture {
  const canvas = makeCanvas(768, 384);
  const tex = toTexture(canvas);
  withFonts(tex, () => {
    const g = canvas.getContext('2d');
    if (!g) return;
    const { width: w, height: h } = canvas;
    g.clearRect(0, 0, w, h);
    const plate = g.createRadialGradient(w / 2, h * 0.52, h * 0.05, w / 2, h * 0.52, w * 0.52);
    plate.addColorStop(0, 'rgba(2, 12, 18, 0.88)');
    plate.addColorStop(0.72, 'rgba(2, 12, 18, 0.7)');
    plate.addColorStop(1, 'rgba(2, 12, 18, 0)');
    g.fillStyle = plate;
    g.fillRect(0, 0, w, h);
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    const warm = spec.kind === 'stone';
    const wordSize = fit(g, spec.word, 700, SANS, h * 0.46, 0.04, w * 0.82);
    g.font = `700 ${wordSize}px ${SANS}`;
    g.fillStyle = '#ffffff';
    g.shadowColor = warm ? 'rgba(245, 158, 11, 0.95)' : 'rgba(34, 211, 238, 1)';
    g.shadowBlur = wordSize * 0.28;
    const baseY = spec.sub ? h * 0.66 : h * 0.72;
    tracked(g, spec.word, w / 2, baseY, wordSize * 0.04);
    g.shadowBlur = 0;
    if (spec.top) {
      const s = fit(g, spec.top, 500, MONO, h * 0.085, 0.3, w * 0.7);
      g.font = `500 ${s}px ${MONO}`;
      g.fillStyle = warm ? '#fde68a' : '#a5f3fc';
      tracked(g, spec.top, w / 2, h * 0.2, s * 0.3);
    }
    g.fillStyle = warm ? '#22d3ee' : '#f59e0b';
    g.fillRect(w * 0.36, h * (spec.sub ? 0.73 : 0.8), w * 0.28, Math.max(3, h * 0.012));
    if (spec.sub) {
      const s = fit(g, spec.sub, 600, MONO, h * 0.12, 0.28, w * 0.7);
      g.font = `600 ${s}px ${MONO}`;
      g.fillStyle = warm ? '#fde68a' : '#cffafe';
      tracked(g, spec.sub, w / 2, h * 0.89, s * 0.28);
    }
  });
  return tex;
}

/** The publication's cover: title, venue, and ruled lines standing in for the text. Opaque, dark, amber-lit. */
export function createPageTexture(spec: BadgeSpec): CanvasTexture {
  const canvas = makeCanvas(512, 768);
  const tex = toTexture(canvas);
  withFonts(tex, () => {
    const g = canvas.getContext('2d');
    if (!g) return;
    const { width: w, height: h } = canvas;
    const bg = g.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#12181c');
    bg.addColorStop(1, '#080b0d');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(245,158,11,0.55)';
    g.lineWidth = 3;
    g.strokeRect(22, 22, w - 44, h - 44);
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    const s0 = fit(g, spec.top, 600, MONO, 26, 0.3, w * 0.7);
    g.font = `600 ${s0}px ${MONO}`;
    g.fillStyle = '#fbbf24';
    g.fillText(spec.top, 56, 92);
    g.font = `700 112px ${SANS}`;
    g.fillStyle = '#ffffff';
    g.shadowColor = 'rgba(245,158,11,0.8)';
    g.shadowBlur = 26;
    spec.word.split(' ').forEach((word, i) => g.fillText(word, 52, 208 + i * 112));
    g.shadowBlur = 0;
    g.fillStyle = '#22d3ee';
    g.fillRect(56, 448, 150, 5);
    g.font = `500 24px ${MONO}`;
    g.fillStyle = '#a5f3fc';
    spec.sub
      .split(' ')
      .reduce<string[]>((lines, word) => {
        const last = lines[lines.length - 1];
        if (last !== undefined && `${last} ${word}`.length <= 20) lines[lines.length - 1] = `${last} ${word}`;
        else lines.push(word);
        return lines;
      }, [])
      .forEach((line, i) => g.fillText(line, 56, 500 + i * 34));
    [0.78, 0.9, 0.62, 0.86, 0.5].forEach((f, i) => {
      g.fillStyle = i === 2 ? 'rgba(245,158,11,0.7)' : 'rgba(103,232,249,0.34)';
      g.fillRect(56, 600 + i * 22, (w - 112) * f, 6);
    });
  });
  return tex;
}

/** Concentric rings, degree ticks and four spokes: the etched top of a plinth. Light on black (emissive). */
export function createPlinthTexture(size = 512): CanvasTexture {
  const canvas = makeCanvas(size);
  const g = canvas.getContext('2d');
  if (g) {
    const R = size / 2;
    g.fillStyle = '#000';
    g.fillRect(0, 0, size, size);
    g.strokeStyle = '#ffffff';
    for (const [r, wdt, a] of [[0.97, 3, 0.9], [0.86, 1.5, 0.5], [0.52, 1.5, 0.35]] as const) {
      g.globalAlpha = a;
      g.lineWidth = wdt;
      g.beginPath();
      g.arc(R, R, R * r, 0, TAU);
      g.stroke();
    }
    g.globalAlpha = 0.7;
    for (let i = 0; i < 120; i += 1) {
      const a = (i / 120) * TAU;
      const long = i % 10 === 0;
      g.lineWidth = long ? 3 : 1.2;
      g.beginPath();
      g.moveTo(R + Math.sin(a) * R * (long ? 0.8 : 0.84), R - Math.cos(a) * R * (long ? 0.8 : 0.84));
      g.lineTo(R + Math.sin(a) * R * 0.86, R - Math.cos(a) * R * 0.86);
      g.stroke();
    }
    g.globalAlpha = 0.28;
    g.lineWidth = 1.5;
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * TAU;
      g.beginPath();
      g.moveTo(R + Math.sin(a) * R * 0.14, R - Math.cos(a) * R * 0.14);
      g.lineTo(R + Math.sin(a) * R * 0.5, R - Math.cos(a) * R * 0.5);
      g.stroke();
    }
  }
  return toTexture(canvas);
}

/** A soft round falloff for the halos and the drifting particles. */
export function createSoftTexture(): CanvasTexture {
  const c = makeCanvas(128);
  const g = c.getContext('2d');
  if (g) {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.3, 'rgba(255,255,255,0.45)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  }
  return toTexture(c);
}
