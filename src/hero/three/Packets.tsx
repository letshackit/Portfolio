import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Object3D, type InstancedMesh, type QuadraticBezierCurve3 } from 'three';
import { createSim } from './packetSim';
import type { SceneColors } from './sceneGeometry';
import { ARRIVAL_PULSE } from './StageNodes';

const POOL = 24;

interface PacketsProps {
  readonly curves: ReadonlyArray<QuadraticBezierCurve3>;
  readonly colors: SceneColors;
  readonly maxLive: number;
  readonly pulses: Float32Array;
  readonly onArrive?: (stage: number) => void;
}

/** Packet bodies and glows as two instanced meshes, positioned each frame from the framework-free sim. */
export function Packets({ curves, colors, maxLive, pulses, onArrive }: PacketsProps) {
  const body = useRef<InstancedMesh>(null);
  const glow = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const sim = useMemo(() => createSim(curves.map((c) => c.getLength()), { maxLive: POOL }), [curves]);
  const arrive = useRef(onArrive);

  useEffect(() => {
    arrive.current = onArrive;
  }, [onArrive]);
  useEffect(() => {
    sim.setMaxLive(maxLive);
  }, [sim, maxLive]);

  useFrame((_, delta) => {
    const bodies = body.current;
    const glows = glow.current;
    if (!bodies || !glows) return;
    for (const a of sim.step(delta)) {
      pulses[a.stage] = ARRIVAL_PULSE;
      arrive.current?.(a.stage);
    }
    sim.packets.forEach((p, i) => {
      if (p.alive) {
        dummy.position.copy(curves[p.edge].getPointAt(p.t));
        dummy.scale.setScalar(1);
      } else {
        dummy.scale.setScalar(0);
      }
      dummy.updateMatrix();
      bodies.setMatrixAt(i, dummy.matrix);
      glows.setMatrixAt(i, dummy.matrix);
    });
    bodies.instanceMatrix.needsUpdate = true;
    glows.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={glow} args={[undefined, undefined, POOL]} frustumCulled={false}>
        <sphereGeometry args={[0.11, 8, 8]} />
        <meshBasicMaterial
          color={colors.amber}
          transparent
          opacity={0.18}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
      <instancedMesh ref={body} args={[undefined, undefined, POOL]} frustumCulled={false}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshBasicMaterial color={colors.amber} />
      </instancedMesh>
    </group>
  );
}
