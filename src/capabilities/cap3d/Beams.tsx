import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, type LineSegments, type Points } from 'three';
import type { Tone } from '../domains';
import { COLORS, type StageState } from './scene';

const PACKETS = 3;

interface BeamsProps {
  readonly state: StageState;
  readonly tones: readonly Tone[];
}

/**
 * One beam from the core to each hub, with packets riding it. Every beam is faint; the active one brightens and
 * its packets run hot, so the eye follows the work from the core out to the lit domain.
 */
export function Beams({ state, tones }: BeamsProps) {
  const lines = useRef<LineSegments>(null);
  const packets = useRef<Points>(null);
  const n = tones.length;

  const beamGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(n * 6), 3));
    g.setAttribute('color', new Float32BufferAttribute(new Float32Array(n * 6), 3));
    return g;
  }, [n]);
  const packetGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(n * PACKETS * 3), 3));
    g.setAttribute('color', new Float32BufferAttribute(new Float32Array(n * PACKETS * 3), 3));
    return g;
  }, [n]);
  useEffect(
    () => () => {
      beamGeo.dispose();
      packetGeo.dispose();
    },
    [beamGeo, packetGeo],
  );

  useFrame(() => {
    const bp = beamGeo.attributes.position.array as Float32Array;
    const bc = beamGeo.attributes.color.array as Float32Array;
    const pp = packetGeo.attributes.position.array as Float32Array;
    const pc = packetGeo.attributes.color.array as Float32Array;
    const t = state.time;
    for (let i = 0; i < n; i++) {
      const hub = state.hubWorld[i];
      const act = state.act[i];
      const tone = COLORS[tones[i]];
      bp[i * 6] = 0;
      bp[i * 6 + 1] = 0;
      bp[i * 6 + 2] = 0;
      bp[i * 6 + 3] = hub.x;
      bp[i * 6 + 4] = hub.y;
      bp[i * 6 + 5] = hub.z;
      // Colour is the brightness: additive blending, so scaling the colour fades the beam.
      const k = 0.16 + act * 0.7;
      for (const e of [0, 1]) {
        bc[i * 6 + e * 3] = tone.base.r * k;
        bc[i * 6 + e * 3 + 1] = tone.base.g * k;
        bc[i * 6 + e * 3 + 2] = tone.base.b * k;
      }
      for (let p = 0; p < PACKETS; p++) {
        const f = (t * (0.22 + act * 0.2) + p / PACKETS) % 1;
        const o = (i * PACKETS + p) * 3;
        pp[o] = hub.x * f;
        pp[o + 1] = hub.y * f;
        pp[o + 2] = hub.z * f;
        const pk = (0.25 + act * 2.2) * Math.sin(f * Math.PI);
        pc[o] = tone.hot.r * pk;
        pc[o + 1] = tone.hot.g * pk;
        pc[o + 2] = tone.hot.b * pk;
      }
    }
    beamGeo.attributes.position.needsUpdate = true;
    beamGeo.attributes.color.needsUpdate = true;
    packetGeo.attributes.position.needsUpdate = true;
    packetGeo.attributes.color.needsUpdate = true;
  });

  return (
    <>
      <lineSegments ref={lines} geometry={beamGeo} frustumCulled={false}>
        <lineBasicMaterial vertexColors transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </lineSegments>
      <points ref={packets} geometry={packetGeo} frustumCulled={false}>
        <pointsMaterial vertexColors size={5} sizeAttenuation={false} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </points>
    </>
  );
}
