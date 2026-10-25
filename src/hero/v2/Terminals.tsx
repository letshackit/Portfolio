import { useId } from 'react';
import { content } from '../../data/content';
import { CONSOLE_LINES, DEPLOY_LINES, lineToText } from './copy';
import type { StreamRow } from './stream';
import { useStream } from './useStream';

interface TerminalProps {
  /** Reduced motion: the finished log at once. */
  readonly instant: boolean;
  /** Boot over: typing may start. */
  readonly active: boolean;
  /** Off screen or tab hidden. */
  readonly paused: boolean;
  /** Rows the console shows (fewer on a phone). */
  readonly rows?: number;
}

function Rows({ rows }: { rows: readonly StreamRow[] }) {
  const last = rows.length - 1;
  return (
    <>
      {rows.map((r, i) => (
        <div className="hv2__row" key={`${r.tag}-${i}`}>
          <span className="hv2__rtag">{r.tag}</span>
          <span className="hv2__chev" aria-hidden="true" />
          <span className="hv2__rtext">{r.text}</span>
          {r.ok ? <span className="hv2__ok" aria-hidden="true" /> : null}
          {i === last && r.typing ? <span className="hv2__caret" aria-hidden="true" /> : null}
        </div>
      ))}
    </>
  );
}

/**
 * The agent console, bottom-left. RESEARCH (stage 01 of 07) is folded in as its first lines, then the pipeline runs
 * through to deploy. The animated rows are aria-hidden; the complete log is in a visually hidden list.
 */
export function AgentConsole({ instant, active, paused, rows = 6 }: TerminalProps) {
  const view = useStream(CONSOLE_LINES, rows, { instant, active, paused });
  const labelId = useId();
  return (
    <section className="hv2__console" aria-labelledby={labelId}>
      <div className="hv2__term-head">
        <span className="hv2__term-title" id={labelId}>
          <i className="hv2__dot hv2__dot--amber" aria-hidden="true" />
          AGENT CONSOLE
        </span>
        <span className="hv2__term-meta">{content.howIWork.tools.join(' · ').toLowerCase()}</span>
      </div>
      <div className="hv2__term-body" aria-hidden="true">
        <div className="hv2__row hv2__row--cmd">
          <span className="hv2__prompt" />
          <span>pipeline run --embedded</span>
        </div>
        <Rows rows={view} />
        {view.length === 0 ? (
          <div className="hv2__row">
            <span className="hv2__caret" />
          </div>
        ) : null}
      </div>
      <ul className="visually-hidden">
        {CONSOLE_LINES.map((l) => (
          <li key={l.tag}>{lineToText(l)}</li>
        ))}
      </ul>
    </section>
  );
}

/** The DEPLOY pane (stage 07 of 07) at the right edge: a typing stream where each gate closes with a check. */
export function DeployPane({ instant, active, paused }: TerminalProps) {
  const view = useStream(DEPLOY_LINES, 8, { instant, active, paused });
  const labelId = useId();
  return (
    <aside className="hv2__pane" aria-labelledby={labelId}>
      <div className="hv2__term-head">
        <span className="hv2__term-title" id={labelId}>
          <i className="hv2__dot hv2__dot--amber" aria-hidden="true" />
          DEPLOY
        </span>
        <span>STAGE 07 OF 07</span>
      </div>
      <div className="hv2__term-body" aria-hidden="true">
        <Rows rows={view} />
        {view.length === 0 ? (
          <div className="hv2__row">
            <span className="hv2__caret" />
          </div>
        ) : null}
      </div>
      <div className="hv2__term-foot" aria-hidden="true">
        <span>GATES ARMED</span>
        <b>LIVE</b>
      </div>
      <ul className="visually-hidden">
        {DEPLOY_LINES.map((l, i) => (
          <li key={`${l.tag}-${i}`}>{lineToText(l)}</li>
        ))}
      </ul>
    </aside>
  );
}
