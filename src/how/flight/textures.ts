/**
 * Every texture in the flight is drawn into a canvas with the page's own Geist Mono (no font fetch, no text library,
 * nothing a script-src 'self' policy could block). Textures are cached by name and disposed together when the stage unmounts.
 */
import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three';

const cache = new Map<string, CanvasTexture>();

const MONO = '"Geist Mono", ui-monospace, Menlo, Consolas, monospace';
const CYAN = '#22d3ee';
const CYAN_HI = '#67e8f9';
const AMBER = '#fbbf24';
const INK = '#eceef0';
const DIM = '#8a929c';

export function fontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return Promise.resolve();
  return Promise.all([document.fonts.load(`500 40px ${MONO}`), document.fonts.ready]).then(() => undefined);
}

function canvasTexture(name: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): CanvasTexture {
  const hit = cache.get(name);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  if (g) draw(g, w, h);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  cache.set(name, tex);
  return tex;
}

export function disposeTextures(): void {
  for (const tex of cache.values()) tex.dispose();
  cache.clear();
}

/** One shared soft round falloff for halos, packets and dust. */
export function softTexture(): CanvasTexture {
  return canvasTexture('soft', 64, 64, (g) => {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.7)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
  });
}

export interface TextSpec {
  readonly text: string;
  /** Texture width in world units; the height follows from `aspect`. */
  readonly color?: string;
  readonly weight?: number;
  readonly align?: CanvasTextAlign;
  /** Plate behind the text (rgba), with a hairline in `edge`. */
  readonly plate?: string;
  readonly edge?: string;
  /** Width over height of the texture (and so of the plane that carries it). Default 8. */
  readonly aspect?: number;
}

/** A one-line mono label. The canvas is `aspect`:1 (default 8:1), so a plane with the same ratio maps 1:1. */
export function labelTexture(spec: TextSpec): CanvasTexture {
  const { text, color = CYAN_HI, weight = 500, align = 'center', plate, edge, aspect = 8 } = spec;
  const key = `label|${text}|${color}|${weight}|${align}|${plate ?? ''}|${edge ?? ''}|${aspect}`;
  return canvasTexture(key, Math.round(64 * aspect), 64, (g, w, h) => {
    if (plate) {
      g.fillStyle = plate;
      g.fillRect(0, 0, w, h);
    }
    if (edge) {
      g.strokeStyle = edge;
      g.lineWidth = 2;
      g.strokeRect(1, 1, w - 2, h - 2);
    }
    let px = 36;
    g.font = `${weight} ${px}px ${MONO}`;
    const maxW = w * 0.92;
    while (g.measureText(text).width > maxW && px > 14) {
      px -= 2;
      g.font = `${weight} ${px}px ${MONO}`;
    }
    g.fillStyle = color;
    g.textBaseline = 'middle';
    g.textAlign = align;
    const x = align === 'center' ? w / 2 : align === 'left' ? w * 0.04 : w * 0.96;
    g.fillText(text, x, h / 2 + 1);
  });
}

/** A big numeral with a small caption beneath, for the floating metrics (aspect 2:1). */
export function metricTexture(figure: string, caption: string, color = CYAN_HI): CanvasTexture {
  return canvasTexture(`metric|${figure}|${caption}|${color}`, 512, 256, (g, w, h) => {
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    let px = 150;
    g.font = `600 ${px}px ${MONO}`;
    while (g.measureText(figure).width > w * 0.92 && px > 40) {
      px -= 6;
      g.font = `600 ${px}px ${MONO}`;
    }
    g.fillStyle = color;
    g.fillText(figure, w / 2, h * 0.62);
    let cp = 30;
    g.font = `500 ${cp}px ${MONO}`;
    while (g.measureText(caption).width > w * 0.94 && cp > 14) {
      cp -= 2;
      g.font = `500 ${cp}px ${MONO}`;
    }
    g.fillStyle = DIM;
    g.fillText(caption.toUpperCase(), w / 2, h * 0.9);
  });
}

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

export type ScreenKind = 'dash' | 'form' | 'approval' | 'list' | 'settings' | 'mobile';

const SCREEN_TITLES: Record<ScreenKind, string> = {
  dash: 'DASHBOARD',
  form: 'FORM',
  approval: 'APPROVAL FLOW',
  list: 'LIST VIEW',
  settings: 'SETTINGS',
  mobile: 'MOBILE',
};

/** Wireframe screens for the UX station: cyan hairlines on glass, one amber accent each. */
export function screenTexture(kind: ScreenKind): CanvasTexture {
  const mobile = kind === 'mobile';
  const w = mobile ? 256 : 512;
  const h = mobile ? 448 : 340;
  return canvasTexture(`screen|${kind}`, w, h, (g) => {
    g.lineWidth = 2.5;
    g.strokeStyle = CYAN;
    g.fillStyle = 'rgba(34,211,238,0.14)';
    const pad = 22;
    // title strip
    g.fillStyle = DIM;
    g.font = `500 ${mobile ? 20 : 22}px ${MONO}`;
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.fillText(SCREEN_TITLES[kind], pad, 26);
    g.strokeStyle = 'rgba(34,211,238,0.55)';
    g.beginPath();
    g.moveTo(pad, 48);
    g.lineTo(w - pad, 48);
    g.stroke();
    g.strokeStyle = CYAN;
    const bar = (x: number, y: number, bw: number, bh = 8, fill = 'rgba(103,232,249,0.5)') => {
      g.fillStyle = fill;
      rr(g, x, y, bw, bh, bh / 2);
      g.fill();
    };
    const box = (x: number, y: number, bw: number, bh: number, accent = false) => {
      g.strokeStyle = accent ? AMBER : CYAN;
      rr(g, x, y, bw, bh, 8);
      g.stroke();
    };
    if (kind === 'dash') {
      for (let i = 0; i < 3; i += 1) {
        box(pad + i * 156, 66, 140, 70, i === 1);
        bar(pad + i * 156 + 14, 82, 54);
        bar(pad + i * 156 + 14, 106, 90, 14, i === 1 ? AMBER : 'rgba(103,232,249,0.85)');
      }
      box(pad, 154, 300, 150);
      g.strokeStyle = CYAN_HI;
      g.beginPath();
      [0.7, 0.5, 0.62, 0.3, 0.42, 0.18, 0.28].forEach((v, i) => {
        const x = pad + 16 + i * 44;
        const y = 154 + 20 + v * 110;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      });
      g.stroke();
      for (let i = 0; i < 4; i += 1) bar(344, 170 + i * 34, 120 - (i % 2) * 36);
    } else if (kind === 'form') {
      bar(pad, 70, 170, 12);
      for (let i = 0; i < 4; i += 1) {
        bar(pad, 106 + i * 46, 80, 6);
        box(pad, 118 + i * 46, i % 2 ? 220 : 440, 26);
      }
      g.fillStyle = AMBER;
      rr(g, w - pad - 130, h - 56, 130, 34, 17);
      g.fill();
    } else if (kind === 'approval') {
      for (let i = 0; i < 3; i += 1) {
        const cx = 90 + i * 170;
        g.strokeStyle = i === 2 ? AMBER : CYAN;
        g.beginPath();
        g.arc(cx, 130, 28, 0, Math.PI * 2);
        g.stroke();
        if (i < 2) {
          g.strokeStyle = CYAN;
          g.beginPath();
          g.moveTo(cx + 34, 130);
          g.lineTo(cx + 136, 130);
          g.stroke();
          g.beginPath();
          g.moveTo(cx + 126, 122);
          g.lineTo(cx + 136, 130);
          g.lineTo(cx + 126, 138);
          g.stroke();
          g.beginPath();
          g.moveTo(cx - 10, 130);
          g.lineTo(cx - 2, 139);
          g.lineTo(cx + 12, 120);
          g.stroke();
        }
        bar(cx - 34, 182, 68);
        bar(cx - 24, 200, 48, 6);
      }
      box(pad, 236, 468, 70);
    } else if (kind === 'list') {
      for (let i = 0; i < 5; i += 1) {
        const y = 66 + i * 52;
        box(pad, y, 468, 40, i === 2);
        g.strokeStyle = CYAN;
        g.beginPath();
        g.arc(pad + 24, y + 20, 10, 0, Math.PI * 2);
        g.stroke();
        bar(pad + 50, y + 10, 150);
        bar(pad + 50, y + 24, 90, 6);
        bar(w - pad - 90, y + 16, 60, 8, i === 2 ? AMBER : 'rgba(103,232,249,0.5)');
      }
    } else if (kind === 'settings') {
      for (let i = 0; i < 4; i += 1) {
        const y = 72 + i * 60;
        bar(pad, y, 130, 8);
        bar(pad, y + 18, 200, 6, 'rgba(103,232,249,0.3)');
        box(w - pad - 80, y - 4, 80, 34);
        g.fillStyle = i % 2 ? CYAN_HI : AMBER;
        g.beginPath();
        g.arc(i % 2 ? w - pad - 20 : w - pad - 60, y + 13, 11, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      box(pad, 66, w - pad * 2, 86);
      bar(pad + 14, 82, 90);
      bar(pad + 14, 110, 140, 14, AMBER);
      for (let i = 0; i < 2; i += 1) {
        box(pad, 168 + i * 82, w - pad * 2, 70);
        bar(pad + 14, 184 + i * 82, 100);
        bar(pad + 14, 206 + i * 82, 130, 6, 'rgba(103,232,249,0.3)');
      }
      for (let i = 0; i < 4; i += 1) {
        g.strokeStyle = i === 0 ? AMBER : CYAN;
        g.beginPath();
        g.arc(46 + i * 55, h - 34, 9, 0, Math.PI * 2);
        g.stroke();
      }
    }
  });
}

/** The front sheet of a PRD stack. */
export function coverTexture(title: string, sub: string, pages: string): CanvasTexture {
  return canvasTexture(`cover|${title}|${sub}|${pages}`, 400, 560, (g, w, h) => {
    g.fillStyle = '#0b1a20';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(34,211,238,0.8)';
    g.lineWidth = 3;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = AMBER;
    g.font = `500 22px ${MONO}`;
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    g.fillText('PRD', 36, 62);
    g.fillStyle = INK;
    g.font = `600 52px ${MONO}`;
    g.fillText(title, 36, 142);
    g.fillStyle = DIM;
    g.font = `500 22px ${MONO}`;
    g.fillText(sub.toUpperCase(), 36, 180);
    for (let i = 0; i < 13; i += 1) {
      const lw = i % 4 === 3 ? 150 : 328 - ((i * 53) % 90);
      g.fillStyle = i === 5 ? 'rgba(251,191,36,0.75)' : 'rgba(103,232,249,0.28)';
      rr(g, 36, 220 + i * 20, lw, 7, 3.5);
      g.fill();
    }
    g.fillStyle = CYAN_HI;
    g.font = `600 30px ${MONO}`;
    g.fillText(pages, 36, h - 40);
  });
}

/** The prototype's window: title bar, traffic lights, the path in the address field. Tiles are separate meshes on top. */
export function windowTexture(title: string): CanvasTexture {
  return canvasTexture(`window|${title}`, 1024, 640, (g, w) => {
    g.fillStyle = 'rgba(8,16,20,0.9)';
    g.fillRect(0, 0, w, 64);
    g.strokeStyle = 'rgba(34,211,238,0.5)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, 64);
    g.lineTo(w, 64);
    g.stroke();
    ['#fbbf24', '#67e8f9', '#22d3ee'].forEach((c, i) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(40 + i * 34, 32, 9, 0, Math.PI * 2);
      g.fill();
    });
    g.fillStyle = DIM;
    g.font = `500 26px ${MONO}`;
    g.textBaseline = 'middle';
    g.fillText(title, 170, 33);
    g.strokeStyle = 'rgba(34,211,238,0.22)';
    for (let i = 0; i < 5; i += 1) {
      g.beginPath();
      g.moveTo(0, 150 + i * 100);
      g.lineTo(w, 150 + i * 100);
      g.stroke();
    }
  });
}

/** One module tile of the prototype: its number, its name, and a tiny line glyph. */
export function tileTexture(n: number, name: string): CanvasTexture {
  return canvasTexture(`tile|${n}|${name}`, 256, 256, (g, w, h) => {
    g.fillStyle = 'rgba(34,211,238,0.12)';
    rr(g, 6, 6, w - 12, h - 12, 28);
    g.fill();
    g.strokeStyle = 'rgba(103,232,249,0.9)';
    g.lineWidth = 5;
    rr(g, 6, 6, w - 12, h - 12, 28);
    g.stroke();
    g.fillStyle = AMBER;
    g.font = `600 44px ${MONO}`;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText(String(n).padStart(2, '0'), 30, 58);
    g.fillStyle = 'rgba(103,232,249,0.5)';
    for (let i = 0; i < 3; i += 1) {
      rr(g, 30, 104 + i * 20, 170 - i * 44, 8, 4);
      g.fill();
    }
    let px = 34;
    g.font = `600 ${px}px ${MONO}`;
    while (g.measureText(name).width > w - 52 && px > 16) {
      px -= 2;
      g.font = `600 ${px}px ${MONO}`;
    }
    g.fillStyle = INK;
    g.fillText(name, 30, h - 52);
  });
}

/** A Confluence-style spec page: heading bar and body lines. */
export function specTexture(): CanvasTexture {
  return canvasTexture('spec', 512, 320, (g, w, h) => {
    g.fillStyle = 'rgba(103,232,249,0.55)';
    rr(g, 32, 34, 190, 16, 8);
    g.fill();
    for (let i = 0; i < 9; i += 1) {
      g.fillStyle = i === 4 ? 'rgba(251,191,36,0.5)' : 'rgba(103,232,249,0.22)';
      rr(g, 32, 76 + i * 26, w - 64 - ((i * 71) % 150), 8, 4);
      g.fill();
    }
    g.fillStyle = DIM;
    g.font = `500 20px ${MONO}`;
    g.textAlign = 'right';
    g.fillText('CONFLUENCE', w - 28, h - 22);
  });
}

/** A check mark in a ring, for the QA gates. */
export function checkTexture(): CanvasTexture {
  return canvasTexture('check', 128, 128, (g, w, h) => {
    g.strokeStyle = '#ffffff';
    g.lineWidth = 12;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.arc(w / 2, h / 2, 50, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(40, 66);
    g.lineTo(58, 84);
    g.lineTo(90, 46);
    g.stroke();
  });
}

/** Dark label with a hairline: the small "station" tags. */
export function tagTexture(text: string, tone: 'cyan' | 'amber' = 'cyan', aspect = 8): CanvasTexture {
  return labelTexture({
    aspect,
    text,
    color: tone === 'amber' ? AMBER : CYAN_HI,
    plate: 'rgba(7,12,16,0.72)',
    edge: tone === 'amber' ? 'rgba(245,158,11,0.7)' : 'rgba(34,211,238,0.55)',
  });
}
