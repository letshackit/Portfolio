import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AVATAR_ENV, roleOf, tuneMaterials } from '../hero/v2/stage/materials';

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

  it('names the parts of the export', () => {
    expect(roleOf('avaturn_body_material')).toBe('skin');
    expect(roleOf('avaturn_hair_0_material')).toBe('hair');
    expect(roleOf('avaturn_look_0_material')).toBe('suit');
    expect(roleOf('avaturn_shoes_0_material')).toBe('shoes');
    expect(report.map((r) => r.role).sort()).toEqual(['hair', 'shoes', 'skin', 'suit']);
  });

  it('puts colour maps in sRGB and data maps in linear, normals at full strength', () => {
    for (const { mat } of [skin, hair, suit, shoes]) {
      expect(mat.map!.colorSpace).toBe(THREE.SRGBColorSpace);
      expect(mat.normalMap!.colorSpace).toBe(THREE.NoColorSpace);
      expect(mat.normalScale.x).toBe(1);
      expect(mat.normalScale.y).toBe(1);
      expect(mat.metalness).toBe(0);
      expect(mat.metalnessMap).toBeNull();
      expect(mat.envMapIntensity).toBe(AVATAR_ENV);
      expect(mat.map!.anisotropy).toBe(4);
    }
  });

  it('keeps skin dielectric with its roughness map, and gives cloth fixed roughness', () => {
    expect(skin.mat.roughnessMap).not.toBeNull();
    expect(skin.mat.roughness).toBeGreaterThan(0.8);
    expect(suit.mat.roughness).toBe(0.75);
    expect(suit.mat.roughnessMap).toBeNull();
    expect(shoes.mat.roughness).toBe(0.6);
  });

  it('draws hair alpha-tested in the opaque pass: no sorting, depth written, edge smoothed by MSAA', () => {
    expect(hair.mat.alphaTest).toBe(0.5);
    expect(hair.mat.transparent).toBe(false);
    expect(hair.mat.depthWrite).toBe(true);
    expect(hair.mat.alphaToCoverage).toBe(true);
    expect(hair.mat.roughness).toBe(0.65);
  });
});
