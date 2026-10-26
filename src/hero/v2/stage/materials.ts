import * as THREE from 'three';

/** Strength of the studio HDR on the avatar's materials (per material; the rest of the scene has its own). */
export const AVATAR_ENV = 0.8;

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

/**
 * Audits and tunes every material on a loaded avatar (in place). The export ships every material at metalness 1 and
 * roughness 1 (the real values live in a packed map); the numbers here are what makes skin read as skin, hair as hair
 * and cloth as cloth under the studio lights.
 *
 * - skin: dielectric, roughness from the map scaled to ~0.55 average, normal map intact at 1.0.
 * - hair: alpha-tested (with alpha-to-coverage, so the edge is smoothed by the MSAA), opaque pass, so no sorting.
 * - suit 0.75, shoes 0.6, both without the packed map (its darkest texels are mirror-like speckles).
 * - the eyes are part of the skin mesh, so the gloss on them comes from the map's low roughness there.
 */
export function tuneMaterials(root: THREE.Object3D, maxAnisotropy = 8): MaterialReport[] {
  const seen = new Set<THREE.Material>();
  const report: MaterialReport[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const raw of mats) {
      if (seen.has(raw)) continue;
      seen.add(raw);
      const m = raw as THREE.MeshStandardMaterial;
      if (!m.isMeshStandardMaterial) continue;
      const role = roleOf(m.name);
      fixColourSpaces(m, maxAnisotropy);
      m.metalness = 0;
      m.metalnessMap = null;
      if (m.normalMap) m.normalScale.set(1, 1);
      m.envMapIntensity = AVATAR_ENV;
      switch (role) {
        case 'skin':
          m.roughness = 0.9;
          m.side = THREE.FrontSide;
          break;
        case 'hair':
          m.roughness = 0.65;
          m.roughnessMap = null;
          m.alphaTest = 0.5;
          m.transparent = false;
          m.depthWrite = true;
          m.alphaToCoverage = true;
          m.side = THREE.DoubleSide;
          break;
        case 'suit':
          m.roughness = 0.75;
          m.roughnessMap = null;
          m.side = THREE.FrontSide;
          break;
        case 'shoes':
          m.roughness = 0.6;
          m.roughnessMap = null;
          m.side = THREE.FrontSide;
          break;
        default:
          break;
      }
      m.needsUpdate = true;
      report.push({ name: m.name, role, type: m.type });
    }
  });
  return report;
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
