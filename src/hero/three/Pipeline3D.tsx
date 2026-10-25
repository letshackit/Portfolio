import { useCallback, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './Scene';
import { readSceneColors, CAMERA_FOV } from './sceneGeometry';
import type { Pipeline3DProps } from './types';

const FULL_MAX_LIVE = 24;
const DEGRADED_MAX_LIVE = 12;

/**
 * The 3D hero (architecture C.3). Lazy chunk: only PipelineFrame imports it, and only past the loading gate. The
 * canvas is decorative and takes no pointer events; the frame handles pointer input and the DOM overlay owns focus.
 */
export function Pipeline3D({ layout, frameEl, hoveredStage, onArrive, paused, pointerFine, onReady, onFail }: Pipeline3DProps) {
  const [degraded, setDegraded] = useState(false);
  const colors = useMemo(() => readSceneColors(frameEl), [frameEl]);
  const onDegrade = useCallback(() => setDegraded(true), []);

  return (
    <Canvas
      dpr={degraded ? 1 : [1, 1.5]}
      flat
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power', stencil: false, depth: true }}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 50, position: [0, 0, 7.09] }}
      frameloop={paused ? 'never' : 'always'}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <Scene
        layout={layout}
        frameEl={frameEl}
        hoveredStage={hoveredStage}
        onArrive={onArrive}
        pointerFine={pointerFine}
        onReady={onReady}
        onFail={onFail}
        colors={colors}
        maxLive={degraded ? DEGRADED_MAX_LIVE : FULL_MAX_LIVE}
        onDegrade={onDegrade}
      />
    </Canvas>
  );
}
