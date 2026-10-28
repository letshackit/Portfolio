import { Bloom, EffectComposer, Noise, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import type { Quality } from '../../hero/v2/stage/quality';

/**
 * Film stack for the timeline: MSAA on the scene buffer, bloom on the emissive cables, gates and flares (the cyan and
 * amber are pushed above 1 on purpose; everything else stays below the threshold), ACES, faint grain, vignette.
 */
export function Effects({ q }: { q: Quality }) {
  const effects = [
    <Bloom key="bloom" intensity={1.15} luminanceThreshold={0.78} luminanceSmoothing={0.25} mipmapBlur radius={0.82} />,
    <ToneMapping key="tm" mode={ToneMappingMode.ACES_FILMIC} />,
  ];
  if (q.noise) effects.push(<Noise key="noise" premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.04} />);
  effects.push(<Vignette key="vig" offset={0.25} darkness={0.85} />);
  effects.push(<SMAA key="smaa" />);
  return <EffectComposer multisampling={q.msaa}>{effects}</EffectComposer>;
}
