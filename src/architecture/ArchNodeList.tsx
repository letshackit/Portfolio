import { useState } from 'react';
import { content } from '../data/content';
import type { ArchGroup, ArchitectureModel, ArchNode } from '../data/content.types';
import { connectionLabels } from '../lib/archLayout';
import { Icon } from '../ui/Icon';
import { archCopy } from './archCopy';
import type { ArchSelection } from './useArchSelection';

export interface NodeRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface Props {
  readonly model: ArchitectureModel;
  /** True on wide screens: buttons sit over their drawn node (SVG box or 3D block). False: stacked, expandable list. */
  readonly wide: boolean;
  /** Where a node is drawn, in percent of the frame. Only read when `wide`. */
  readonly rectOf: (id: string) => NodeRect | undefined;
  readonly selection: ArchSelection;
  readonly nodeState: (id: string) => 'idle' | 'on' | 'dim';
}

/**
 * Grouped list of every node, always in the DOM (FR-88, FR-89). Source order is the keyboard order:
 * front end, gateway, domain services, integrations (FR-86). On wide screens the group wrappers
 * vanish from layout and each button sits over its SVG box; below 768 px it is a stacked accordion.
 */
export function ArchNodeList({ model, wide, rectOf, selection, nodeState }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const nodesIn = (group: ArchGroup) => model.nodes.filter((n) => group.kinds.includes(n.kind));

  const renderNode = (node: ArchNode) => {
    const links = connectionLabels(model, node.id);
    const descId = `arch-desc-${node.id}`;
    const box = wide ? rectOf(node.id) : undefined;
    const style = box
      ? { left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` }
      : undefined;

    if (wide) {
      return (
        <li key={node.id} className="arch-node" data-kind={node.kind} style={style}>
          <button
            type="button"
            className="arch-node__button"
            data-state={nodeState(node.id)}
            aria-pressed={selection.pinned === node.id}
            aria-describedby={descId}
            onPointerEnter={(e) => {
              if (e.pointerType !== 'touch') selection.enter(node.id);
            }}
            onPointerLeave={selection.leave}
            onFocus={() => selection.focus(node.id)}
            onBlur={selection.blur}
            onClick={() => selection.toggle(node.id)}
          >
            {node.label}
          </button>
          <span id={descId} className="visually-hidden">
            {`${archCopy.kindLabel[node.kind]}. ${node.role}. ${content.ui.connectsTo}: ${links.join(', ')}.`}
          </span>
        </li>
      );
    }

    const open = openId === node.id;
    const panelId = `arch-node-${node.id}`;
    return (
      <li key={node.id} className="arch-node" data-kind={node.kind}>
        <button
          type="button"
          className="arch-node__button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpenId(open ? null : node.id)}
        >
          <span className="arch-node__label">{node.label}</span>
          <Icon name="chevron-down" />
        </button>
        <div id={panelId} className="arch-node__panel" hidden={!open}>
          <p className="arch-node__role">{node.role}</p>
          <p className="mono-label">{content.ui.connectsTo}</p>
          <ul className="arch-node__links">
            {links.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      </li>
    );
  };

  return (
    <ol className="arch-groups" aria-label={content.ui.archGroupsLabel} data-wide={wide}>
      {model.groups.map((group) => {
        const nodes = nodesIn(group);
        return (
          <li className="arch-group" key={group.id}>
            <h3 id={`arch-group-${group.id}`} className="arch-group__name mono-label">
              {group.label}
              {group.kinds.includes('domain') ? ` (${nodes.length})` : ''}
            </h3>
            <ul className="arch-group__list" aria-labelledby={`arch-group-${group.id}`}>
              {nodes.map(renderNode)}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
