/**
 * AI To Com: the path of a call or a message. Channel adapters feed the voice gateway, then ASR/TTS, then NLU/LLM, then
 * the dialog orchestrator, and the reply travels back out on a second lane. Configuration, analytics and RBAC sit on a
 * control plane behind the runtime; the on-prem SLM and OCR evaluation hang below, dashed. On a phone the path runs
 * top to bottom with the control plane in a column beside it.
 */
import type { BayArchitecture } from '../../../data/bay-architecture.types';
import { extentOf, makeNode, type SceneNode, type ScenePlate, type SceneRoute, type SceneSpec, type Vec3 } from '../spec';
import { edgeId, type LayoutOptions } from './common';

const SHORT: Readonly<Record<string, string>> = { voice: 'Voice', ivr: 'IVR', chat: 'Chat' };

const elbow = (a: Vec3, b: Vec3, mx: number): Vec3[] => [a, [mx, a[1], a[2]], [mx, b[1], b[2]], b];

export function aiToComLayout(arch: BayArchitecture, { portrait }: LayoutOptions): SceneSpec {
  const nodes: SceneNode[] = [];
  const plates: ScenePlate[] = [];
  const at = new Map<string, SceneNode>();
  let index = 0;
  const add = (n: Parameters<typeof makeNode>[0]) => {
    const node = makeNode(n, index);
    index += 1;
    nodes.push(node);
    at.set(node.id, node);
    return node;
  };

  const P: Readonly<Record<string, Vec3>> = portrait
    ? {
        voice: [-2.3, 6.3, 0],
        ivr: [0, 6.3, 0],
        chat: [2.3, 6.3, 0],
        gateway: [-1.15, 4.7, 0],
        'asr-tts': [-1.15, 3.5, 0],
        nlu: [-1.15, 2.3, 0],
        orchestrator: [-0.4, 0.2, 0],
        rbac: [2.55, 4.7, -0.9],
        'bot-config': [2.55, 3.5, -0.9],
        analytics: [2.55, 2.3, -0.9],
        slm: [-1.75, -2.4, -0.3],
        ocr: [1.75, -2.4, -0.3],
      }
    : {
        voice: [-6.4, 1.3, 0],
        ivr: [-6.4, 0.2, 0],
        chat: [-6.4, -1.3, 0],
        gateway: [-3.5, 0.75, 0],
        'asr-tts': [-0.6, 0.75, 0],
        nlu: [2.3, 0.75, 0],
        orchestrator: [5.6, 0.2, 0],
        rbac: [-3.5, 3.4, -1.0],
        'bot-config': [2.3, 3.4, -1.0],
        analytics: [6.0, 3.4, -1.0],
        slm: [2.3, -3.4, -0.3],
        ocr: [6.2, -3.4, -0.3],
      };

  const chanSize: Vec3 = portrait ? [1.96, 0.7, 0.3] : [1.7, 0.7, 0.3];
  const pipeSize: Vec3 = portrait ? [2.15, 0.82, 0.4] : [1.9, 0.9, 0.4];
  const ctlSize: Vec3 = portrait ? [1.75, 0.76, 0.3] : [1.9, 0.7, 0.3];
  const order: Readonly<Record<string, number>> = { voice: 0, ivr: 0.03, chat: 0.06, gateway: 0.15, 'asr-tts': 0.25, nlu: 0.35, orchestrator: 0.45, rbac: 0.6, 'bot-config': 0.65, analytics: 0.7, slm: 0.85, ocr: 0.9 };

  for (const n of arch.nodes) {
    const p = P[n.id];
    if (!p) continue;
    const isOrch = n.id === 'orchestrator';
    const isChan = n.kind === 'channel';
    add({
      id: n.id,
      label: isChan ? (SHORT[n.id] ?? n.label) : n.label,
      sub: isChan ? 'ADAPTER' : n.kind === 'eval' ? 'EVALUATION' : undefined,
      kind: n.kind,
      shape: isOrch ? 'oct' : 'slab',
      pos: p,
      size: isOrch ? (portrait ? [2.9, 2.0, 1.3] : [2.5, 2.2, 1.3]) : isChan ? chanSize : n.kind === 'pipeline' ? pipeSize : ctlSize,
      tone: isOrch ? 'core' : n.kind === 'eval' ? 'soft' : 'cyan',
      ghost: n.kind === 'eval',
      labelSize: isOrch ? 0.2 : isChan ? 0.19 : n.kind === 'pipeline' ? 0.18 : 0.16,
      labelAt: isOrch ? [0, 0, 0.72] : undefined,
      labelBox: isOrch ? [2.4, 0.9] : undefined,
      plate: isOrch || undefined,
      group: n.group,
      order: order[n.id] ?? 0.5,
    });
  }

  const g = (id: string) => at.get(id) as SceneNode;
  const R = (id: string, dy = 0): Vec3 => [g(id).pos[0] + g(id).size[0] / 2, g(id).pos[1] + dy, g(id).pos[2]];
  const L = (id: string, dy = 0): Vec3 => [g(id).pos[0] - g(id).size[0] / 2, g(id).pos[1] + dy, g(id).pos[2]];
  const T = (id: string, dx = 0): Vec3 => [g(id).pos[0] + dx, g(id).pos[1] + g(id).size[1] / 2, g(id).pos[2]];
  const B = (id: string, dx = 0): Vec3 => [g(id).pos[0] + dx, g(id).pos[1] - g(id).size[1] / 2, g(id).pos[2]];

  const pts: Record<string, readonly Vec3[]> = {};
  if (!portrait) {
    pts['voice->gateway'] = elbow(R('voice', 0.17), L('gateway', 0.3), -5.0);
    pts['gateway->voice'] = elbow(L('gateway', 0.15), R('voice', -0.12), -4.8);
    pts['ivr->gateway'] = elbow(R('ivr', 0.17), L('gateway', -0.12), -5.1);
    pts['gateway->ivr'] = elbow(L('gateway', -0.3), R('ivr', -0.15), -4.75);
    pts['gateway->asr-tts'] = [R('gateway'), L('asr-tts')];
    pts['asr-tts->nlu'] = [R('asr-tts'), L('nlu')];
    pts['nlu->orchestrator'] = [R('nlu'), [4.55, 0.45, 0]];
    pts['chat->orchestrator'] = [R('chat', 0.15), [5.75, -1.15, 0], [5.75, -0.92, 0]];
    pts['orchestrator->chat'] = [[5.15, -0.82, 0], [5.15, -1.45, 0], R('chat', -0.15)];
    pts['orchestrator->asr-tts'] = [[4.7, -0.3, 0], [-0.6, -0.3, 0], B('asr-tts')];
    pts['asr-tts->gateway'] = [B('asr-tts', -0.5), [-1.1, -0.55, 0], [-3.5, -0.55, 0], B('gateway')];
    pts['rbac->gateway'] = [B('rbac'), T('gateway')];
    pts['rbac->bot-config'] = [R('rbac'), L('bot-config')];
    pts['bot-config->orchestrator'] = [B('bot-config'), [2.3, 2.1, -0.4], [5.2, 2.1, 0], [5.2, 1.0, 0]];
    pts['orchestrator->analytics'] = [[6.0, 1.05, 0], [6.0, 2.0, -0.5], B('analytics')];
    pts['nlu->slm'] = [B('nlu'), T('slm')];
    pts['orchestrator->ocr'] = [[6.3, -0.55, 0], T('ocr')];
  } else {
    pts['voice->gateway'] = [B('voice', 0.15), [-2.15, 5.45, 0], [-1.3, 5.45, 0], T('gateway', -0.15)];
    pts['gateway->voice'] = [T('gateway', -0.6), [-1.75, 5.35, 0], [-1.75, 5.5, 0], B('voice', -0.3)];
    pts['ivr->gateway'] = [B('ivr', -0.1), [-0.1, 5.25, 0], [-0.9, 5.25, 0], T('gateway', 0.3)];
    pts['gateway->ivr'] = [R('gateway', 0.2), [0.35, 4.9, 0], [0.35, 5.8, 0], B('ivr', 0.35)];
    pts['gateway->asr-tts'] = [B('gateway', 0.2), T('asr-tts', 0.2)];
    pts['asr-tts->nlu'] = [B('asr-tts', 0.2), T('nlu', 0.2)];
    pts['nlu->orchestrator'] = [B('nlu', 0.2), [-0.95, 1.6, 0], [-0.95, 1.2, 0]];
    pts['chat->orchestrator'] = [B('chat'), [2.3, 5.4, 0], [0.95, 5.4, 0], [0.95, 0.8, 0], [0.7, 0.75, 0]];
    pts['orchestrator->chat'] = [[1.15, 0.45, 0], [1.4, 0.45, 0], [1.4, 5.55, 0], [2.0, 5.55, 0], B('chat', -0.3)];
    pts['orchestrator->asr-tts'] = [[-1.5, 0.45, 0], [-2.5, 0.45, 0], [-2.5, 3.5, 0], L('asr-tts')];
    pts['asr-tts->gateway'] = [L('asr-tts', 0.25), [-2.7, 3.75, 0], [-2.7, 4.7, 0], L('gateway')];
    pts['rbac->gateway'] = [L('rbac'), [1.45, 4.7, -0.5], R('gateway')];
    pts['rbac->bot-config'] = [B('rbac'), T('bot-config')];
    pts['bot-config->orchestrator'] = [B('bot-config', -0.4), [2.15, 3.0, -0.5], [2.15, 1.2, -0.2], [0.9, 0.5, 0]];
    pts['orchestrator->analytics'] = [[1.1, 0.0, 0], [3.0, 0.0, -0.3], [3.0, 1.9, -0.9], B('analytics', 0.5)];
    pts['nlu->slm'] = [[-2.0, 2.3, 0], [-2.0, 1.6, 0], [-2.0, -1.9, -0.3]];
    pts['orchestrator->ocr'] = [B('orchestrator', 0.5), T('ocr')];
  }

  const routes: SceneRoute[] = arch.edges.map((e) => {
    const id = edgeId(e);
    const p = pts[id];
    if (!p) throw new Error(`aiToCom layout: no route for ${id}`);
    return { id, from: e.from, to: e.to, kind: e.kind, points: p, backplane: false, packets: e.kind === 'flow' || e.kind === 'return' || e.kind === 'event' };
  });

  if (portrait) {
    plates.push({ id: 'plane-runtime', label: 'RUNTIME', pos: [-0.8, 3.15, -0.5], size: [5.4, 4.5], plane: 'xy', tone: 'cyan' });
    plates.push({ id: 'plane-control', label: 'CONTROL', pos: [2.55, 3.5, -1.2], size: [2.1, 3.8], plane: 'xy', tone: 'cyan' });
    plates.push({ id: 'plane-eval', label: 'LOCAL EVAL', pos: [0, -2.4, -0.6], size: [5.8, 1.3], plane: 'xy', tone: 'soft' });
  } else {
    plates.push({ id: 'plane-runtime', label: 'CONVERSATION RUNTIME', pos: [-0.4, 0.2, -0.5], size: [14.6, 4.0], plane: 'xy', tone: 'cyan' });
    plates.push({ id: 'plane-control', label: 'CONTROL PLANE', pos: [1.25, 3.4, -1.15], size: [11.2, 1.25], plane: 'xy', tone: 'cyan' });
    plates.push({ id: 'plane-eval', label: 'LOCAL MODEL EVALUATION', pos: [4.25, -3.4, -0.55], size: [6.4, 1.25], plane: 'xy', tone: 'soft' });
  }

  const extent = extentOf(nodes, plates, routes);
  return {
    id: arch.id,
    nodes,
    routes,
    plates,
    extent: portrait ? extent : { ...extent, minX: Math.min(extent.minX, -8.7) },
    rot: { x: 0.2, y: -0.2 },
    startIds: ['voice', 'ivr', 'chat'],
    decor: portrait ? [] : ['wave'],
    clusters: [],
    initialOpen: null,
    legend: ['flow', 'return', 'control', 'event', 'phase2'],
  };
}
