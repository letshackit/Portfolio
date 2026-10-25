/**
 * Visible strings owned by the diagram. Interim home: architecture asks for every visible
 * literal to live in data/content.ts, which this step does not own (see HANDOFF "Integration must apply").
 */
import type { ArchNodeKind } from '../data/content.types';

export const archCopy = {
  captionDefault: 'Hover or focus a service to trace its connections.',
  captionConnects: 'connects to',
  diagramLabel: 'TravelDesk architecture diagram',
  legendLabel: 'Legend',
  hudTag: 'TRAVELDESK / EXPLODED VIEW',
  hudAssembly: 'ASSEMBLY',
  hudLive: 'LIVE SYSTEMS',
  hudPhase2: 'PHASE 2',
  legendPhase2: 'dashed = Phase 2',
  kindLabel: {
    frontend: 'Front end',
    gateway: 'API gateway',
    domain: 'Domain service',
    integration: 'Integration',
    'integration-phase2': 'Phase 2 integration',
  } satisfies Record<ArchNodeKind, string>,
  legendKinds: ['frontend', 'gateway', 'domain', 'integration'] as const satisfies readonly ArchNodeKind[],
} as const;
