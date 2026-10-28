import { Bloom, EffectComposer, Noise, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import type { Quality } from './quality';

/**
 * Film stack for the vault: bloom only on what is pushed past 1.0 (the marks, the rings, the lattice, the glass's hot
 * edges), ACES, faint grain, a soft vignette so the canvas melts into the page, SMAA after the tone map.
 */
export function Effects({ q }: { q: Quality }) {
  const effects = [
    <Bloom key="bloom" intensity={0.8} luminanceThreshold={0.85} luminanceSmoothing={0.25} mipmapBlur radius={0.72} />,
    <ToneMapping key="tm" mode={ToneMappingMode.ACES_FILMIC} />,
  ];
  if (q.noise) effects.push(<Noise key="noise" premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.03} />);
  effects.push(<Vignette key="vig" offset={0.35} darkness={0.75} />);
  effects.push(<SMAA key="smaa" />);
  return <EffectComposer multisampling={q.msaa}>{effects}</EffectComposer>;
}
