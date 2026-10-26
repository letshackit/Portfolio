import { Bloom, EffectComposer, Noise, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import type { Quality } from './quality';

/**
 * Film stack: MSAA on the scene buffer (tier-dependent, never off) and SMAA after the tone map, so edges that only
 * alias once the HDR is compressed (the rim-lit silhouette, hair) are smoothed too; bloom; ACES; faint grain; vignette.
 * The bloom threshold sits above skin and cloth, so only the rim light's hot edges, the amber drones and docking
 * flashes glow. No chromatic split: it would fringe the face. The last tier drops the grain.
 */
export function Effects({ q }: { q: Quality }) {
  const effects = [
    <Bloom key="bloom" intensity={0.85} luminanceThreshold={0.92} luminanceSmoothing={0.2} mipmapBlur radius={0.78} />,
    <ToneMapping key="tm" mode={ToneMappingMode.ACES_FILMIC} />,
  ];
  if (q.noise) effects.push(<Noise key="noise" premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.035} />);
  effects.push(<Vignette key="vig" offset={0.28} darkness={0.9} />);
  effects.push(<SMAA key="smaa" />);
  return <EffectComposer multisampling={q.msaa}>{effects}</EffectComposer>;
}
