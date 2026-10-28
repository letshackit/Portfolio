/**
 * Architecture models for the four Deployments bays (TravelDesk, HRMS, Cloud Commerce, AI To Com).
 * Same idea as traveldesk-architecture.ts, with a wider vocabulary of node kinds so a modular monolith, a service mesh
 * and a voice pipeline can each be described honestly. Pure data: the 3D layouts in src/deployments/three/layouts turn a
 * model into positions, so renaming or adding a node here re-lays the scene with no code change.
 */

export type BayId = 'traveldesk' | 'hrms' | 'cloud-commerce' | 'ai-to-com';

export type BayNodeKind =
  | 'frontend'
  | 'gateway'
  | 'service'
  | 'integration'
  | 'integration-phase2'
  | 'core'
  | 'cluster'
  | 'module'
  | 'store'
  | 'outbox'
  | 'bus'
  | 'satellite'
  | 'external'
  | 'legacy'
  | 'cloud'
  | 'channel'
  | 'pipeline'
  | 'orchestrator'
  | 'control'
  | 'eval';

export type BayEdgeKind = 'call' | 'event' | 'phase2' | 'flow' | 'return' | 'control' | 'mesh';

export interface BayGroup {
  readonly id: string;
  readonly label: string;
  /** One line shown in the readout when the group is selected. */
  readonly summary: string;
}

export interface BayNode {
  readonly id: string;
  /** Full name, shown in the readout and the component index. */
  readonly label: string;
  readonly kind: BayNodeKind;
  readonly role: string;
  readonly group: string;
}

export interface BayEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: BayEdgeKind;
}

export interface BayArchitecture {
  readonly id: BayId;
  readonly groups: readonly BayGroup[];
  readonly nodes: readonly BayNode[];
  readonly edges: readonly BayEdge[];
  /** Honest, short tag shown on the stage: what is confirmed and what is drawn for illustration. */
  readonly fidelity: string;
}
