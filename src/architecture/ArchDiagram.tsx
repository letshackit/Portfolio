import { useMemo, type KeyboardEvent } from 'react';
import type { ArchNodeKind, ArchitectureModel } from '../data/content.types';
import { layoutArch, highlightFor, BOX_H, BOX_W, type ArchOrientation } from '../lib/archLayout';
import { usePrefs } from '../app/providers/prefsContext';
import { archCopy } from './archCopy';
import { ArchNodeList } from './ArchNodeList';
import type { ArchSelection } from './useArchSelection';

const RX = 6;

interface Props {
  readonly model: ArchitectureModel;
  readonly selection: ArchSelection;
}

/**
 * Frame holding the decorative SVG (wide only) and the always-present node list that doubles as
 * the interaction and accessibility layer (ADR-006). Below 768 px there is no SVG (FR-88).
 */
export function ArchDiagram({ model, selection }: Props) {
  const { isWide, isDesktop } = usePrefs();
  const orientation: ArchOrientation | null = isDesktop ? 'horizontal' : isWide ? 'vertical' : null;
  const layout = useMemo(() => (orientation ? layoutArch(model, orientation) : null), [model, orientation]);
  const lit = useMemo(
    () => (selection.active ? highlightFor(model, selection.active) : null),
    [model, selection.active],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') selection.clear();
  };

  const nodeState = (id: string) => (lit ? (lit.nodes.has(id) ? 'on' : 'dim') : 'idle');
  const edgeState = (id: string) => (lit ? (lit.edges.has(id) ? 'on' : 'dim') : 'idle');
  const busState = lit ? (lit.bus ? 'on' : 'dim') : 'idle';

  const style = layout ? { aspectRatio: `${layout.viewBox[0]} / ${layout.viewBox[1]}` } : undefined;

  return (
    // Escape handling is a convenience on top of the buttons inside; the frame itself is not interactive.
    <div
      className="arch-frame corner-ticks"
      data-mode={layout ? 'diagram' : 'list'}
      data-orientation={orientation ?? undefined}
      style={style}
      onKeyDown={onKeyDown}
    >
      {layout ? (
        <svg
          className="arch-svg"
          viewBox={`0 0 ${layout.viewBox[0]} ${layout.viewBox[1]}`}
          aria-hidden="true"
          focusable="false"
        >
          <rect
            className="arch-svg__bg"
            width={layout.viewBox[0]}
            height={layout.viewBox[1]}
            onPointerDown={selection.clear}
          />
          <g className="arch-bus" data-state={busState}>
            {[layout.bus.trunk, layout.bus.spine, ...layout.bus.rows].map((s, i) => (
              <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
            ))}
          </g>
          <g>
            {layout.edges
              .filter((e) => !e.backplane)
              .map((e) => (
                <path key={e.id} className="arch-edge" data-kind={e.kind} data-state={edgeState(e.id)} d={e.d} />
              ))}
          </g>
          <g>
            {layout.edges
              .filter((e) => e.backplane && lit?.edges.has(e.id))
              .map((e) => (
                <path key={e.id} className="arch-edge" data-kind={e.kind} data-state="on" d={e.d} />
              ))}
          </g>
          <g>
            {model.nodes.map((n) => {
              const b = layout.boxes.get(n.id);
              if (!b) return null;
              return (
                <rect
                  key={n.id}
                  className="arch-box"
                  data-kind={n.kind}
                  data-state={nodeState(n.id)}
                  x={b.x}
                  y={b.y}
                  width={BOX_W}
                  height={BOX_H}
                  rx={RX}
                />
              );
            })}
          </g>
        </svg>
      ) : null}
      <ArchNodeList model={model} layout={layout} selection={selection} nodeState={nodeState} />
    </div>
  );
}

export function LegendSwatch({ kind }: { readonly kind: ArchNodeKind }) {
  return <span className="arch-swatch" data-kind={kind} aria-hidden="true" />;
}

export function ArchLegend() {
  return (
    <ul className="arch-legend mono-caption" aria-label={archCopy.legendLabel}>
      {archCopy.legendKinds.map((kind) => (
        <li key={kind}>
          <LegendSwatch kind={kind} />
          {archCopy.kindLabel[kind]}
        </li>
      ))}
      <li>
        <LegendSwatch kind="integration-phase2" />
        {archCopy.legendPhase2}
      </li>
    </ul>
  );
}
