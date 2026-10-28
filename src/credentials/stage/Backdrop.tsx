import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial, type Mesh, type Points } from 'three';
import type { VaultStore } from '../vaultStore';
import { hdr, type Kit } from './kit';
import type { Quality } from './quality';

/** How far behind the badge plane the grid sits, in px. The glass refracts it, which is what makes the glass read as glass. */
export const BACKDROP_Z = -420;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform vec2 uSize;
uniform vec3 uBase;
uniform vec2 uHero;
uniform float uTime;
varying vec2 vUv;

float grid(vec2 p, float cell, float w) {
  vec2 q = p / cell;
  vec2 g = abs(fract(q - 0.5) - 0.5) / max(fwidth(q), vec2(1e-4));
  return 1.0 - min(min(g.x, g.y) / w, 1.0);
}

void main() {
  vec2 p = vUv * uSize;
  vec3 col = uBase;
  float minor = grid(p, 40.0, 1.0);
  float major = grid(p, 200.0, 1.4);
  vec3 cyan = vec3(0.016, 0.62, 0.82);
  // Lines fade toward the edges of the vault so it dissolves into the page.
  vec2 e = abs(vUv - 0.5) * 2.0;
  float edge = 1.0 - smoothstep(0.55, 1.0, max(e.x * 0.9, e.y));
  col += cyan * (minor * 0.03 + major * 0.075) * edge;
  // The cornerstone's pool of light, and a faint warm counter-light low on the right.
  float d = length((p - uHero) / vec2(520.0, 420.0));
  col += cyan * 0.045 * exp(-d * d * 1.6);
  float wd = length((p - vec2(uSize.x * 0.92, uSize.y * 0.18)) / vec2(420.0, 360.0));
  col += vec3(0.9, 0.35, 0.02) * 0.012 * exp(-wd * wd * 1.4);
  // A slow band of light travelling down the grid.
  float band = exp(-pow((fract(vUv.y * 0.6 - uTime * 0.025) - 0.5) * 7.0, 2.0));
  col += cyan * major * band * 0.05 * edge;
  gl_FragColor = vec4(col, 1.0);
}`;

/** The grid wall behind everything, with a pool of light behind the hero credential. Opaque, so it is refracted. */
export function GridWall({ store, still }: { store: VaultStore; still: boolean }) {
  const size = useThree((s) => s.size);
  const cam = useThree((s) => s.camera);
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uSize: { value: [1, 1] },
          uBase: { value: new Color('#07080a') },
          uHero: { value: [0, 0] },
          uTime: { value: 0 },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        depthWrite: true,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  const mesh = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const u = mat.uniforms;
    // The wall is further from the camera than the badge plane, so it is drawn larger to still cover the view.
    const camZ = Math.max(1, cam.position.z);
    const k = ((camZ - BACKDROP_Z) / camZ) * 1.08;
    mesh.current?.scale.set(size.width * k, size.height * k, 1);
    u.uSize.value = [size.width * k, size.height * k];
    const hero = store.rects.get('pgp');
    // The wall's pixel space is scaled and centred on the vault, so hero's slot is mapped into it.
    const ox = (size.width * k - size.width) / 2;
    const oy = (size.height * k - size.height) / 2;
    u.uHero.value = hero ? [hero.cx + ox, size.height - hero.cy + oy] : [size.width * 0.3 + ox, size.height * 0.75 + oy];
    u.uTime.value = still ? 0 : clock.elapsedTime;
  });
  return (
    <mesh ref={mesh} position={[size.width / 2, -size.height / 2, BACKDROP_Z]} material={mat}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

/** Slow cyan motes drifting up through the vault, in front of and behind the glass. */
export function Motes({ q, kit, still }: { q: Quality; kit: Kit; still: boolean }) {
  const size = useThree((s) => s.size);
  const ref = useRef<Points>(null);
  const count = Math.max(24, Math.round(((size.width * size.height) / 9000) * q.particles));
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      pos[i * 3] = Math.random() * size.width;
      pos[i * 3 + 1] = -Math.random() * size.height;
      pos[i * 3 + 2] = -300 + Math.random() * 520;
    }
    g.setAttribute('position', new BufferAttribute(pos, 3));
    return g;
  }, [count, size.width, size.height]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const speeds = useMemo(() => Float32Array.from({ length: count }, () => 5 + Math.random() * 16), [count]);
  useFrame((_, rawDt) => {
    if (still) return;
    const dt = Math.min(rawDt, 0.05);
    const attr = geometry.getAttribute('position') as BufferAttribute;
    const a = attr.array as Float32Array;
    for (let i = 0; i < count; i += 1) {
      let y = a[i * 3 + 1] + speeds[i] * dt;
      if (y > 20) y = -size.height - 20;
      a[i * 3 + 1] = y;
    }
    attr.needsUpdate = true;
  });
  const color = useMemo(() => hdr('#67e8f9', 1.6), []);
  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={kit.soft}
        color={color}
        size={5}
        sizeAttenuation={false}
        transparent
        opacity={0.8}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
