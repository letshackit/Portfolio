/**
 * Cloud Commerce architecture model: a SaaS prototype for SAP-to-cloud migration.
 * CONFIRMED (résumé + owner, 2026-10-29): eight modules/services (Dashboard, Orders, Products, Channels, Logs,
 * Promotion, Payment Gateway, Settings), 100+ APIs scoped, SAP on the source side and the cloud on the target side.
 * ILLUSTRATIVE: the order of the services around the core and the mesh links between them.
 */
import type { BayArchitecture, BayEdge, BayNode } from './bay-architecture.types';

const svc = (id: string, label: string, role: string): BayNode => ({ id, label, kind: 'service', role, group: 'mesh' });

/** In ring order, clockwise from the top. */
export const cloudCommerceServiceIds = ['dashboard', 'orders', 'products', 'channels', 'promotion', 'payment-gateway', 'settings', 'logs'] as const;

const services: readonly BayNode[] = [
  svc('dashboard', 'Dashboard', 'Operational overview for the commerce team'),
  svc('orders', 'Orders', 'Order capture and lifecycle'),
  svc('products', 'Products', 'Product catalogue and pricing data'),
  svc('channels', 'Channels', 'Sales channels and their connections'),
  svc('promotion', 'Promotion', 'Promotions and offers'),
  svc('payment-gateway', 'Payment Gateway', 'Payment integration and reconciliation'),
  svc('settings', 'Settings', 'Platform and tenant settings'),
  svc('logs', 'Logs', 'Audit and integration logs'),
];

const nodes: readonly BayNode[] = [
  { id: 'sap', label: 'SAP', kind: 'legacy', group: 'source', role: 'Source system: where the commerce data lives today' },
  { id: 'core', label: 'Commerce core', kind: 'core', group: 'mesh', role: '100+ APIs scoped across the eight services' },
  ...services,
  { id: 'cloud', label: 'Cloud', kind: 'cloud', group: 'target', role: 'Target: the commerce platform running in the cloud' },
];

const ring: readonly BayEdge[] = cloudCommerceServiceIds.map(
  (id, i): BayEdge => ({
    from: id,
    to: cloudCommerceServiceIds[(i + 1) % cloudCommerceServiceIds.length] as string,
    kind: 'mesh',
  }),
);

const edges: readonly BayEdge[] = [
  { from: 'sap', to: 'core', kind: 'flow' },
  ...cloudCommerceServiceIds.map((id): BayEdge => ({ from: 'core', to: id, kind: 'call' })),
  ...ring,
  { from: 'core', to: 'cloud', kind: 'flow' },
];

export const cloudCommerceArchitecture: BayArchitecture = {
  id: 'cloud-commerce',
  fidelity: '8 services confirmed · mesh wiring illustrative',
  groups: [
    { id: 'source', label: 'Source', summary: 'SAP, where the migration starts.' },
    { id: 'mesh', label: 'Service mesh', summary: 'Eight services around one core, 100+ APIs scoped.' },
    { id: 'target', label: 'Target', summary: 'The cloud, where it lands.' },
  ],
  nodes,
  edges,
};
