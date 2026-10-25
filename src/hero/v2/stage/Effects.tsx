import { useMemo } from 'react';
import { Bloom, ChromaticAberration, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { Vector2 } from 'three';
import type { Quality } from './quality';

/**
 * Film stack: bloom, a slight chromatic split, ACES, subtle grain, vignette. The bloom threshold sits high so only the
 * rim light, the amber drones and docking flashes glow; the city's own edges stay under it and never rival the avatar.
 * The last tier drops the chromatic split and the grain.
 */
export function Effects({ q }: { q: Quality }) {
  const offset = useMemo(() => new Vector2(0.0003, 0.0004), []);
  const effects = [<Bloom key="bloom" intensity={0.85} luminanceThreshold={0.78} luminanceSmoothing={0.3} mipmapBlur radius={0.78} />];
  if (q.chroma) effects.push(<ChromaticAberration key="ca" offset={offset} radialModulation={false} modulationOffset={0} />);
  effects.push(<ToneMapping key="tm" mode={ToneMappingMode.ACES_FILMIC} />);
  if (q.noise) effects.push(<Noise key="noise" premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.5} />);
  effects.push(<Vignette key="vig" offset={0.28} darkness={0.9} />);
  return <EffectComposer multisampling={q.msaa}>{effects}</EffectComposer>;
}
