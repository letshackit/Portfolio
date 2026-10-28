import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import type { Quality } from './quality';

/**
 * Film stack for the flight: MSAA on the scene buffer (tier-dependent), bloom for the emissive rails, packet and
 * checks, ACES, faint grain, vignette. Anti-aliasing is never off: the last tier keeps 2x MSAA.
 */
export function Effects({ q }: { q: Quality }) {
  const effects = [
    <Bloom key="bloom" intensity={0.8} luminanceThreshold={0.88} luminanceSmoothing={0.25} mipmapBlur radius={0.8} />,
    <ToneMapping key="tm" mode={ToneMappingMode.ACES_FILMIC} />,
  ];
  if (q.noise) effects.push(<Noise key="noise" premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.04} />);
  effects.push(<Vignette key="vig" offset={0.3} darkness={0.85} />);
  return <EffectComposer multisampling={q.msaa}>{effects}</EffectComposer>;
}
