import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Quaternion, Vector3, type Group } from 'three';
import { assemble, flight, stationVisible } from './timeline';
import { stationPose, type TrackLayout } from './track';

interface StationProps {
  readonly index: number;
  readonly layout: TrackLayout;
  readonly children: ReactNode;
}

/** Places one station on the conduit, facing back down the path, and hides it while the camera is far from it. */
export function Station({ index, layout, children }: StationProps) {
  const group = useRef<Group>(null);
  const pos = useMemo(() => new Vector3(), []);
  const quat = useMemo(() => new Quaternion(), []);

  useLayoutEffect(() => {
    const g = group.current;
    if (!g) return;
    stationPose(layout, index, pos, quat);
    g.position.copy(pos);
    g.quaternion.copy(quat);
    g.scale.setScalar(layout.scale);
  }, [layout, index, pos, quat]);

  useFrame(() => {
    const g = group.current;
    if (g) g.visible = stationVisible(index, flight.s) && (index === 0 || assemble(index, flight.s) > 0.002);
  });

  return <group ref={group}>{children}</group>;
}
