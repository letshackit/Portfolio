import type { CSSProperties } from 'react';
import { pointAtFraction, type PipelineLayout } from '../lib/pipelineLayout';
import './Pipeline.css';

/** Node and packet radii in viewBox units. */
const NODE_GLOW_R = 30;
const NODE_R = 22;
const PACKET_R = 5;
const PACKET_GLOW_R = 11;

/** Packets enter the path 2.25 s apart on a 9 s loop (architecture C.5). */
const PACKETS = [
  { id: 'a', delay: '0s', still: 0.2 },
  { id: 'b', delay: '-2.25s', still: 0.5 },
  { id: 'c', delay: '-4.5s', still: 0.8 },
  { id: 'd', delay: '-6.75s', still: null },
] as const;

interface PipelineSvgProps {
  readonly layout: PipelineLayout;
  /** Stage ids in pipeline order; used for stable keys and the data-stage hook. */
  readonly stageIds: readonly string[];
  readonly hoveredId: string | null;
}

/**
 * The drawn pipeline (FR-54..57). Decorative: the DOM overlay carries all text and interaction (ADR-006), so this is
 * aria-hidden with no text and no focusable parts. Packets travel by CSS offset-path; with reduced motion, or where
 * offset-path is missing, they rest at fixed points along the path.
 */
export function PipelineSvg({ layout, stageIds, hoveredId }: PipelineSvgProps) {
  const [w, h] = layout.viewBox;
  const offsetPath = `path('${layout.packetPath}')`;
  return (
    <svg
      className="pipeline-svg"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <g className="pipeline-svg__edges">
        {layout.edges.map((edge) => (
          <g key={`${stageIds[edge.from]}-${stageIds[edge.to]}`}>
            <path className="edge-glow" d={edge.d} />
            <path className="edge" d={edge.d} />
          </g>
        ))}
      </g>
      {/* Packets are drawn under the node discs so they pass behind the numbers */}
      <g className="pipeline-svg__packets">
        {PACKETS.map((p) => {
          const at = pointAtFraction(layout, p.still ?? 0);
          const style = {
            offsetPath,
            animationDelay: p.delay,
            '--still': `${(p.still ?? 0) * 100}%`,
            '--fx': `${at.x}px`,
            '--fy': `${at.y}px`,
          } as CSSProperties;
          return (
            <g key={p.id} className="packet-group" data-extra={p.still === null || undefined}>
              <circle className="packet-glow" r={PACKET_GLOW_R} style={style} />
              <circle className="packet" r={PACKET_R} style={style} />
            </g>
          );
        })}
      </g>
      <g className="pipeline-svg__nodes">
        {layout.nodes.map((n, i) => (
          <g key={stageIds[i]} className={`node${stageIds[i] === hoveredId ? ' is-hover' : ''}`} data-stage={i}>
            <circle className="node-glow" cx={n.x} cy={n.y} r={NODE_GLOW_R} />
            <circle className="node-disc" cx={n.x} cy={n.y} r={NODE_R} />
            <circle className="node-ring" cx={n.x} cy={n.y} r={NODE_R} />
          </g>
        ))}
      </g>
    </svg>
  );
}
