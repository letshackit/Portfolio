import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { smoothstep, store } from '../store';
import { LOOK } from './lookPreset';

/** Where the key and fill aim: his chest. */
const AIM = new THREE.Vector3(0, 1.05, 0);

/**
 * The look rig (parameters in lookPreset.ts), with a "lights on" ramp that starts at the preset's floor.
 * Key: neutral-warm, front-left, held low so the cheek never blows out; it casts the soft shadows (chin, lapel, hair).
 * Fill: broad, soft, front-right. Hemisphere: a shadowless wash. Rim: a faint cyan from behind-right (structure) and a
 * fainter amber from behind-left (the agent's warmth), so the outline reads while he turns. A soft overhead pool lights
 * the floor around him. The studio HDR (set on his materials) adds the reflections.
 */
export function Lights({ shadowRes }: { shadowRes: number }) {
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const rim2 = useRef<THREE.DirectionalLight>(null);
  const pool = useRef<THREE.SpotLight>(null);
  const scene = useThree((s) => s.scene);
  const L = LOOK.lights;
  const aim = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.copy(AIM);
    return o;
  }, []);

  useLayoutEffect(() => {
    for (const l of [key.current, fill.current, pool.current]) {
      if (l) l.target = aim;
    }
    const k = key.current;
    if (k) {
      k.shadow.mapSize.set(shadowRes, shadowRes);
      k.shadow.map?.dispose();
      k.shadow.map = null;
    }
    scene.environmentRotation.set(0, LOOK.environment.rotationY, 0);
  }, [aim, shadowRes, scene]);

  useFrame(() => {
    // The floor: he is readable the moment he mounts; the intro only brings the lights up to full.
    const k = (L.introFloor + (1 - L.introFloor) * smoothstep(0, 1, store.intro)) * LOOK.exposure;
    if (key.current) key.current.intensity = L.key.intensity * k;
    if (fill.current) fill.current.intensity = L.fill.intensity * k;
    if (hemi.current) hemi.current.intensity = L.hemi.intensity * k;
    if (rim.current) rim.current.intensity = L.rim.intensity * k;
    if (rim2.current) rim2.current.intensity = L.rim2.intensity * k;
    if (pool.current) pool.current.intensity = L.pool.intensity * k;
    // This is what the floor and the city get from the studio probe.
    scene.environmentIntensity = LOOK.environment.intensity * k;
  });

  return (
    <>
      <primitive object={aim} />
      <hemisphereLight ref={hemi} args={[L.hemi.sky, L.hemi.ground, 0]} />
      <directionalLight
        ref={key}
        color={L.key.color}
        position={L.key.position}
        intensity={0}
        castShadow
        shadow-radius={5}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
        shadow-camera-left={-1.3}
        shadow-camera-right={1.3}
        shadow-camera-top={2.3}
        shadow-camera-bottom={-0.4}
        shadow-camera-near={2}
        shadow-camera-far={9}
      />
      <directionalLight ref={fill} color={L.fill.color} position={L.fill.position} intensity={0} />
      <directionalLight ref={rim} color={L.rim.color} position={L.rim.position} intensity={0} />
      <directionalLight ref={rim2} color={L.rim2.color} position={L.rim2.position} intensity={0} />
      <spotLight ref={pool} color={L.pool.color} position={L.pool.position} angle={L.pool.angle} penumbra={L.pool.penumbra} decay={2} distance={0} intensity={0} />
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

/** A soft halo behind the operator (and an optional warm pool at the left); slides with the cursor for depth. */
export function Backdrop() {
  const halo = useGlowTexture([
    [0, 'rgba(255,255,255,1)'],
    [0.4, 'rgba(255,255,255,0.27)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  const warm = useGlowTexture([
    [0, 'rgba(245,158,11,1)'],
    [0.5, 'rgba(245,158,11,0.25)'],
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
        <meshBasicMaterial map={halo} color={LOOK.backdrop.haloColor} opacity={LOOK.backdrop.haloAlpha} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} toneMapped={false} />
      </mesh>
      <mesh position={[-2.6, 1.4, -1.5]} visible={LOOK.backdrop.warmAlpha > 0}>
        <planeGeometry args={[5, 4]} />
        <meshBasicMaterial map={warm} opacity={LOOK.backdrop.warmAlpha} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} toneMapped={false} />
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
  const F = LOOK.floor;
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
            blur={[F.blur[0], F.blur[1]]}
            resolution={reflect}
            mixBlur={1}
            mixStrength={F.mixStrength}
            mirror={F.mirror}
            roughness={F.roughness}
            depthScale={1.1}
            minDepthThreshold={0.35}
            maxDepthThreshold={1.5}
            color={F.color}
            metalness={F.metalness}
          />
        ) : (
          <meshStandardMaterial color={F.color} roughness={0.6} metalness={F.metalness} />
        )}
      </mesh>
      <group ref={rings} rotation-x={-Math.PI / 2} position={[0, 0.006, 0]}>
        <mesh>
          <ringGeometry args={[0.86, 0.872, 128]} />
          <meshBasicMaterial color={glow} toneMapped={false} transparent opacity={0.9 * F.ringOpacity} />
        </mesh>
        <mesh>
          <ringGeometry args={[1.35, 1.357, 128, 1, 0, Math.PI * 1.5]} />
          <meshBasicMaterial color={glow} toneMapped={false} transparent opacity={0.55 * F.ringOpacity} />
        </mesh>
        <mesh>
          <ringGeometry args={[1.9, 1.905, 128, 1, 0.6, Math.PI * 0.9]} />
          <meshBasicMaterial color="#f59e0b" toneMapped={false} transparent opacity={0.5 * F.ringOpacity} />
        </mesh>
      </group>
      <ContactShadows position={[0, 0.012, 0]} opacity={F.shadow.opacity} scale={F.shadow.scale} blur={F.shadow.blur} far={F.shadow.far} resolution={shadowRes} color="#000000" />
    </group>
  );
}
