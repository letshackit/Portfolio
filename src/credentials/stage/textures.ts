import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three';
import { DIM, EMBLEM, type BadgeSpec, type Emblem } from '../slots';

const MONO = '"Geist Mono", ui-monospace, Menlo, Consolas, monospace';
const SANS = '"Geist", "Helvetica Neue", Arial, sans-serif';

type Ctx = CanvasRenderingContext2D;

const TAU = Math.PI * 2;

/** Canvas 2D cannot read CSS variables, so the two palette colours are repeated here (tokens.css is the source). */
const CYAN = '#22d3ee';
const CYAN_SOFT = '#67e8f9';
const AMBER = '#f59e0b';
const AMBER_SOFT = '#fbbf24';

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

function trackedWidth(g: Ctx, text: string, tracking: number): number {
  return [...text].reduce((a, ch) => a + g.measureText(ch).width, 0) + tracking * Math.max(0, [...text].length - 1);
}

/** Text one character at a time with extra tracking (ctx.letterSpacing is missing on older Safari), left edge at `x`. */
function tracked(g: Ctx, text: string, x: number, y: number, tracking: number): void {
  let cursor = x;
  for (const ch of text) {
    g.fillText(ch, cursor, y);
    cursor += g.measureText(ch).width + tracking;
  }
}

/** Shrinks a font size until a tracked line fits `max` px. */
function fit(g: Ctx, text: string, weight: number, family: string, size: number, trackEm: number, max: number): number {
  g.font = `${weight} ${size}px ${family}`;
  const w = trackedWidth(g, text, size * trackEm);
  return w > max ? size * (max / w) : size;
}

interface Ink {
  readonly main: string;
  readonly soft: string;
  readonly accent: string;
}

/** The abstract mark of a credential, in the unit disc (radius 1) centred on (0, 0). Plain diagrams of the subject; no logos. */
function drawEmblem(g: Ctx, emblem: Emblem, ink: Ink): void {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = ink.soft;
  g.fillStyle = ink.soft;
  g.lineWidth = 0.05;
  switch (emblem) {
    case 'gantt': {
      const rows: [number, number, number][] = [
        [-0.55, -0.4, 0.55],
        [-0.3, 0, 0.62],
        [-0.55, 0.4, 0.3],
      ];
      g.lineWidth = 0.13;
      rows.forEach(([x, y, w], i) => {
        g.strokeStyle = i === 1 ? ink.accent : ink.soft;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + w, y);
        g.stroke();
      });
      g.strokeStyle = ink.main;
      g.lineWidth = 0.05;
      g.beginPath();
      g.moveTo(-0.74, -0.66);
      g.lineTo(-0.74, 0.66);
      g.stroke();
      g.fillStyle = ink.accent;
      g.beginPath();
      g.moveTo(0.62, -0.16);
      g.lineTo(0.8, 0);
      g.lineTo(0.62, 0.16);
      g.closePath();
      g.fill();
      break;
    }
    case 'nodes': {
      const pts: [number, number][] = [[-0.7, 0.2], [-0.4, -0.45], [0, 0.05], [0.35, -0.5], [0.72, 0.1], [0.3, 0.55], [-0.25, 0.6]];
      const links: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [6, 0], [2, 6], [4, 5]];
      g.lineWidth = 0.04;
      for (const [a, b] of links) {
        g.beginPath();
        g.moveTo(pts[a][0], pts[a][1]);
        g.lineTo(pts[b][0], pts[b][1]);
        g.stroke();
      }
      pts.forEach(([x, y], i) => {
        g.fillStyle = i === 2 ? ink.accent : ink.main;
        g.beginPath();
        g.arc(x, y, i === 2 ? 0.14 : 0.09, 0, TAU);
        g.fill();
      });
      break;
    }
    case 'cloud': {
      g.lineWidth = 0.08;
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
        g.arc(x, 0.64, 0.07, 0, TAU);
        g.fill();
      }
      break;
    }
    case 'shield': {
      g.lineWidth = 0.08;
      g.beginPath();
      g.moveTo(0, -0.78);
      g.lineTo(0.6, -0.54);
      g.lineTo(0.6, 0.1);
      g.quadraticCurveTo(0.58, 0.48, 0, 0.82);
      g.quadraticCurveTo(-0.58, 0.48, -0.6, 0.1);
      g.lineTo(-0.6, -0.54);
      g.closePath();
      g.stroke();
      g.strokeStyle = ink.accent;
      g.lineWidth = 0.11;
      g.beginPath();
      g.moveTo(-0.25, 0.02);
      g.lineTo(-0.05, 0.24);
      g.lineTo(0.3, -0.2);
      g.stroke();
      break;
    }
    case 'orbit': {
      g.lineWidth = 0.065;
      g.save();
      g.rotate(-0.45);
      g.scale(1, 0.38);
      g.beginPath();
      g.arc(0, 0, 0.8, 0, TAU);
      g.stroke();
      g.restore();
      g.fillStyle = ink.main;
      g.beginPath();
      g.arc(0, 0, 0.22, 0, TAU);
      g.fill();
      g.fillStyle = ink.accent;
      g.beginPath();
      g.arc(0.6, -0.3, 0.1, 0, TAU);
      g.fill();
      g.fillStyle = ink.soft;
      [0.2, 0.36, 0.54].forEach((h, i) => g.fillRect(-0.36 + i * 0.3, 0.8 - h, 0.17, h));
      break;
    }
    case 'lattice': {
      // A small neural net: three layers, every node joined to the next layer; one lit path in the accent colour.
      const cols: [number, number][][] = [
        [[-0.72, -0.42], [-0.72, 0], [-0.72, 0.42]],
        [[0, -0.6], [0, -0.2], [0, 0.2], [0, 0.6]],
        [[0.72, -0.28], [0.72, 0.28]],
      ];
      g.lineWidth = 0.025;
      g.globalAlpha = 0.65;
      for (let l = 0; l < cols.length - 1; l += 1) {
        for (const a of cols[l]) {
          for (const b of cols[l + 1]) {
            g.beginPath();
            g.moveTo(a[0], a[1]);
            g.lineTo(b[0], b[1]);
            g.stroke();
          }
        }
      }
      g.globalAlpha = 1;
      g.strokeStyle = ink.accent;
      g.lineWidth = 0.07;
      g.beginPath();
      g.moveTo(cols[0][1][0], cols[0][1][1]);
      g.lineTo(cols[1][2][0], cols[1][2][1]);
      g.lineTo(cols[2][0][0], cols[2][0][1]);
      g.stroke();
      for (const col of cols) {
        for (const [x, y] of col) {
          g.fillStyle = ink.main;
          g.beginPath();
          g.arc(x, y, 0.1, 0, TAU);
          g.fill();
        }
      }
      break;
    }
    case 'cube': {
      // An isometric wireframe cube with a lit vertex: computing, as a solid.
      const top: [number, number] = [0, -0.8];
      const ul: [number, number] = [-0.7, -0.4];
      const ur: [number, number] = [0.7, -0.4];
      const mid: [number, number] = [0, 0];
      const ll: [number, number] = [-0.7, 0.4];
      const lr: [number, number] = [0.7, 0.4];
      const bot: [number, number] = [0, 0.8];
      g.lineWidth = 0.06;
      const path = (pts: [number, number][]) => {
        g.beginPath();
        pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
        g.closePath();
        g.stroke();
      };
      path([top, ur, lr, bot, ll, ul]);
      g.globalAlpha = 0.7;
      g.beginPath();
      g.moveTo(ul[0], ul[1]);
      g.lineTo(mid[0], mid[1]);
      g.lineTo(ur[0], ur[1]);
      g.moveTo(mid[0], mid[1]);
      g.lineTo(bot[0], bot[1]);
      g.stroke();
      g.globalAlpha = 1;
      g.fillStyle = ink.accent;
      g.beginPath();
      g.arc(mid[0], mid[1], 0.14, 0, TAU);
      g.fill();
      break;
    }
    case 'page': {
      // A sheet with ruled lines and a small node graph in its corner.
      g.lineWidth = 0.06;
      g.beginPath();
      g.moveTo(-0.55, -0.8);
      g.lineTo(0.2, -0.8);
      g.lineTo(0.55, -0.45);
      g.lineTo(0.55, 0.8);
      g.lineTo(-0.55, 0.8);
      g.closePath();
      g.stroke();
      g.lineWidth = 0.07;
      [0.05, 0.28, 0.51].forEach((y, i) => {
        g.strokeStyle = i === 1 ? ink.accent : ink.soft;
        g.beginPath();
        g.moveTo(-0.32, y);
        g.lineTo(i === 2 ? 0.1 : 0.32, y);
        g.stroke();
      });
      g.fillStyle = ink.accent;
      g.beginPath();
      g.arc(-0.1, -0.42, 0.11, 0, TAU);
      g.fill();
      break;
    }
  }
}

function inkFor(spec: BadgeSpec): Ink {
  return spec.metal === 'gold' ? { main: '#fff1d0', soft: AMBER_SOFT, accent: CYAN_SOFT } : { main: '#e6fdff', soft: CYAN_SOFT, accent: AMBER_SOFT };
}

/** The emblem alone, light on a transparent ground, with its own glow. It floats in front of the face as a separate plane. */
export function createEmblemTexture(spec: BadgeSpec, size = 256): CanvasTexture {
  const canvas = makeCanvas(size);
  const tex = toTexture(canvas);
  const g = canvas.getContext('2d');
  if (g) {
    g.clearRect(0, 0, size, size);
    g.save();
    g.translate(size / 2, size / 2);
    g.scale(size * 0.34, size * 0.34);
    const ink = inkFor(spec);
    // Two passes: a blurred copy for the glow, then the crisp one.
    g.shadowColor = spec.metal === 'gold' ? AMBER : CYAN;
    g.shadowBlur = size * 0.07;
    drawEmblem(g, spec.emblem, ink);
    g.shadowBlur = 0;
    drawEmblem(g, spec.emblem, ink);
    g.restore();
  }
  return tex;
}

/** Brackets at the four corners of a frame inset `m` px: the amber (or cyan) accent of every slab. */
function brackets(g: Ctx, w: number, h: number, m: number, len: number, width: number): void {
  g.lineWidth = width;
  g.lineCap = 'square';
  g.beginPath();
  g.moveTo(m, m + len);
  g.lineTo(m, m);
  g.lineTo(m + len, m);
  g.moveTo(w - m - len, h - m);
  g.lineTo(w - m, h - m);
  g.lineTo(w - m, h - m - len);
  g.stroke();
}

/** The face of a slab: panel, hairline frame, corner brackets, label, the WORDMARK, an accent bar and the line under it. */
function paintFace(canvas: HTMLCanvasElement, spec: BadgeSpec): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const { width: W, height: H } = canvas;
  const S = Math.min(W, H);
  const gold = spec.metal === 'gold';
  const structure = gold ? AMBER : CYAN;
  const accent = gold ? CYAN : AMBER;
  const kind = spec.kind;
  g.clearRect(0, 0, W, H);

  // Panel: a faint cool wash, brighter toward the top-left where the light sheen enters.
  const panel = g.createLinearGradient(0, 0, W, H);
  panel.addColorStop(0, gold ? 'rgba(245, 158, 11, 0.09)' : 'rgba(34, 211, 238, 0.17)');
  panel.addColorStop(0.55, gold ? 'rgba(245, 158, 11, 0.02)' : 'rgba(34, 211, 238, 0.03)');
  panel.addColorStop(1, 'rgba(34, 211, 238, 0.08)');
  g.fillStyle = panel;
  g.fillRect(0, 0, W, H);

  // Hairline frame and corner brackets.
  const m = S * 0.05;
  g.strokeStyle = structure;
  g.globalAlpha = 0.55;
  g.lineWidth = Math.max(1.5, S * 0.004);
  g.strokeRect(m, m, W - m * 2, H - m * 2);
  g.globalAlpha = 1;
  g.strokeStyle = accent;
  brackets(g, W, H, m, S * 0.085, Math.max(3, S * 0.011));

  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  const x0 = W * (kind === 'paper' ? 0.1 : 0.09);

  // Label above the wordmark.
  const labelY = H * (kind === 'cert' ? 0.2 : kind === 'paper' ? 0.15 : 0.2);
  const labelMax = W * (kind === 'paper' ? 0.45 : kind === 'cert' ? 0.5 : 0.56);
  const labelSize = fit(g, spec.top, 600, MONO, S * (kind === 'cert' ? 0.07 : 0.062), 0.2, labelMax);
  g.font = `600 ${labelSize}px ${MONO}`;
  g.fillStyle = gold ? '#fde68a' : '#a5f3fc';
  tracked(g, spec.top, x0, labelY, labelSize * 0.2);

  // The wordmark: large, white-hot, with a coloured bloom behind it. One or two lines.
  const lines = spec.word.split(' ');
  const two = kind === 'paper' && lines.length > 1;
  const maxW = W * (kind === 'cert' ? 0.82 : kind === 'paper' ? 0.8 : 0.575);
  const cap = H * (kind === 'cert' ? 0.27 : kind === 'paper' ? 0.14 : kind === 'stone' ? 0.3 : 0.34);
  const longest = lines.reduce((a, b) => (b.length > a.length ? b : a), '');
  const size = fit(g, two ? longest : spec.word, 700, SANS, cap, 0.025, maxW);
  g.font = `700 ${size}px ${SANS}`;
  const baseY = kind === 'paper' ? H * 0.34 : H * (kind === 'cert' ? 0.62 : 0.66);
  const lineH = size * 1.04;
  const rows = two ? lines : [spec.word];
  const ys = rows.map((_, i) => baseY + i * lineH);
  const paint = () => {
    rows.forEach((row, i) => tracked(g, row, x0, ys[i], size * 0.025));
  };
  g.fillStyle = structure;
  g.shadowColor = structure;
  g.shadowBlur = size * 0.5;
  paint();
  g.shadowBlur = size * 0.16;
  paint();
  g.shadowBlur = 0;
  const grad = g.createLinearGradient(0, ys[0] - size * 0.8, 0, ys[ys.length - 1]);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, gold ? '#ffeccb' : '#c9f8ff');
  g.fillStyle = grad;
  paint();

  // Accent bar and the line under the wordmark.
  const below = ys[ys.length - 1] + S * (kind === 'cert' ? 0.05 : 0.045);
  g.fillStyle = accent;
  g.shadowColor = accent;
  g.shadowBlur = S * 0.02;
  g.fillRect(x0, below, S * (kind === 'cert' ? 0.2 : 0.24), Math.max(3, S * 0.012));
  g.shadowBlur = 0;
  if (spec.sub) {
    const parts = kind === 'paper' ? wrap(spec.sub, 16) : [spec.sub];
    const subSize = fit(g, parts.reduce((a, b) => (b.length > a.length ? b : a), ''), 600, MONO, S * (kind === 'cert' ? 0.066 : 0.058), 0.16, W * (kind === 'cert' ? 0.82 : 0.7));
    g.font = `600 ${subSize}px ${MONO}`;
    g.fillStyle = gold ? '#fde68a' : '#cffafe';
    parts.forEach((part, i) => tracked(g, part, x0, below + S * 0.07 + subSize * 1.2 * (i + 1) - subSize * 0.2, subSize * 0.16));
  }

  if (kind === 'paper') {
    // Ruled lines, standing in for the text of the paper.
    [0.69, 0.75, 0.81, 0.87].forEach((y, i) => {
      g.fillStyle = i === 1 ? AMBER : 'rgba(103, 232, 249, 0.42)';
      g.globalAlpha = i === 1 ? 0.8 : 1;
      g.fillRect(x0, H * y, (W * 0.8) * [0.92, 0.7, 0.86, 0.5][i], Math.max(3, S * 0.012));
    });
    g.globalAlpha = 1;
  }
}

function wrap(text: string, max: number): string[] {
  return text.split(' ').reduce<string[]>((lines, word) => {
    const last = lines[lines.length - 1];
    if (last !== undefined && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
    return lines;
  }, []);
}

/** The face texture for a slab: its longer side is `tex` px, the other follows the slab's proportions. */
export function createFaceTexture(spec: BadgeSpec, tex: number): CanvasTexture {
  const { w, h } = DIM[spec.kind];
  const long = Math.round(spec.kind === 'cert' ? tex * 0.8 : tex);
  const canvas = w >= h ? makeCanvas(long, Math.round((long * h) / w)) : makeCanvas(Math.round((long * w) / h), long);
  const texture = toTexture(canvas);
  withFonts(texture, () => paintFace(canvas, spec));
  return texture;
}

/** Where (in slab-local units, y up) the emblem floats and how large its ring is: shared by the texture and the mesh. */
export function emblemPlacement(spec: BadgeSpec): { x: number; y: number; r: number } {
  const { w, h } = DIM[spec.kind];
  const e = EMBLEM[spec.kind];
  return { x: (e.x - 0.5) * w, y: (0.5 - e.y) * h, r: e.r * h };
}

/** A soft round falloff for the halos, the floor glow and the drifting particles. */
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
