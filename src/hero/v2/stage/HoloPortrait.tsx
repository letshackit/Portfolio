import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { smoothstep, store } from '../store';
import { FIGURE_FRAG, FIGURE_VERT, GLASS_FRAG, GLASS_VERT } from './holoShaders';
import { useLayout } from './layout';

const damp = THREE.MathUtils.damp;

export const PORTRAIT_URL = '/hero/holo-color.webp';
export const DEPTH_URL = '/hero/holo-depth.webp';

/** Source size of the textures: the aspect of the plane. */
const IMG_W = 1087;
const IMG_H = 1326;
const ASPECT = IMG_W / IMG_H;

/** The glass frame in image-uv terms: nearly the full width, up to just under the crown of his hair. */
const FRAME = { x0: 0.02, x1: 0.98, y1: 0.86 };
/** How far the depth map pushes the face off the chest, world units at height 1 (scaled with the card). */
const DEPTH_SCALE = 0.2;
const GLASS_MARGIN = 0.14;

/** The concentric HUD plate that sits behind him: rings, dashed arcs, degree ticks. Drawn once. */
function drawPlate(): THREE.CanvasTexture {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  if (!g) return new THREE.CanvasTexture(c);
  g.translate(S / 2, S / 2);
  g.lineCap = 'butt';
  const ring = (r: number, w: number, col: string, dash: number[] = []) => {
    g.setLineDash(dash);
    g.lineWidth = w;
    g.strokeStyle = col;
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.stroke();
  };
  ring(470, 2, 'rgba(34,211,238,0.55)');
  ring(430, 1.5, 'rgba(34,211,238,0.35)', [2, 10]);
  ring(360, 6, 'rgba(34,211,238,0.22)', [90, 40, 20, 40]);
  ring(300, 1.5, 'rgba(245,158,11,0.5)', [160, 60]);
  ring(230, 1, 'rgba(34,211,238,0.35)');
  g.setLineDash([]);
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const major = i % 10 === 0;
    const r0 = 470;
    const r1 = major ? 492 : 482;
    g.strokeStyle = major ? 'rgba(245,158,11,0.8)' : 'rgba(34,211,238,0.5)';
    g.lineWidth = major ? 2.5 : 1.2;
    g.beginPath();
    g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    g.stroke();
  }
  g.strokeStyle = 'rgba(34,211,238,0.3)';
  g.lineWidth = 1;
  for (const [x0, y0, x1, y1] of [
    [-512, 0, -250, 0],
    [250, 0, 512, 0],
    [0, -512, 0, -250],
    [0, 250, 0, 512],
  ] as const) {
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A small mono caption for the glass, drawn once. */
function drawLabel(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 96;
  const g = c.getContext('2d');
  if (g) {
    g.font = '600 30px ui-monospace, "Geist Mono", Menlo, monospace';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(103,232,249,0.95)';
    g.fillText('OPERATOR 01', 6, 30);
    g.fillStyle = 'rgba(245,158,11,0.95)';
    g.fillText('●', 396, 30);
    g.fillStyle = 'rgba(160,190,200,0.8)';
    g.font = '500 26px ui-monospace, "Geist Mono", Menlo, monospace';
    g.fillText('LIVE FEED · FIELD-DEPLOYED', 6, 70);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface PortraitUniforms {
  [uniform: string]: THREE.IUniform;
}

/**
 * The hero figure: the owner's real photograph as a holographic depth-parallax card. A cut-out portrait on a plane
 * displaced by a hand-authored depth map (so tilt and camera drift give real parallax), a dark glass pane and a hairline
 * frame he breaks out of at the top, a HUD plate behind him, a gloss streak in front, and a projector beam from the
 * stage floor. It faces the camera, tilts toward the cursor, breathes and floats. It does not turn: there is no back.
 */
export function HoloPortrait() {
  const L = useLayout();
  const [color, depth] = useTexture([PORTRAIT_URL, DEPTH_URL]);
  const { gl, invalidate } = useThree();
  const root = useRef<THREE.Group>(null);
  const plate = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);
  const stand = useRef<THREE.Group>(null);
  const plateMat = useRef<THREE.MeshBasicMaterial>(null);
  const labelMat = useRef<THREE.MeshBasicMaterial>(null);

  const H = L.card.height;
  const W = H * ASPECT;
  const frame = useMemo(() => {
    const w = (FRAME.x1 - FRAME.x0) * W;
    const h = FRAME.y1 * H;
    return { w, h, cx: ((FRAME.x0 + FRAME.x1) / 2 - 0.5) * W, cy: h / 2, r: 0.07 * (H / 1.7) };
  }, [W, H]);

  useLayoutEffect(() => {
    color.colorSpace = THREE.SRGBColorSpace;
    color.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
    color.generateMipmaps = true;
    color.minFilter = THREE.LinearMipmapLinearFilter;
    color.needsUpdate = true;
    depth.colorSpace = THREE.NoColorSpace;
    depth.generateMipmaps = false;
    depth.minFilter = THREE.LinearFilter;
    depth.needsUpdate = true;
  }, [color, depth, gl]);

  const plateTex = useMemo(() => drawPlate(), []);
  const labelTex = useMemo(() => drawLabel(), []);
  useEffect(
    () => () => {
      plateTex.dispose();
      labelTex.dispose();
    },
    [plateTex, labelTex],
  );

  const figure = useMemo<PortraitUniforms>(
    () => ({
      uMap: { value: color },
      uDepth: { value: depth },
      uTexel: { value: new THREE.Vector2(1 / IMG_W, 1 / IMG_H) },
      uDepthScale: { value: DEPTH_SCALE * H },
      uTime: { value: 0 },
      uIntro: { value: 0 },
      uSweep: { value: 0 },
      uExposure: { value: 1 },
      uRelight: { value: 1.5 },
      uBreath: { value: 1 },
      uFade: { value: 1 },
      uLight: { value: new THREE.Vector2() },
      uFrameHalf: { value: new THREE.Vector2(frame.w / 2, frame.h / 2) },
      // The figure's plane is centred on the group's origin height H/2: express the frame centre in plane space.
      uFrameCenter: { value: new THREE.Vector2(frame.cx, frame.cy - H / 2) },
      uFrameR: { value: frame.r },
    }),
    [color, depth, frame, H],
  );

  const glass = useMemo(() => {
    const make = (mode: number): PortraitUniforms => ({
      uMode: { value: mode },
      uTime: { value: 0 },
      uBreath: { value: 1 },
      uFade: { value: 1 },
      uSheen: { value: 0 },
      uIntro: { value: 0 },
      uHalf: { value: new THREE.Vector2(frame.w / 2, frame.h / 2) },
      uR: { value: frame.r },
    });
    return [make(0), make(1), make(2)] as const;
  }, [frame]);

  const s = useRef({ px: 0, py: 0, yaw: 0, pitch: 0 });
  const camPos = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    const g = root.current;
    if (!g) return;
    const st = s.current;
    const still = store.reduced;
    const t = store.time;
    st.px = damp(st.px, still ? 0 : store.px, 3, dt);
    st.py = damp(st.py, still ? 0 : store.py, 3, dt);

    // Face the camera about Y (the beat orbits it), then tilt toward the cursor and sway a little on its own.
    camPos.copy(state.camera.position);
    const yaw = Math.atan2(camPos.x - L.card.x, camPos.z);
    st.yaw = damp(st.yaw, yaw, 8, dt);
    const sway = still ? 0 : Math.sin(t * 0.45) * 0.025;
    g.rotation.set(-st.py * 0.07 + (still ? 0 : Math.sin(t * 0.37) * 0.012), st.yaw + st.px * 0.13 + sway, 0, 'YXZ');
    g.position.y = L.card.y + (still ? 0 : Math.sin(t * 0.9) * 0.022);

    const breath = still ? 1 : 0.86 + 0.14 * Math.sin(t * 1.15);
    const intro = smoothstep(0, 1, store.intro);
    const sweepCycle = still ? 0 : (t % 11) / 4.2;
    const sweep = sweepCycle > 1 ? 0 : sweepCycle;
    const fu = figure;
    fu.uTime.value = t;
    fu.uIntro.value = intro;
    fu.uSweep.value = sweep;
    fu.uBreath.value = breath;
    // The beat passes the card by: it dissolves as the camera starts to push toward the city, rather than looming flat.
    const fade = 1 - smoothstep(0.08, 0.4, store.progress);
    g.visible = fade > 0.003;
    if (stand.current) stand.current.visible = fade > 0.003;
    fu.uFade.value = fade;
    if (plateMat.current) plateMat.current.opacity = 0.38 * fade;
    if (labelMat.current) labelMat.current.opacity = fade;
    (fu.uLight.value as THREE.Vector2).set(st.px, st.py);
    for (const u of glass) {
      u.uTime.value = t;
      u.uBreath.value = breath;
      u.uFade.value = fade;
      u.uIntro.value = intro;
      u.uSheen.value = st.px * 0.5 - st.py * 0.15 + (still ? 0.05 : Math.sin(t * 0.3) * 0.12);
    }
    if (plate.current) plate.current.rotation.z = t * 0.06;
    if (beam.current) (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.055 * breath * intro * fade;
    if (still && (Math.abs(st.px) > 0.001 || Math.abs(st.yaw - yaw) > 0.001)) invalidate();
  });

  // Reduced motion draws on demand: nothing here moves, but the textures arrive after the first frame.
  useEffect(() => {
    invalidate();
  }, [invalidate, color, depth]);

  const glassW = frame.w + GLASS_MARGIN * 2;
  const glassH = frame.h + GLASS_MARGIN * 2;
  const labelW = 0.62 * (H / 1.7);

  return (
    <group ref={stand} position={[L.card.x, 0, 0]}>
      <group ref={root} position={[0, L.card.y, 0]}>
        {/* Backdrop pane. */}
        <mesh position={[frame.cx, frame.cy, -0.16]} renderOrder={1}>
          <planeGeometry args={[glassW, glassH]} />
          <shaderMaterial vertexShader={GLASS_VERT} fragmentShader={GLASS_FRAG} uniforms={glass[0]} transparent depthWrite={false} toneMapped={false} />
        </mesh>
        {/* HUD plate behind him. */}
        <mesh ref={plate} position={[frame.cx, frame.h * 0.66, -0.1]} renderOrder={2}>
          <planeGeometry args={[frame.w * 1.02, frame.w * 1.02]} />
          <meshBasicMaterial ref={plateMat} map={plateTex} transparent opacity={0.38} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
        </mesh>
        {/* Hairline and brackets: under the figure, so his hair breaks the line. */}
        <mesh position={[frame.cx, frame.cy, -0.02]} renderOrder={3}>
          <planeGeometry args={[glassW, glassH]} />
          <shaderMaterial vertexShader={GLASS_VERT} fragmentShader={GLASS_FRAG} uniforms={glass[1]} transparent depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        {/* The figure. */}
        <mesh position={[0, H / 2, 0]} renderOrder={4}>
          <planeGeometry args={[W, H, 220, 268]} />
          <shaderMaterial vertexShader={FIGURE_VERT} fragmentShader={FIGURE_FRAG} uniforms={figure} transparent toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        {/* Caption on the glass. */}
        <mesh position={[frame.cx - frame.w / 2 + labelW / 2 + 0.07, 0.11 * (H / 1.7), 0.2]} renderOrder={5}>
          <planeGeometry args={[labelW, labelW * (96 / 768)]} />
          <meshBasicMaterial ref={labelMat} map={labelTex} transparent depthWrite={false} toneMapped={false} fog={false} />
        </mesh>
        {/* Gloss over everything. */}
        <mesh position={[frame.cx, frame.cy, 0.24]} renderOrder={6}>
          <planeGeometry args={[glassW, glassH]} />
          <shaderMaterial vertexShader={GLASS_VERT} fragmentShader={GLASS_FRAG} uniforms={glass[2]} transparent depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>
      {/* Projector: a faint cone of light from the floor to the card's foot, and a bright emitter ring. */}
      <mesh ref={beam} position={[0, L.card.y * 0.5 + 0.02, 0]} renderOrder={1}>
        <cylinderGeometry args={[frame.w * 0.46, 0.5, Math.max(0.2, L.card.y), 48, 1, true]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} fog={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]}>
        <ringGeometry args={[0.46, 0.5, 96]} />
        <meshBasicMaterial color={new THREE.Color('#22d3ee').multiplyScalar(1.2)} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.011, 0]}>
        <circleGeometry args={[0.46, 64]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.05} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

useTexture.preload([PORTRAIT_URL, DEPTH_URL]);
