import { useState } from 'react';
import { content } from '../data/content';
import type { ArchGroup, ArchitectureModel } from '../data/content.types';
import { Icon } from '../ui/Icon';

function connectionsOf(model: ArchitectureModel, nodeId: string): readonly string[] {
  const labelOf = new Map(model.nodes.map((n) => [n.id, n.label] as const));
  const ids = new Set<string>();
  for (const edge of model.edges) {
    if (edge.from === nodeId) ids.add(edge.to);
    if (edge.to === nodeId) ids.add(edge.from);
  }
  return [...ids].map((id) => labelOf.get(id)).filter((l): l is string => l !== undefined);
}

/** Grouped list of every node, present in the DOM at every width (FR-88); activating one lists what it connects to (FR-89). */
export function ArchNodeList({ model }: { readonly model: ArchitectureModel }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const nodesIn = (group: ArchGroup) => model.nodes.filter((n) => group.kinds.includes(n.kind));

  return (
    <div className="arch-groups" aria-label={content.ui.archGroupsLabel} role="group">
      {model.groups.map((group) => (
        <section className="arch-group" key={group.id} aria-labelledby={`arch-group-${group.id}`}>
          <h3 id={`arch-group-${group.id}`} className="arch-group__name mono-label">
            {group.label}
          </h3>
          <ul className="arch-group__list">
            {nodesIn(group).map((node) => {
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
                      {connectionsOf(model, node.id).map((label) => (
                        <li key={label}>{label}</li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
