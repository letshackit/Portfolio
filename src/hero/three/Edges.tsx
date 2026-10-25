import { useEffect, useMemo } from 'react';
import { AdditiveBlending, TubeGeometry, type QuadraticBezierCurve3 } from 'three';
import type { SceneColors } from './sceneGeometry';

interface EdgesProps {
  readonly curves: ReadonlyArray<QuadraticBezierCurve3>;
  readonly colors: SceneColors;
}

/** Six edges as tubes: a thin core and a wider additive glow (tubes give real width where GL lines are 1 px). */
export function Edges({ curves, colors }: EdgesProps) {
  const tubes = useMemo(
    () =>
      curves.map((curve) => ({
        core: new TubeGeometry(curve, 24, 0.012, 6, false),
        glow: new TubeGeometry(curve, 24, 0.04, 6, false),
      })),
    [curves],
  );
  useEffect(
    () => () => {
      for (const t of tubes) {
        t.core.dispose();
        t.glow.dispose();
      }
    },
    [tubes],
  );
  return (
    <group>
      {tubes.map((t, i) => (
        <group key={i}>
          <mesh geometry={t.glow}>
            <meshBasicMaterial
              color={colors.cyan}
              transparent
              opacity={0.1}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh geometry={t.core}>
            <meshBasicMaterial color={colors.cyan} transparent opacity={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
