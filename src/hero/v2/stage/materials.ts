import * as THREE from 'three';
import { LOOK } from './lookPreset';

/** Strength of the studio HDR on the avatar's materials (per material; the rest of the scene has its own). */
export const AVATAR_ENV = LOOK.environment.avatar;

type Role = 'skin' | 'hair' | 'suit' | 'shoes' | 'other';

/** Which part of the Avaturn export a material is, by name. */
export function roleOf(name: string): Role {
  const n = name.toLowerCase();
  if (n.includes('body')) return 'skin';
  if (n.includes('hair')) return 'hair';
  if (n.includes('shoe')) return 'shoes';
  if (n.includes('look') || n.includes('cloth') || n.includes('suit')) return 'suit';
  return 'other';
}

const SRGB_SLOTS = ['map', 'emissiveMap'] as const;
const LINEAR_SLOTS = ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'bumpMap'] as const;

/** Colour data is sRGB, everything else linear: a wrong space here is the commonest cause of washed-out or grey skin. */
function fixColourSpaces(m: THREE.MeshStandardMaterial, anisotropy: number): void {
  for (const slot of SRGB_SLOTS) {
    const t = m[slot];
    if (t) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = anisotropy;
    }
  }
  for (const slot of LINEAR_SLOTS) {
    const t = m[slot];
    if (t) {
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = anisotropy;
    }
  }
}

/** Per-mesh result, for the tests and for a one-line console audit. */
export interface MaterialReport {
  readonly name: string;
  readonly role: Role;
  readonly type: string;
}

/** A material of the same name and settings, as the physically based type (clearcoat, sheen). */
function upgrade(m: THREE.MeshStandardMaterial): THREE.MeshPhysicalMaterial {
  const p = new THREE.MeshPhysicalMaterial();
  // Standard's copy only reads standard fields, so it is safe on a physical target.
  THREE.MeshStandardMaterial.prototype.copy.call(p, m);
  p.name = m.name;
  return p;
}

/** Tileable fine relief for skin pores: 3 octaves of value noise, turned into a tangent-space normal map. Built in JS, no canvas. */
export function makeDetailNormal(size = 128): THREE.DataTexture {
  const hash = (x: number, y: number, o: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7 + o * 74.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const noise = (x: number, y: number, cells: number, o: number) => {
    const fx = (x / size) * cells;
    const fy = (y / size) * cells;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = smooth(fx - x0);
    const ty = smooth(fy - y0);
    const h = (i: number, j: number) => hash(((x0 + i) % cells + cells) % cells, ((y0 + j) % cells + cells) % cells, o);
    const a = h(0, 0) + (h(1, 0) - h(0, 0)) * tx;
    const b = h(0, 1) + (h(1, 1) - h(0, 1)) * tx;
    return a + (b - a) * ty;
  };
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      height[y * size + x] = noise(x, y, 16, 1) * 0.5 + noise(x, y, 32, 2) * 0.3 + noise(x, y, 64, 3) * 0.2;
    }
  }
  const data = new Uint8Array(size * size * 4);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 3;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 3;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      data[i] = Math.round((-dx / len * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round((-dy / len * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round((1 / len * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Skin pores: a second, tiled normal layer on top of the (soft, 1024) atlas normal. Strength is deliberately small. */
const DETAIL_TILE = 26;

function addSkinDetail(m: THREE.MeshPhysicalMaterial, detail: THREE.Texture): void {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.detailNormalMap = { value: detail };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D detailNormalMap;')
      .replace(
        'mapN.xy *= normalScale;',
        `mapN.xy *= normalScale;
	vec3 detailN = texture2D( detailNormalMap, vNormalMapUv * ${DETAIL_TILE.toFixed(1)} ).xyz * 2.0 - 1.0;
	mapN = normalize( vec3( mapN.xy + detailN.xy * ${LOOK.materials.skin.detail.toFixed(2)}, mapN.z ) );`,
      );
  };
  m.customProgramCacheKey = () => 'avatar-skin-detail';
}

/**
 * Audits and tunes every material on a loaded avatar (in place; skin and cloth become physical materials, so a mesh's
 * material is replaced). The export ships every material at metalness 1 and roughness 1 (the real values live in a
 * packed map); the numbers here are what makes skin read as skin, hair as hair and cloth as cloth under the studio lights.
 *
 * - skin: dielectric, roughness 0.7 times the map, a faint clearcoat for a healthy sheen, atlas normal at 1.0 plus pore detail.
 * - hair: the opaque core is alpha-tested (with alpha-to-coverage, so the edge is smoothed by the MSAA); `addHairFringe`
 *   draws the soft edge on top.
 * - suit 0.6 with a sheen that lifts the silhouette, shoes 0.6, both without the packed map (its darkest texels are
 *   mirror-like speckles).
 * - the eyes are part of the skin mesh; their catchlights are separate sprites (see Avatar).
 */
export function tuneMaterials(root: THREE.Object3D, maxAnisotropy = 8): MaterialReport[] {
  const tuned = new Map<THREE.Material, THREE.Material>();
  const report: MaterialReport[] = [];
  let detail: THREE.DataTexture | null = null;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const swap = (raw: THREE.Material): THREE.Material => {
      const done = tuned.get(raw);
      if (done) return done;
      const std = raw as THREE.MeshStandardMaterial;
      if (!std.isMeshStandardMaterial) return raw;
      const role = roleOf(std.name);
      fixColourSpaces(std, maxAnisotropy);
      std.metalness = 0;
      std.metalnessMap = null;
      if (std.normalMap) std.normalScale.set(1, 1);
      std.envMapIntensity = AVATAR_ENV;
      let m: THREE.MeshStandardMaterial = std;
      switch (role) {
        case 'skin': {
          const p = upgrade(std);
          p.roughness = LOOK.materials.skin.roughness;
          p.side = THREE.FrontSide;
          p.clearcoat = LOOK.materials.skin.clearcoat;
          p.clearcoatRoughness = LOOK.materials.skin.clearcoatRoughness;
          if (p.normalMap) {
            p.normalScale.setScalar(LOOK.materials.skin.normalScale);
            detail ??= makeDetailNormal();
            addSkinDetail(p, detail);
          }
          m = p;
          break;
        }
        case 'hair':
          m.roughness = 0.65;
          m.roughnessMap = null;
          m.alphaTest = 0.5;
          m.transparent = false;
          m.depthWrite = true;
          m.alphaToCoverage = true;
          m.side = THREE.DoubleSide;
          break;
        case 'suit': {
          const p = upgrade(std);
          p.roughness = LOOK.materials.suit.roughness;
          p.roughnessMap = null;
          p.side = THREE.FrontSide;
          p.sheen = LOOK.materials.suit.sheen;
          p.sheenRoughness = LOOK.materials.suit.sheenRoughness;
          p.sheenColor.set(LOOK.materials.suit.sheenColor);
          m = p;
          break;
        }
        case 'shoes':
          m.roughness = LOOK.materials.shoes.roughness;
          m.roughnessMap = null;
          m.side = THREE.FrontSide;
          break;
        default:
          break;
      }
      // Per-material share of the avatar's environment strength (the suit takes a little more, for its sheen).
      m.userData.envScale = role === 'suit' ? LOOK.materials.suit.envBoost : 1;
      m.needsUpdate = true;
      if (m !== std) std.dispose();
      tuned.set(raw, m);
      report.push({ name: m.name, role, type: m.type });
      return m;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
  });
  return report;
}

/**
 * The soft edge of the hair. The alpha-tested core leaves a hard, stair-stepped contour where the cap meets the scalp, so
 * the same skinned geometry is drawn again with its alpha blended, depth-tested but not depth-written, and only where
 * the core did not already draw (strict depth compare). The texels the core rejects fade in over the (hair-tinted) scalp.
 * Returns the added meshes (none if already there).
 */
export function addHairFringe(root: THREE.Object3D): THREE.Mesh[] {
  const added: THREE.Mesh[] = [];
  const hair: THREE.Mesh[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material) || roleOf(mesh.material.name) !== 'hair') return;
    // Idempotent: a mesh that already has its fringe (or is one) is skipped.
    if (mesh.name.endsWith('_fringe') || mesh.parent?.getObjectByName(`${mesh.name}_fringe`)) return;
    hair.push(mesh);
  });
  for (const mesh of hair) {
    const core = mesh.material as THREE.MeshStandardMaterial;
    const mat = core.clone();
    mat.alphaTest = 0.02;
    mat.alphaToCoverage = false;
    mat.transparent = true;
    mat.depthWrite = false;
    mat.depthFunc = THREE.LessDepth;
    const skinned = mesh as THREE.SkinnedMesh;
    let fringe: THREE.Mesh;
    if (skinned.isSkinnedMesh) {
      const sk = new THREE.SkinnedMesh(mesh.geometry, mat);
      sk.bind(skinned.skeleton, skinned.bindMatrix);
      fringe = sk;
    } else {
      fringe = new THREE.Mesh(mesh.geometry, mat);
    }
    fringe.name = `${mesh.name}_fringe`;
    fringe.renderOrder = 2;
    fringe.castShadow = false;
    fringe.receiveShadow = true;
    fringe.frustumCulled = false;
    mesh.parent?.add(fringe);
    added.push(fringe);
  }
  return added;
}

/**
 * Smooth vertex normals where a mesh has none or has visibly faceted ones (a flat-shaded export triples every vertex).
 * Welds nothing: the Avaturn meshes are already welded in the asset, so this only fills in a missing normal attribute.
 */
export function ensureSmoothNormals(root: THREE.Object3D): number {
  let fixed = 0;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const g = mesh.geometry;
    if (!g.getAttribute('normal')) {
      g.computeVertexNormals();
      fixed += 1;
    }
  });
  return fixed;
}
