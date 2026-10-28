/**
 * HRMS architecture model.
 * CONFIRMED by the owner (2026-10-29): a modular-monolith core (Postgres, schema-per-module, transactional outbox,
 * event bus) holding 29 modules, plus five satellite services: notifications, document generation, payroll adapter,
 * AI assistant, analytics.
 * ILLUSTRATIVE: the grouping of the 29 modules into seven clusters, the cluster counts (they sum to 29) and the module
 * names inside them. The résumé names only a few of them (Performance Management, Compensation Planning, the India
 * compliance set, the Configuration Engine); the rest are standard HRMS scope drawn so 29 reads as seven groups instead
 * of 29 equal boxes. The stage says so. Never name the incumbent HRIS vendor.
 */
import type { BayArchitecture, BayEdge, BayGroup, BayNode } from './bay-architecture.types';

const clusters: readonly BayGroup[] = [
  { id: 'core-hr', label: 'Core HR', summary: 'The employee record and everything that changes it.' },
  { id: 'talent-acq', label: 'Talent acquisition', summary: 'From open requisition to a signed, onboarded hire.' },
  { id: 'time', label: 'Time & attendance', summary: 'Where hours, shifts and leave are recorded.' },
  { id: 'payroll', label: 'Payroll & compliance', summary: 'India payroll with statutory compliance scoped end to end.' },
  { id: 'perf', label: 'Talent & performance', summary: 'Performance Management is the critical-path module for Compensation Planning.' },
  { id: 'experience', label: 'Employee experience', summary: 'What employees touch every day.' },
  { id: 'admin', label: 'Admin & config', summary: 'The configurable platform every module runs on.' },
];

const mod = (id: string, label: string, group: string, role: string): BayNode => ({ id, label, kind: 'module', role, group });

const modules: readonly BayNode[] = [
  mod('employee-master', 'Employee master', 'core-hr', 'Single employee record'),
  mod('org-positions', 'Org & positions', 'core-hr', 'Org structure and position management'),
  mod('lifecycle', 'Lifecycle events', 'core-hr', 'Transfers, promotions, status changes'),
  mod('documents', 'Documents', 'core-hr', 'Employee documents and letters'),
  mod('offboarding', 'Offboarding', 'core-hr', 'Exit workflow and full and final'),

  mod('requisitions', 'Requisitions', 'talent-acq', 'Headcount requests and approvals'),
  mod('candidates', 'Candidate tracking', 'talent-acq', 'Pipeline from application to offer'),
  mod('onboarding', 'Onboarding', 'talent-acq', 'Joining tasks and checklists'),

  mod('attendance', 'Attendance', 'time', 'Check-in, regularisation and muster'),
  mod('shifts', 'Shifts & rosters', 'time', 'Shift patterns and rosters'),
  mod('leave', 'Leave', 'time', 'Leave policies, balances and approvals'),
  mod('holidays', 'Holiday calendar', 'time', 'Location-wise holiday calendars'),

  mod('payroll-run', 'Payroll run', 'payroll', 'Monthly payroll processing'),
  mod('statutory', 'PF · ESI · PT · LWF', 'payroll', 'Statutory deductions and filings'),
  mod('tax', 'TDS & tax', 'payroll', 'Income-tax computation and declarations'),
  mod('gratuity', 'Gratuity', 'payroll', 'Gratuity computation and payout'),
  mod('labour-codes', 'Labour Codes & DPDP', 'payroll', 'Labour Codes and DPDP Act compliance'),

  mod('performance', 'Performance Management', 'perf', 'Review cycles; critical path for Compensation Planning'),
  mod('goals', 'Goals & OKRs', 'perf', 'Goal setting and tracking'),
  mod('compensation', 'Compensation Planning', 'perf', 'Compensation cycles, blocked by Performance Management'),
  mod('learning', 'Learning', 'perf', 'Courses and skills'),

  mod('self-service', 'Self-service', 'experience', 'Employee and manager self-service'),
  mod('helpdesk', 'HR helpdesk', 'experience', 'Tickets and answers for HR queries'),
  mod('engagement', 'Engagement', 'experience', 'Surveys and recognition'),

  mod('config-engine', 'Configuration Engine', 'admin', 'Configure fields, rules and screens without code'),
  mod('workflow', 'Workflow engine', 'admin', 'Approval chains across modules'),
  mod('access', 'Roles & access', 'admin', 'Role-based access control'),
  mod('audit', 'Audit trail', 'admin', 'Who changed what, when'),
  mod('tenant-settings', 'Tenant settings', 'admin', 'Multi-tenant settings for productising beyond Paytm'),
];

const platform: readonly BayNode[] = [
  { id: 'postgres', label: 'Postgres · schema per module', kind: 'store', group: 'core', role: 'One database, one schema per module: boundaries stay clean inside the monolith' },
  { id: 'outbox', label: 'Transactional outbox', kind: 'outbox', group: 'core', role: 'Events are written in the same transaction as the data, then relayed' },
  { id: 'bus', label: 'Event bus', kind: 'bus', group: 'core', role: 'Carries outbox events to the satellite services' },
  { id: 'notifications', label: 'Notifications', kind: 'satellite', group: 'satellites', role: 'Satellite service: email and in-app notifications' },
  { id: 'doc-gen', label: 'Document generation', kind: 'satellite', group: 'satellites', role: 'Satellite service: letters, payslips and certificates' },
  { id: 'payroll-adapter', label: 'Payroll adapter', kind: 'satellite', group: 'satellites', role: 'Satellite service: adapter to the payroll vendor' },
  { id: 'ai-assistant', label: 'AI assistant', kind: 'satellite', group: 'satellites', role: 'Satellite service: assistant for employees and HR' },
  { id: 'analytics', label: 'Analytics', kind: 'satellite', group: 'satellites', role: 'Satellite service: reporting and analytics' },
  { id: 'payroll-vendor', label: 'Payroll vendor', kind: 'external', group: 'satellites', role: 'External payroll vendor behind the adapter' },
];

const edges: readonly BayEdge[] = [
  ...clusters.map((g): BayEdge => ({ from: g.id, to: 'postgres', kind: 'call' })),
  { from: 'postgres', to: 'outbox', kind: 'event' },
  { from: 'outbox', to: 'bus', kind: 'event' },
  { from: 'bus', to: 'notifications', kind: 'event' },
  { from: 'bus', to: 'doc-gen', kind: 'event' },
  { from: 'bus', to: 'payroll-adapter', kind: 'event' },
  { from: 'bus', to: 'ai-assistant', kind: 'event' },
  { from: 'bus', to: 'analytics', kind: 'event' },
  { from: 'payroll-adapter', to: 'payroll-vendor', kind: 'call' },
];

export const hrmsArchitecture: BayArchitecture = {
  id: 'hrms',
  fidelity: '29 modules + 5 satellites confirmed · cluster grouping illustrative',
  groups: [
    ...clusters,
    { id: 'core', label: 'Core platform', summary: 'Postgres, the transactional outbox and the event bus.' },
    { id: 'satellites', label: 'Satellite services', summary: 'Five services outside the monolith, fed by the event bus.' },
  ],
  nodes: [...modules, ...platform],
  edges,
};

/** Cluster ids, in layout order. */
export const hrmsClusterIds: readonly string[] = clusters.map((g) => g.id);
