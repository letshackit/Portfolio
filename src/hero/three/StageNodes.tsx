import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, type Group, type Material, type Vector3 } from 'three';
import type { SceneColors } from './sceneGeometry';

/** Seconds an amber arrival ring takes to pulse 0 to 0.9 to 0. */
export const ARRIVAL_PULSE = 0.25;
const HOVER_SCALE = 1.12;
const GLOW_REST = 0.12;
const GLOW_HOVER = 0.35;
const LERP = 0.25;
/** Disc and ring sit in front of the packets and edges so they hide what passes behind (like the SVG). */
const Z_GLOW = 0.03;
const Z_DISC = 0.06;
const Z_RING = 0.062;
const Z_ARRIVE = 0.064;

interface StageNodesProps {
  readonly positions: ReadonlyArray<Vector3>;
  readonly colors: SceneColors;
  readonly hovered: MutableRefObject<number | null>;
  /** Seconds of arrival pulse left per stage; Packets sets it, this component counts it down. */
  readonly pulses: Float32Array;
}

interface NodeRefs {
  body: Group | null;
  glow: Material | null;
  arrive: Material | null;
}

export function StageNodes({ positions, colors, hovered, pulses }: StageNodesProps) {
  const refs = useMemo<NodeRefs[]>(() => positions.map(() => ({ body: null, glow: null, arrive: null })), [positions]);
  const hoverAmount = useRef<number[]>(positions.map(() => 0));

  useFrame((_, delta) => {
    positions.forEach((_p, i) => {
      const r = refs[i];
      const target = hovered.current === i ? 1 : 0;
      const h = hoverAmount.current[i] + (target - hoverAmount.current[i]) * LERP;
      hoverAmount.current[i] = h;
      if (r.body) r.body.scale.setScalar(1 + (HOVER_SCALE - 1) * h);
      if (r.glow) r.glow.opacity = GLOW_REST + (GLOW_HOVER - GLOW_REST) * h;
      if (r.arrive) {
        const left = Math.max(0, pulses[i] - delta);
        pulses[i] = left;
        r.arrive.opacity = left > 0 ? 0.9 * Math.sin(Math.PI * (1 - left / ARRIVAL_PULSE)) : 0;
      }
    });
  });

  return (
    <group>
      {positions.map((p, i) => (
        <group key={i} position={p}>
          <mesh position-z={Z_GLOW}>
            <ringGeometry args={[0.26, 0.42, 48]} />
            <meshBasicMaterial
              ref={(m) => {
                refs[i].glow = m;
              }}
              color={colors.cyan}
              transparent
              opacity={GLOW_REST}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <group
            ref={(g) => {
              refs[i].body = g;
            }}
          >
            <mesh position-z={Z_DISC}>
              <circleGeometry args={[0.21, 48]} />
              <meshBasicMaterial color={colors.surface} />
            </mesh>
            <mesh position-z={Z_RING}>
              <ringGeometry args={[0.21, 0.26, 48]} />
              <meshBasicMaterial color={colors.cyan} transparent opacity={0.95} />
            </mesh>
          </group>
          <mesh position-z={Z_ARRIVE}>
            <ringGeometry args={[0.27, 0.3, 48]} />
            <meshBasicMaterial
              ref={(m) => {
                refs[i].arrive = m;
              }}
              color={colors.amber}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
