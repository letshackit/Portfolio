import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { smoothstep, store } from '../store';

/** Cyan rim from behind-right, amber key from front-left, with a "lights on" ramp that starts at a 40 % floor. */
export function Lights() {
  const rim = useRef<THREE.DirectionalLight>(null);
  const rim2 = useRef<THREE.DirectionalLight>(null);
  const key = useRef<THREE.PointLight>(null);
  const under = useRef<THREE.PointLight>(null);
  const amb = useRef<THREE.AmbientLight>(null);
  const scene = useThree((s) => s.scene);

  useFrame(() => {
    // 0.4 floor: he is readable the moment he mounts; the intro only brings the lights up to full.
    const k = 0.4 + 0.6 * smoothstep(0, 1, store.intro);
    if (rim.current) rim.current.intensity = 5.2 * k;
    if (rim2.current) rim2.current.intensity = 1.8 * k;
    if (key.current) key.current.intensity = 26 * k;
    if (under.current) under.current.intensity = 2.2 * k;
    if (amb.current) amb.current.intensity = 0.22 * k;
    scene.environmentIntensity = 0.55 * k;
  });

  return (
    <>
      <ambientLight ref={amb} color="#9fb4c8" intensity={0.09} />
      <directionalLight ref={rim} color="#22d3ee" position={[3.6, 3.2, -3.6]} intensity={2} />
      <directionalLight ref={rim2} color="#38bdf8" position={[-3.4, 2.4, -3]} intensity={0.7} />
      <pointLight ref={key} color="#f59e0b" position={[-2.3, 1.9, 2.7]} intensity={10} distance={14} decay={2} />
      <pointLight ref={under} color="#22d3ee" position={[0, 0.2, -1]} intensity={1} distance={5} decay={2} />
    </>
  );
}

/** A soft radial glow texture with its lower third faded, so a plane never shows a hard line where it meets the floor. */
function useGlowTexture(stops: ReadonlyArray<readonly [number, string]>): THREE.CanvasTexture {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    if (g) {
      const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      stops.forEach(([o, col]) => grd.addColorStop(o, col));
      g.fillStyle = grd;
      g.fillRect(0, 0, 256, 256);
      g.globalCompositeOperation = 'destination-in';
      const fade = g.createLinearGradient(0, 0, 0, 256);
      fade.addColorStop(0, 'rgba(0,0,0,1)');
      fade.addColorStop(0.62, 'rgba(0,0,0,1)');
      fade.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = fade;
      g.fillRect(0, 0, 256, 256);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
    // The stops are literals at each call site; the texture is built once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** Cyan halo behind the operator and a warm pool at the left; slides with the cursor for depth. */
export function Backdrop() {
  const halo = useGlowTexture([
    [0, 'rgba(34,211,238,0.30)'],
    [0.4, 'rgba(34,211,238,0.08)'],
    [1, 'rgba(34,211,238,0)'],
  ]);
  const warm = useGlowTexture([
    [0, 'rgba(245,158,11,0.2)'],
    [0.5, 'rgba(245,158,11,0.05)'],
    [1, 'rgba(245,158,11,0)'],
  ]);
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.x = store.reduced ? 0 : store.px * -0.25;
  });
  return (
    <group ref={ref}>
      <mesh position={[0.5, 1.1, -3.6]}>
        <planeGeometry args={[10, 6.4]} />
        <meshBasicMaterial map={halo} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} toneMapped={false} />
      </mesh>
      <mesh position={[-2.6, 1.4, -1.5]}>
        <planeGeometry args={[5, 4]} />
        <meshBasicMaterial map={warm} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Soft pool of cyan light under the city with a warm core: fakes volumetric spill. Lives in city-local units. */
export function GlowPool() {
  const tex = useGlowTexture([
    [0, 'rgba(255,190,90,0.40)'],
    [0.22, 'rgba(34,211,238,0.30)'],
    [0.6, 'rgba(34,211,238,0.08)'],
    [1, 'rgba(34,211,238,0)'],
  ]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} renderOrder={2}>
      <planeGeometry args={[26, 22]} />
      <meshBasicMaterial map={tex} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} opacity={0.6} />
    </mesh>
  );
}

interface FloorProps {
  reflect: number;
  shadowRes: number;
}

/** The stage: a dark mirror with the operator's three rings and a contact shadow. */
export function Floor({ reflect, shadowRes }: FloorProps) {
  const rings = useRef<THREE.Group>(null);
  useFrame(() => {
    if (rings.current) rings.current.rotation.z = store.time * 0.12;
  });
  const glow = useMemo(() => new THREE.Color('#22d3ee').multiplyScalar(2.2), []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[60, 60]} />
        {reflect > 0 ? (
          <MeshReflectorMaterial
            blur={[420, 140]}
            resolution={reflect}
            mixBlur={1}
            mixStrength={26}
            mirror={0.4}
            roughness={0.92}
            depthScale={1.1}
            minDepthThreshold={0.35}
            maxDepthThreshold={1.5}
            color="#0a0c0f"
            metalness={0.4}
          />
        ) : (
          <meshStandardMaterial color="#0a0c0f" roughness={0.6} metalness={0.4} />
        )}
      </mesh>
      <group ref={rings} rotation-x={-Math.PI / 2} position={[0, 0.006, 0]}>
        <mesh>
          <ringGeometry args={[0.86, 0.872, 128]} />
          <meshBasicMaterial color={glow} toneMapped={false} transparent opacity={0.9} />
        </mesh>
        <mesh>
          <ringGeometry args={[1.35, 1.357, 128, 1, 0, Math.PI * 1.5]} />
          <meshBasicMaterial color={glow} toneMapped={false} transparent opacity={0.55} />
        </mesh>
        <mesh>
          <ringGeometry args={[1.9, 1.905, 128, 1, 0.6, Math.PI * 0.9]} />
          <meshBasicMaterial color="#f59e0b" toneMapped={false} transparent opacity={0.5} />
        </mesh>
      </group>
      <ContactShadows position={[0, 0.012, 0]} opacity={0.8} scale={6} blur={2.4} far={1.8} resolution={shadowRes} color="#000000" />
    </group>
  );
}
