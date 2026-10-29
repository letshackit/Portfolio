// Builds the hero's holographic portrait assets from the owner's real photo.
//   node scripts/build-holo-portrait.mjs <photo.jpeg> <cutout.png> <out-dir>
// <cutout.png> is the same photo with its background removed (macOS Vision foreground mask; only its alpha is used, the
// colour comes from the photo). Writes <out-dir>/holo-color.webp (RGBA) and <out-dir>/holo-depth.webp (lossless RGB: R,G = surface normal x,y baked from the depth, B = depth, near = 1).
//
// What is real and what is faked: the colour and the silhouette are the photograph. The DEPTH MAP IS HAND-AUTHORED, not
// estimated (no monocular-depth model was available): a head ellipsoid, a shoulder dome, a neck column, and gaussians
// at the face landmarks (nose, brow, eyes, lips) that Vision's landmark detector found on this very photo,  It only has to hold up for a few degrees of tilt.
import sharp from 'sharp';

const [photoPath, cutPath, outDir] = process.argv.slice(2);
if (!photoPath || !cutPath || !outDir) {
  console.error('usage: node scripts/build-holo-portrait.mjs <photo> <cutout.png> <out-dir>');
  process.exit(1);
}

// Crop: drop the empty top of the frame, keep the full width.
const CROP_TOP = 120;

const photo = await sharp(photoPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const cut = await sharp(cutPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = photo.info.width;
const H = photo.info.height;
if (cut.info.width !== W || cut.info.height !== H) throw new Error('photo and cutout differ in size');
const N = W * H;

/** Separable gaussian blur on a float plane. */
function blur(src, sigma) {
  if (sigma <= 0) return src.slice();
  const r = Math.ceil(sigma * 3);
  const k = new Float32Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) sum += k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const tmp = new Float32Array(N);
  const out = new Float32Array(N);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) a += src[y * W + Math.min(W - 1, Math.max(0, x + i))] * k[i + r];
      tmp[y * W + x] = a;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) a += tmp[Math.min(H - 1, Math.max(0, y + i)) * W + x] * k[i + r];
      out[y * W + x] = a;
    }
  }
  return out;
}

const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---- planes -------------------------------------------------------------------------------------------------------
const rgb = [0, 1, 2].map((c) => {
  const p = new Float32Array(N);
  for (let i = 0; i < N; i++) p[i] = photo.data[i * 3 + c] / 255;
  return p;
});
const alpha0 = new Float32Array(N);
for (let i = 0; i < N; i++) alpha0[i] = cut.data[i * 4 + 3] / 255;

// ---- alpha: pull the edge in by about a pixel, then soften ---------------------------------------------------------
const aBlur = blur(alpha0, 1.8);
const alpha = new Float32Array(N);
for (let i = 0; i < N; i++) alpha[i] = smooth(0.7, 0.985, aBlur[i]);

// ---- colour decontamination: the photo's pale-blue backdrop bleeds into every edge pixel -----------------------------
// Inner colour by normalised convolution over the safely-inside pixels, pasted over the whole edge band.
const core = new Float32Array(N);
const coreBlur = blur(alpha0, 4);
for (let i = 0; i < N; i++) core[i] = smooth(0.96, 1, coreBlur[i]) * (alpha0[i] > 0.99 ? 1 : 0);
const coreW = blur(core, 7);
const inner = rgb.map((p) => {
  const m = new Float32Array(N);
  for (let i = 0; i < N; i++) m[i] = p[i] * core[i];
  const b = blur(m, 7);
  for (let i = 0; i < N; i++) b[i] = coreW[i] > 1e-4 ? b[i] / coreW[i] : p[i];
  return b;
});
const edge = new Float32Array(N);
for (let i = 0; i < N; i++) edge[i] = 1 - smooth(0.82, 0.995, coreBlur[i]);
for (let c = 0; c < 3; c++) {
  for (let i = 0; i < N; i++) rgb[c][i] = rgb[c][i] * (1 - edge[i]) + inner[c][i] * edge[i];
}

// ---- hand-authored depth ----------------------------------------------------------------------------------------------
// Anchors in source pixels (Vision landmarks on this photo): nose tip, eyes, lips, brows.
const A = {
  head: { cx: 612, cy: 545, rx: 200, ry: 305 },
  nose: { x: 587, y: 638 },
  eyeL: { x: 523, y: 541 },
  eyeR: { x: 671, y: 540 },
  lips: { x: 590, y: 690 },
  browL: { x: 508, y: 506 },
  browR: { x: 684, y: 504 },
  chin: { x: 560, y: 815 },
  shoulders: { cx: 560, cy: 1560, rx: 820, ry: 700 },
};
const gauss = (x, y, g, sx, sy = sx) => Math.exp(-(((x - g.x) ** 2) / (2 * sx * sx) + ((y - g.y) ** 2) / (2 * sy * sy)));

const depth = new Float32Array(N);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const h = A.head;
    const rh2 = ((x - h.cx) / h.rx) ** 2 + ((y - h.cy) / h.ry) ** 2;
    const headDome = Math.max(0, 1 - rh2); // parabolic, so the silhouette's slope stays finite
    const s = A.shoulders;
    const rs2 = ((x - s.cx) / s.rx) ** 2 + ((y - s.cy) / s.ry) ** 2;
    const shoulderDome = Math.max(0, 1 - rs2);
    // Neck: a column from under the chin into the collar.
    const neck = Math.exp(-(((x - 585) / 120) ** 2)) * smooth(780, 860, y) * (1 - smooth(900, 1000, y));
    let d = 0.18 + 0.2 * shoulderDome + 0.1 * neck + 0.46 * headDome;
    // Face relief, faded in over the face only.
    d += 0.1 * gauss(x, y, A.nose, 26, 46);
    d += 0.035 * gauss(x, y, A.lips, 55, 22);
    d += 0.03 * gauss(x, y, A.chin, 44, 30);
    d += 0.025 * gauss(x, y, A.browL, 52, 14);
    d += 0.025 * gauss(x, y, A.browR, 52, 14);
    d -= 0.03 * gauss(x, y, A.eyeL, 26, 14);
    d -= 0.03 * gauss(x, y, A.eyeR, 26, 14);
    // Cheeks stand out a touch, temples fall away.
    d += 0.025 * gauss(x, y, { x: 480, y: 650 }, 38, 48);
    d += 0.025 * gauss(x, y, { x: 700, y: 650 }, 38, 48);
    // Ears sit behind the cheek line.
    d -= 0.06 * (gauss(x, y, { x: 428, y: 610 }, 18, 40) + gauss(x, y, { x: 793, y: 610 }, 18, 40));
    depth[i2(x, y)] = d;
  }
}
function i2(x, y) {
  return y * W + x;
}
const depthSoft = blur(depth, 7);
let lo = Infinity;
let hi = -Infinity;
for (let i = 0; i < N; i++) {
  if (alpha[i] > 0.5) {
    lo = Math.min(lo, depthSoft[i]);
    hi = Math.max(hi, depthSoft[i]);
  }
}
for (let i = 0; i < N; i++) depthSoft[i] = Math.min(1, Math.max(0, (depthSoft[i] - lo) / (hi - lo)));

// ---- pack ------------------------------------------------------------------------------------------------------------
const outW = W;
const outH = H - CROP_TOP;
const colorOut = Buffer.alloc(outW * outH * 4);
const depthOut = Buffer.alloc(outW * outH * 3);
// Normals are baked here from the float depth, because an 8-bit depth map differentiated in the shader bands into visible
// contour hatching. The 16 matches the shader's old finite-difference gain.
const NORMAL_GAIN = 16;
const dAt = (x, y) => depthSoft[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
for (let y = 0; y < outH; y++) {
  for (let x = 0; x < outW; x++) {
    const i = (y + CROP_TOP) * W + x;
    const o = y * outW + x;
    for (let c = 0; c < 3; c++) colorOut[o * 4 + c] = Math.round(Math.min(1, Math.max(0, rgb[c][i])) * 255);
    colorOut[o * 4 + 3] = Math.round(alpha[i] * 255);
    const sx = y + CROP_TOP;
    const nx = -(dAt(x + 3, sx) - dAt(x - 3, sx)) * NORMAL_GAIN;
    const ny = (dAt(x, sx + 3) - dAt(x, sx - 3)) * NORMAL_GAIN;
    const inv = 1 / Math.hypot(nx, ny, 1);
    depthOut[o * 3] = Math.round((nx * inv * 0.5 + 0.5) * 255);
    depthOut[o * 3 + 1] = Math.round((ny * inv * 0.5 + 0.5) * 255);
    depthOut[o * 3 + 2] = Math.round(depthSoft[i] * 255);
  }
}
await sharp(colorOut, { raw: { width: outW, height: outH, channels: 4 } })
  .sharpen({ sigma: 0.8, m1: 0.6, m2: 1.2 })
  .webp({ quality: 90, alphaQuality: 95, effort: 6 })
  .toFile(`${outDir}/holo-color.webp`);
await sharp(depthOut, { raw: { width: outW, height: outH, channels: 3 } })
  .webp({ lossless: true, effort: 6 })
  .toFile(`${outDir}/holo-depth.webp`);
console.log(`holo-color.webp, holo-depth.webp  ${outW}x${outH}  (depth range ${lo.toFixed(3)}..${hi.toFixed(3)} before normalising)`);
