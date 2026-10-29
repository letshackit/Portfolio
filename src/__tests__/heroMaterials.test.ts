import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { LOOK } from '../hero/v2/stage/lookPreset';
import { AVATAR_ENV, EYE_UV, addHairFringe, roleOf, tuneMaterials } from '../hero/v2/stage/materials';

function tex(): THREE.Texture {
  return new THREE.Texture();
}

function part(name: string): { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial } {
  const mat = new THREE.MeshStandardMaterial({ name, metalness: 1, roughness: 1, map: tex(), normalMap: tex(), metalnessMap: tex(), roughnessMap: tex() });
  mat.normalScale.set(0.4, 0.4);
  mat.map!.colorSpace = THREE.LinearSRGBColorSpace;
  mat.normalMap!.colorSpace = THREE.SRGBColorSpace;
  return { mesh: new THREE.Mesh(new THREE.BufferGeometry(), mat), mat };
}

describe('avatar material audit', () => {
  const skin = part('avaturn_body_material');
  const hair = part('avaturn_hair_0_material');
  const suit = part('avaturn_look_0_material');
  const shoes = part('avaturn_shoes_0_material');
  hair.mat.transparent = true;
  hair.mat.depthWrite = false;
  const root = new THREE.Group();
  root.add(skin.mesh, hair.mesh, suit.mesh, shoes.mesh);
  const report = tuneMaterials(root, 4);
  // Skin and suit are replaced by physical materials: read the tuned ones off the meshes.
  const live = (p: { mesh: THREE.Mesh }) => p.mesh.material as THREE.MeshStandardMaterial;

  it('names the parts of the export', () => {
    expect(roleOf('avaturn_body_material')).toBe('skin');
    expect(roleOf('avaturn_hair_0_material')).toBe('hair');
    expect(roleOf('avaturn_look_0_material')).toBe('suit');
    expect(roleOf('avaturn_shoes_0_material')).toBe('shoes');
    expect(report.map((r) => r.role).sort()).toEqual(['hair', 'shoes', 'skin', 'suit']);
  });

  it('puts colour maps in sRGB and data maps in linear, normals at full strength', () => {
    for (const mat of [skin, hair, suit, shoes].map(live)) {
      expect(mat.map!.colorSpace).toBe(THREE.SRGBColorSpace);
      expect(mat.normalMap!.colorSpace).toBe(THREE.NoColorSpace);
      expect(mat.metalness).toBe(0);
      expect(mat.metalnessMap).toBeNull();
      expect(mat.envMapIntensity).toBe(AVATAR_ENV);
      expect(mat.map!.anisotropy).toBe(4);
    }
  });

  it('keeps skin dielectric with its roughness map, and gives cloth fixed roughness from the look', () => {
    expect(live(skin).roughnessMap).not.toBeNull();
    expect(live(skin).roughness).toBe(LOOK.materials.skin.roughness);
    expect(live(suit).roughness).toBe(LOOK.materials.suit.roughness);
    expect(live(suit).roughnessMap).toBeNull();
    expect(live(shoes).roughness).toBe(LOOK.materials.shoes.roughness);
  });

  it('upgrades skin and suit to physical materials, with a sheen on the suit and a softened skin normal', () => {
    expect(live(skin)).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect(live(suit)).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect((live(suit) as THREE.MeshPhysicalMaterial).sheen).toBe(LOOK.materials.suit.sheen);
    expect(live(skin).normalScale.x).toBe(LOOK.materials.skin.normalScale);
    expect(live(shoes).normalScale.x).toBe(1);
  });

  it('adds one soft hair fringe over the alpha-tested core, and only once', () => {
    const added = addHairFringe(root);
    expect(added).toHaveLength(1);
    const fringe = added[0].material as THREE.MeshStandardMaterial;
    expect(fringe.transparent).toBe(true);
    expect(fringe.depthWrite).toBe(false);
    expect(fringe.alphaToCoverage).toBe(false);
    expect(addHairFringe(root)).toHaveLength(0);
    root.remove(added[0]);
  });

  it('draws hair alpha-tested in the opaque pass: no sorting, depth written, edge smoothed by MSAA', () => {
    expect(live(hair).alphaTest).toBe(0.5);
    expect(live(hair).transparent).toBe(false);
    expect(live(hair).depthWrite).toBe(true);
    expect(live(hair).alphaToCoverage).toBe(true);
    expect(live(hair).roughness).toBe(0.65);
  });

  it('shades skin as a dielectric with a warm sheen, softer specular and a coat that the shader masks to the eyes', () => {
    const m = live(skin) as THREE.MeshPhysicalMaterial;
    expect(m.ior).toBe(LOOK.materials.skin.ior);
    expect(m.sheen).toBe(LOOK.materials.skin.sheen);
    expect(m.clearcoat).toBe(LOOK.materials.skin.clearcoat);
    expect(m.clearcoatRoughness).toBeLessThan(0.1);
    // Mean exported roughness is about 0.62: the multiplier lands the lit skin near 0.5.
    expect(m.roughness * 0.62).toBeGreaterThan(0.45);
    expect(m.roughness * 0.62).toBeLessThan(0.58);
  });

  it('injects the subsurface wrap, the eye mask and the grazing scatter into the skin shader only', () => {
    const m = live(skin);
    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: '',
      fragmentShader: [
        '#include <common>',
        '#include <lights_physical_pars_fragment>',
        'mapN.xy *= normalScale;',
        '#include <lights_physical_fragment>',
        '#include <opaque_fragment>',
      ].join('\n'),
    };
    m.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, null as never);
    expect(shader.fragmentShader).toContain('wrapNL');
    expect(shader.fragmentShader).toContain('float eyeMask( vec2 uv )');
    expect(shader.fragmentShader).toContain('grazing');
    expect(shader.fragmentShader).not.toContain('EYEDEBUG');
    expect(shader.uniforms.detailNormalMap).toBeDefined();
    expect(live(suit).onBeforeCompile.toString()).not.toContain('wrapNL');
  });

  it('places both eye ellipses inside the atlas', () => {
    expect(EYE_UV).toHaveLength(2);
    for (const e of EYE_UV) {
      expect(e.c[0] - e.r[0]).toBeGreaterThan(0);
      expect(e.c[1] + e.r[1]).toBeLessThan(1);
    }
  });
});
