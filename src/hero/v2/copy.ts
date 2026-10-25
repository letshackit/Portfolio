import { content } from '../../data/content';
import type { StreamLine } from './stream';

/** Hero-only strings. Everything numeric is read from content.ts so the figures on screen are the real ones. */
export const TAGLINE_A = 'Forward-deployed.';
export const TAGLINE_B = 'I build what I spec.';
export const CAPTION = 'TRAVELDESK · 18 SERVICES · BUILT SOLO';
export const SERVICE_COUNT = 18;
export const AGENT_COUNT = 6;

const [firstName, lastName] = content.meta.name.split(' ');
export { firstName, lastName };

/** The eyebrow without the "BUILDER-PM ·" lead-in: the hero states only the ask. */
export const EYEBROW = content.hero.eyebrow.replace(/^[^·]*·\s*/, '');

const stage = (id: string) => content.howIWork.stages.find((s) => s.id === id);
const num = (id: string, i = 0) => stage(id)?.numbers[i]?.value ?? '';

/** The agent console: research folds in here, then the pipeline runs through to deploy. */
export const CONSOLE_LINES: readonly StreamLine[] = [
  { tag: 'research', text: `market study: ${num('research')} vendors` },
  { tag: 'prd', text: `TravelDesk, ${num('prd')} pages` },
  { tag: 'jira', text: `${num('jira-confluence', 0)} stories into ${num('jira-confluence', 1)}, ${num('jira-confluence', 2)} epics` },
  { tag: 'prototype', text: `${num('prototype')} modules in ${num('prototype', 1)} months, node.js` },
  { tag: 'qa', text: 'TravelDesk in organisational UAT', ok: true },
  { tag: 'deploy', text: `Paytm telco SaaS, ${num('deploy')} engineers led`, ok: true },
];

/** The DEPLOY pane (stage 07 of 07): the gates, each closing with a check. */
export const DEPLOY_LINES: readonly StreamLine[] = [
  { tag: 'release', text: 'traveldesk to UAT' },
  { tag: 'build', text: `${SERVICE_COUNT} microservices`, ok: true },
  { tag: 'qa', text: 'coverage gate', ok: true },
  { tag: 'infosec', text: 'review gate', ok: true },
  { tag: 'uat', text: 'organisational UAT', ok: true },
  { tag: 'deploy', text: 'MVP, built solo', ok: true },
  { tag: 'team', text: '6 engineers handed off', ok: true },
  { tag: 'bss', text: '~60% built personally', ok: true },
  { tag: 'bss', text: 'team hired, onboarded', ok: true },
  { tag: 'cloud', text: 'prototype delivered', ok: true },
  { tag: 'phase1', text: 'rollout targeted Jan 2027' },
  { tag: 'hrms', text: 'scoping, 50,000 employees' },
];

/** The same lines as plain text for assistive tech: the animated rows are aria-hidden. */
export const lineToText = (l: StreamLine): string => `${l.tag}: ${l.text}${l.ok ? ', passed' : ''}`;

export const SATELLITES = ['HRIS', 'TRAVEL VENDOR', 'SAP'] as const;
