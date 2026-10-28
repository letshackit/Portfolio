/**
 * The conduit's geometry. The path is analytic (no spline object, no arc-length table): in the landscape layout it runs
 * away from the viewer along -Z with a slow lateral and vertical sway; in the portrait layout it runs straight down -Y,
 * so a phone scrolls down it. `arc` is the distance travelled, in world units.
 */
import { Matrix4, Quaternion, Vector3 } from 'three';
import { STATIONS } from './timeline';

export interface TrackLayout {
  readonly portrait: boolean;
  /** World units between two stations. */
  readonly spacing: number;
  /** Where a station's centre sits ahead of the camera while the camera rests on it. */
  readonly ahead: number;
  /** The amber work packet rides this far in front of the camera. */
  readonly packetAhead: number;
  /** How far to the right of the path a station stands (landscape only). */
  readonly lateral: number;
  /** Uniform scale of every station; the portrait frustum is narrow. */
  readonly scale: number;
  /** Extra yaw of a station about its own up axis, radians. */
  readonly yaw: number;
  /** Arc distance of the far server the deploy pulse runs to. */
  readonly serverArc: number;
  /** Arc length of everything that is built (rails, rings, dust). */
  readonly totalArc: number;
  /** Vertical field of view of the camera, degrees. */
  readonly fov: number;
}

const LAND_SPACING = 15;
const PORT_SPACING = 8.4;

export function makeLayout(portrait: boolean): TrackLayout {
  const spacing = portrait ? PORT_SPACING : LAND_SPACING;
  const ahead = portrait ? 0.4 : 7.2;
  const last = (STATIONS - 1) * spacing + ahead;
  const serverArc = last + (portrait ? 3.9 : 44);
  return {
    portrait,
    spacing,
    ahead,
    packetAhead: portrait ? 1.9 : 3.1,
    lateral: portrait ? 0 : 2.25,
    scale: portrait ? 0.66 : 1,
    yaw: portrait ? 0 : -0.3,
    serverArc,
    totalArc: serverArc + (portrait ? 9 : 14),
    fov: portrait ? 40 : 42,
  };
}

/** The track starts a little behind the first camera position so the rails reach the bottom of the frame at once. */
export function arcStart(L: TrackLayout): number {
  return -(0.9 * L.spacing + 6);
}

/** Arc distance of the camera when it is at `s` stations. */
export function cameraArc(L: TrackLayout, s: number): number {
  return s * L.spacing;
}

/** Arc distance of the centre of station `i`. */
export function stationArc(L: TrackLayout, i: number): number {
  return i * L.spacing + L.ahead;
}

/** Portrait: the rails run behind the stations' plane so they never cut across a card. */
export const RAIL_Z = -1.3;

const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Landscape: a slow sway, then a long bend to the right after the last station so the far server stands in the open. */
export function pathPoint(L: TrackLayout, arc: number, out: Vector3): Vector3 {
  if (L.portrait) return out.set(0.1 * Math.sin(arc * 0.35), -arc, RAIL_Z);
  const bend = 13 * smooth(stationArc(L, STATIONS - 3), L.serverArc, arc);
  return out.set(2.4 * Math.sin(arc * 0.075 + 0.6) + bend, 0.7 * Math.sin(arc * 0.052 + 1.2), -arc);
}

const EPS = 0.05;
const tA = new Vector3();
const tB = new Vector3();

export function pathTangent(L: TrackLayout, arc: number, out: Vector3): Vector3 {
  pathPoint(L, arc + EPS, tA);
  pathPoint(L, arc - EPS, tB);
  return out.subVectors(tA, tB).normalize();
}

const REF_LAND = new Vector3(0, 1, 0);
const REF_PORT = new Vector3(0, 0, -1);

/** Right-handed frame at `arc`: T forward, R to the right of travel, U up (towards -Z in the portrait layout). */
export function pathFrame(L: TrackLayout, arc: number, T: Vector3, R: Vector3, U: Vector3): void {
  pathTangent(L, arc, T);
  R.crossVectors(T, L.portrait ? REF_PORT : REF_LAND).normalize();
  U.crossVectors(R, T).normalize();
}

const m4 = new Matrix4();
const qYaw = new Quaternion();
const AXIS_Y = new Vector3(0, 1, 0);
const fT = new Vector3();
const fR = new Vector3();
const fU = new Vector3();
const fZ = new Vector3();

/** World position and orientation of station `i`: it faces back down the path at the camera. */
export function stationPose(L: TrackLayout, i: number, position: Vector3, quaternion: Quaternion): void {
  const arc = stationArc(L, i);
  pathPoint(L, arc, position);
  if (L.portrait) {
    position.z = 0;
    quaternion.identity();
    return;
  }
  pathFrame(L, arc, fT, fR, fU);
  position.addScaledVector(fR, i === STATIONS - 1 ? L.lateral * 0.1 : L.lateral);
  fZ.copy(fT).negate();
  m4.makeBasis(fR, fU, fZ);
  quaternion.setFromRotationMatrix(m4);
  qYaw.setFromAxisAngle(AXIS_Y, L.yaw);
  quaternion.multiply(qYaw);
}
