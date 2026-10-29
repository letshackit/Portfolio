import { Bloom, EffectComposer, Noise, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, SMAAPreset, ToneMappingMode } from 'postprocessing';
import { LOOK } from './lookPreset';
import type { Quality } from './quality';

/**
 * Film stack (parameters in lookPreset.ts): MSAA on the scene buffer (up to 8 samples on the top tier, clamped to what the GPU offers, never off) and SMAA (ultra preset) after the tone
 * map, so edges that only alias once the HDR is compressed (the rim-lit silhouette, hair) are smoothed too; bloom held
 * above the skin; ACES; a vignette. No chromatic split (it would fringe the face) and no grain (crisp, smooth skin): the
 * grain pass only exists if the preset turns it on, and never on the last tier.
 */
export function Effects({ q }: { q: Quality }) {
  const P = LOOK.post;
  const effects = [
    <Bloom key="bloom" intensity={P.bloom.intensity} luminanceThreshold={P.bloom.threshold} luminanceSmoothing={P.bloom.smoothing} mipmapBlur radius={P.bloom.radius} />,
    <ToneMapping key="tm" mode={ToneMappingMode.ACES_FILMIC} />,
  ];
  if (P.noise && q.noise) effects.push(<Noise key="noise" premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.035} />);
  effects.push(<Vignette key="vig" offset={P.vignette.offset} darkness={P.vignette.darkness} />);
  effects.push(<SMAA key="smaa" preset={SMAAPreset.ULTRA} />);
  return <EffectComposer multisampling={q.msaa}>{effects}</EffectComposer>;
}
