/**
 * AI To Com architecture model: a voice-agent platform (voice agents, chatbots, IVR).
 * CONFIRMED (owner, 2026-10-29): voice gateway, ASR/TTS, NLU/LLM, dialog orchestrator, channel adapters
 * (voice / chat / IVR), bot-config studio, analytics, RBAC/admin, plus the on-prem SLM and OCR evaluation.
 * ILLUSTRATIVE: the exact hop order of a call and which component feeds which.
 */
import type { BayArchitecture, BayEdge, BayNode } from './bay-architecture.types';

const nodes: readonly BayNode[] = [
  { id: 'voice', label: 'Voice channel adapter', kind: 'channel', group: 'channels', role: 'Brings voice calls into the platform' },
  { id: 'ivr', label: 'IVR channel adapter', kind: 'channel', group: 'channels', role: 'Brings IVR journeys into the platform' },
  { id: 'chat', label: 'Chat channel adapter', kind: 'channel', group: 'channels', role: 'Brings chatbot messages into the platform' },
  { id: 'gateway', label: 'Voice gateway', kind: 'pipeline', group: 'runtime', role: 'Terminates calls and streams audio' },
  { id: 'asr-tts', label: 'ASR / TTS', kind: 'pipeline', group: 'runtime', role: 'Speech to text in, text to speech out' },
  { id: 'nlu', label: 'NLU / LLM', kind: 'pipeline', group: 'runtime', role: 'Understands intent and drafts the reply' },
  { id: 'orchestrator', label: 'Dialog orchestrator', kind: 'orchestrator', group: 'runtime', role: 'Runs the conversation across every channel' },
  { id: 'bot-config', label: 'Bot-config studio', kind: 'control', group: 'control', role: 'Where bots, flows and prompts are configured' },
  { id: 'analytics', label: 'Analytics', kind: 'control', group: 'control', role: 'Conversation analytics and reporting' },
  { id: 'rbac', label: 'RBAC / admin', kind: 'control', group: 'control', role: 'Roles, access and administration' },
  { id: 'slm', label: 'On-prem SLM', kind: 'eval', group: 'eval', role: 'Evaluation: locally hosted small language models for cost, privacy and less dependence on external LLM APIs' },
  { id: 'ocr', label: 'OCR evaluation', kind: 'eval', group: 'eval', role: 'Evaluation: locally hosted OCR pipelines' },
];

const edges: readonly BayEdge[] = [
  { from: 'voice', to: 'gateway', kind: 'flow' },
  { from: 'ivr', to: 'gateway', kind: 'flow' },
  { from: 'gateway', to: 'asr-tts', kind: 'flow' },
  { from: 'asr-tts', to: 'nlu', kind: 'flow' },
  { from: 'nlu', to: 'orchestrator', kind: 'flow' },
  { from: 'chat', to: 'orchestrator', kind: 'flow' },
  { from: 'orchestrator', to: 'asr-tts', kind: 'return' },
  { from: 'asr-tts', to: 'gateway', kind: 'return' },
  { from: 'gateway', to: 'voice', kind: 'return' },
  { from: 'gateway', to: 'ivr', kind: 'return' },
  { from: 'orchestrator', to: 'chat', kind: 'return' },
  { from: 'bot-config', to: 'orchestrator', kind: 'control' },
  { from: 'orchestrator', to: 'analytics', kind: 'event' },
  { from: 'rbac', to: 'bot-config', kind: 'control' },
  { from: 'rbac', to: 'gateway', kind: 'control' },
  { from: 'nlu', to: 'slm', kind: 'phase2' },
  { from: 'orchestrator', to: 'ocr', kind: 'phase2' },
];

export const aiToComArchitecture: BayArchitecture = {
  id: 'ai-to-com',
  fidelity: 'Components confirmed · call flow illustrative',
  groups: [
    { id: 'channels', label: 'Channels', summary: 'Voice, chat and IVR come in through channel adapters.' },
    { id: 'runtime', label: 'Conversation runtime', summary: 'Gateway, speech, language model and the orchestrator that runs the dialog.' },
    { id: 'control', label: 'Control plane', summary: 'Configuration, analytics and access control sit beside the runtime.' },
    { id: 'eval', label: 'Local model evaluation', summary: 'On-prem SLM and OCR pipelines under evaluation.' },
  ],
  nodes,
  edges,
};
