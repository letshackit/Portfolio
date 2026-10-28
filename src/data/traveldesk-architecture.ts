/**
 * TravelDesk architecture model.
 * STATUS: CONFIRMED (owner, 2026-10-29): the 16 domain-service names below are the owner-approved decomposition.
 * The edges are the wiring drawn for the diagram; the résumé does not specify them service by service.
 * Never add a label that names the HRIS vendor (FR-83).
 */
import type { ArchEdge, ArchNode, ArchitectureModel } from './content.types';

const nodes: readonly ArchNode[] = [
  { id: 'frontend', label: 'Next.js front end', kind: 'frontend', role: 'Web application for employees, approvers and admins' },
  { id: 'gateway', label: 'Spring Boot API gateway', kind: 'gateway', role: 'Single entry point that routes requests to the domain services' },

  { id: 'travel-request', label: 'Travel request', kind: 'domain', role: 'Creates and tracks travel requests for employees' },
  { id: 'approval', label: 'Approval workflow', kind: 'domain', role: 'Routes requests and claims through multi-level approvals' },
  { id: 'booking', label: 'Booking coordination', kind: 'domain', role: 'Coordinates bookings against approved requests' },
  { id: 'expense', label: 'Expense claims', kind: 'domain', role: 'Captures and manages expense claims' },
  { id: 'ocr', label: 'Receipt capture & OCR', kind: 'domain', role: 'Extracts receipt data from uploaded images' },
  { id: 'policy', label: 'Policy validation', kind: 'domain', role: 'Validates requests and claims against travel policy' },
  { id: 'reimbursement', label: 'Reimbursement workflow', kind: 'domain', role: 'Runs the reimbursement process after approval' },
  { id: 'notification', label: 'Notifications', kind: 'domain', role: 'Sends email and in-app notifications on workflow events' },
  { id: 'identity', label: 'Identity & access', kind: 'domain', role: 'Authentication and role-based access' },
  { id: 'tenant', label: 'Tenant management', kind: 'domain', role: 'Tenant provisioning and isolation' },
  { id: 'employee', label: 'Employee directory', kind: 'domain', role: 'Employee, manager and cost-centre data for routing' },
  { id: 'hris-adapter', label: 'HRIS adapter', kind: 'domain', role: 'Syncs employee data from the enterprise HRIS' },
  { id: 'vendor-adapter', label: 'Travel vendor adapter', kind: 'domain', role: 'Exchanges bookings with the corporate travel vendor' },
  { id: 'sap-adapter', label: 'SAP finance adapter', kind: 'domain', role: 'Posts approved reimbursements to SAP' },
  { id: 'admin', label: 'Admin & configuration', kind: 'domain', role: 'Policies, approval chains, tenant settings' },
  { id: 'audit', label: 'Audit & reporting', kind: 'domain', role: 'Audit trail and reporting across tenants' },

  { id: 'hris', label: 'Enterprise HRIS', kind: 'integration', role: 'Employee master data source' },
  { id: 'quest2travel', label: 'Quest2Travel', kind: 'integration', role: 'Corporate travel vendor' },
  { id: 'sap', label: 'SAP', kind: 'integration', role: 'Finance system that receives approved reimbursements' },
  { id: 'ebix', label: 'EBIX forex', kind: 'integration-phase2', role: 'Phase 2: forex integration' },
  { id: 'recharge', label: 'Recharge', kind: 'integration-phase2', role: 'Phase 2: recharge integration' },
];

const domainIds = nodes.filter((n) => n.kind === 'domain').map((n) => n.id);

const edges: readonly ArchEdge[] = [
  { from: 'frontend', to: 'gateway', kind: 'call' },
  ...domainIds.map((id): ArchEdge => ({ from: 'gateway', to: id, kind: 'call' })),
  { from: 'travel-request', to: 'approval', kind: 'call' },
  { from: 'approval', to: 'booking', kind: 'call' },
  { from: 'booking', to: 'vendor-adapter', kind: 'call' },
  { from: 'vendor-adapter', to: 'quest2travel', kind: 'call' },
  { from: 'expense', to: 'ocr', kind: 'call' },
  { from: 'ocr', to: 'policy', kind: 'call' },
  { from: 'policy', to: 'approval', kind: 'call' },
  { from: 'approval', to: 'reimbursement', kind: 'call' },
  { from: 'reimbursement', to: 'sap-adapter', kind: 'call' },
  { from: 'sap-adapter', to: 'sap', kind: 'call' },
  { from: 'identity', to: 'employee', kind: 'call' },
  { from: 'employee', to: 'hris-adapter', kind: 'call' },
  { from: 'hris-adapter', to: 'hris', kind: 'call' },
  { from: 'tenant', to: 'admin', kind: 'call' },
  { from: 'reimbursement', to: 'notification', kind: 'event' },
  { from: 'admin', to: 'audit', kind: 'event' },
  { from: 'reimbursement', to: 'audit', kind: 'event' },
  { from: 'gateway', to: 'ebix', kind: 'phase2' },
  { from: 'gateway', to: 'recharge', kind: 'phase2' },
];

export const travelDeskArchitecture: ArchitectureModel = {
  status: 'confirmed',
  groups: [
    { id: 'frontend', label: 'Front end', kinds: ['frontend'] },
    { id: 'gateway', label: 'Gateway', kinds: ['gateway'] },
    { id: 'domain', label: 'Domain services', kinds: ['domain'] },
    { id: 'integrations', label: 'Integrations', kinds: ['integration', 'integration-phase2'] },
  ],
  nodes,
  edges,
};
