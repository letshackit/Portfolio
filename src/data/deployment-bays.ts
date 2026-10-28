/**
 * The four flagship Deployments bays: copy plus architecture model, in display order.
 * Copy for TravelDesk, HRMS and Cloud Commerce is taken from content.ts (the single source of truth) and only
 * overridden where the owner's 2026-10-29 corrections changed it. AI To Com is new copy, written from the corrections:
 * a voice-agent platform (voice agents, chatbots, IVR). BSS is gone. No figure here is invented.
 */
import { content } from './content';
import type { Deployment, DeploymentStatus } from './content.types';
import type { BayArchitecture, BayEdge, BayId, BayNode, BayNodeKind } from './bay-architecture.types';
import { aiToComArchitecture } from './aitocom-architecture';
import { cloudCommerceArchitecture } from './cloudcommerce-architecture';
import { hrmsArchitecture } from './hrms-architecture';
import { travelDeskArchitecture } from './traveldesk-architecture';
import type { ArchNodeKind } from './content.types';

export interface BayCopy {
  readonly id: BayId;
  readonly name: string;
  readonly description: string;
  readonly status: DeploymentStatus;
  readonly stack: readonly string[];
  readonly metrics: readonly string[];
  /** At most three. */
  readonly details: readonly string[];
  /** What the readout says before anything is selected. */
  readonly hint: string;
  /** What one node on the stage is called here, for the component index. */
  readonly indexLabel: string;
  /** Which bottom corner of the stage the readout takes, so it never sits on the part of the scene that needs the room. */
  readonly readoutSide: 'left' | 'right';
}

export interface Bay extends BayCopy {
  readonly architecture: BayArchitecture;
}

const KIND: Readonly<Record<ArchNodeKind, BayNodeKind>> = {
  frontend: 'frontend',
  gateway: 'gateway',
  domain: 'service',
  integration: 'integration',
  'integration-phase2': 'integration-phase2',
};

/** TravelDesk's 16 domain services by flow lane. The lane is a layout idea, so it lives here rather than in the model. */
const LANE: Readonly<Record<string, string>> = {
  'travel-request': 'trip',
  approval: 'trip',
  booking: 'trip',
  'vendor-adapter': 'trip',
  expense: 'expense',
  ocr: 'expense',
  policy: 'expense',
  reimbursement: 'expense',
  'sap-adapter': 'expense',
  identity: 'people',
  employee: 'people',
  'hris-adapter': 'people',
  tenant: 'platform',
  admin: 'platform',
  notification: 'platform',
  audit: 'platform',
};

function fromTravelDesk(): BayArchitecture {
  const m = travelDeskArchitecture;
  const nodes: BayNode[] = m.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    kind: KIND[n.kind],
    role: n.role,
    group: n.kind === 'domain' ? (LANE[n.id] ?? 'platform') : n.kind === 'frontend' || n.kind === 'gateway' ? 'entry' : n.kind === 'integration' ? 'live' : 'phase2',
  }));
  const edges: BayEdge[] = m.edges.map((e) => ({ from: e.from, to: e.to, kind: e.kind }));
  return {
    id: 'traveldesk',
    fidelity: '16 service names confirmed · wiring illustrative',
    groups: [
      { id: 'entry', label: 'Entry', summary: 'Next.js front end and the Spring Boot API gateway in front of everything.' },
      { id: 'trip', label: 'Trip', summary: 'Request, approve, book.' },
      { id: 'expense', label: 'Expense', summary: 'Claim, capture the receipt, validate, reimburse.' },
      { id: 'people', label: 'People', summary: 'Identity, the employee directory and the HRIS link.' },
      { id: 'platform', label: 'Platform', summary: 'Tenancy, configuration, notifications and the audit trail.' },
      { id: 'live', label: 'Live integrations', summary: 'The enterprise HRIS, Quest2Travel and SAP.' },
      { id: 'phase2', label: 'Phase 2', summary: 'EBIX forex and Recharge, scoped around infosec review gates.' },
    ],
    nodes,
    edges,
  };
}

function itemOf(id: string): Deployment {
  const item = content.deployments.items.find((d) => d.id === id);
  if (!item) throw new Error(`deployment-bays: content.ts has no deployment "${id}"`);
  return item;
}

const travel = itemOf('traveldesk');
const hrms = itemOf('hrms');
const commerce = itemOf('cloud-commerce');

export const bays: readonly Bay[] = [
  {
    id: 'traveldesk',
    name: travel.name,
    description: 'Corporate travel and expense reimbursement platform. Conceived, architected and built solo.',
    status: travel.status,
    stack: travel.stack,
    metrics: travel.metrics,
    details: travel.details,
    hint: 'Hover or tap a service to trace what it talks to.',
    indexLabel: 'Services',
    readoutSide: 'left',
    architecture: fromTravelDesk(),
  },
  {
    id: 'hrms',
    name: hrms.name,
    description: hrms.description,
    status: hrms.status,
    stack: hrms.stack,
    metrics: ['461-page PRD', '29 modules, up from 13 in the PRD','12+ vendors benchmarked', '~50,000 employees'],
    details: hrms.details.slice(0, 3),
    hint: 'Select a cluster to open it. Hover the core to trace the event flow.',
    indexLabel: 'Clusters and platform',
    readoutSide: 'right',
    architecture: hrmsArchitecture,
  },
  {
    id: 'cloud-commerce',
    name: commerce.name,
    description: commerce.description,
    status: commerce.status,
    stack: commerce.stack,
    metrics: commerce.metrics,
    details: commerce.details,
    hint: 'Hover or tap a service to trace its links through the mesh.',
    indexLabel: 'Services',
    readoutSide: 'left',
    architecture: cloudCommerceArchitecture,
  },
  {
    id: 'ai-to-com',
    name: 'AI To Com',
    description: 'Voice-agent platform for voice agents, chatbots and IVR journeys.',
    status: 'Scoping',
    stack: ['Voice agents', 'Chatbots', 'IVR', 'Local SLMs', 'OCR pipelines', 'RBAC'],
    metrics: ['3 channels: voice, chat, IVR', '8 platform components'],
    details: [
      'Scoped voice agents, chatbots and IVR journeys, bot configuration, conversation orchestration, RBAC, analytics and reporting, and third-party integrations.',
      'Started evaluating locally hosted small language models and OCR pipelines for lower inference cost, data privacy and less dependence on external LLM APIs.',
    ],
    hint: 'Hover or tap a component to follow the call or message through it.',
    indexLabel: 'Components',
    readoutSide: 'left',
    architecture: aiToComArchitecture,
  },
];

export const bayCopy = {
  heading: content.deployments.heading,
  lead: 'Four flagship platforms, scoped and built inside Paytm. Status is the real status. Every one has its own architecture: hover to trace it.',
  detailsLabel: content.deployments.detailsLabel,
  railLabel: 'Deployment bays',
  hudBay: 'Deployment bay',
  assembly: 'Assembly',
  connectsTo: 'Connects to',
  indexHeading: 'Component index',
  clusterGroup: 'Module clusters · 29 modules',
  loading3d: 'Bringing the system online',
  legend: {
    call: 'Request',
    flow: 'Flow',
    event: 'Event',
    return: 'Reply',
    control: 'Control',
    mesh: 'Mesh link',
    phase2: 'Phase 2 / evaluation',
    packet: 'Work in flight',
  },
} as const;
