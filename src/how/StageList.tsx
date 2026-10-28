import { useEffect, useRef, useState } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { useUi } from '../app/providers/uiContext';
import { content } from '../data/content';
import { flightCopy } from './flightCopy';
import { StagePanel } from './StagePanel';
import { StationGlyph } from './StationGlyph';
import { useOnScreen } from './useOnScreen';

const stages = content.howIWork.stages;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The still version of the pipeline, for reduced motion and for browsers without WebGL: all seven stages in order,
 * each with its line drawing, the rail running down the left edge with an amber packet that follows the scroll
 * (not under reduced motion), and the card nearest the reading line fully lit. The stage chosen elsewhere is focused on arrival.
 */
export function StageList() {
  const { reducedMotion } = usePrefs();
  const { selectedStage, stageFocusRequest } = useUi();
  const seenRequest = useRef(stageFocusRequest);
  const selectedRef = useRef<HTMLLIElement | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const packetRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [lit, setLit] = useState(0);
  const onScreen = useOnScreen(wrapRef, 0.05);

  useEffect(() => {
    if (stageFocusRequest === seenRequest.current) return;
    seenRequest.current = stageFocusRequest;
    if (selectedStage) selectedRef.current?.focus({ preventScroll: true });
  }, [selectedStage, stageFocusRequest]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const fill = fillRef.current;
    const packet = packetRef.current;
    if (reducedMotion || !onScreen || !wrap || !fill || !packet) return;
    const items = itemRefs.current.filter((el): el is HTMLLIElement => el !== null);
    wrap.setAttribute('data-live', '');
    let raf = 0;
    let active = -1;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const readLine = vh * 0.55;
      const box = wrap.getBoundingClientRect();
      const p = clamp01((readLine - box.top) / box.height);
      fill.style.transform = `scaleY(${p.toFixed(4)})`;
      packet.style.transform = `translate3d(0,${(p * box.height).toFixed(1)}px,0)`;
      let best = 0;
      let bestDistance = Infinity;
      items.forEach((li, i) => {
        const b = li.getBoundingClientRect();
        const distance = readLine < b.top ? b.top - readLine : readLine > b.bottom ? readLine - b.bottom : 0;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
        const k = Math.min(1, distance / (vh * 0.4));
        li.style.opacity = (1 - 0.5 * k).toFixed(3);
        li.style.transform = `translate3d(0,0,0) scale(${(1 - 0.04 * k).toFixed(4)})`;
        if (b.top - box.top + 12 <= p * box.height) li.setAttribute('data-lit', '');
        else li.removeAttribute('data-lit');
      });
      if (best !== active) {
        active = best;
        setLit(best);
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (raf) cancelAnimationFrame(raf);
      wrap.removeAttribute('data-live');
      for (const li of items) {
        li.style.opacity = '';
        li.style.transform = '';
        li.removeAttribute('data-lit');
      }
    };
  }, [reducedMotion, onScreen]);

  return (
    <div className="stepper-wrap" ref={wrapRef}>
      <span className="stepper-wrap__line" aria-hidden="true">
        <span className="stepper-wrap__fill" ref={fillRef} />
        <span className="stepper-wrap__packet" ref={packetRef} />
      </span>
      <ol className="stepper-list" aria-label={content.ui.stageListLabel}>
        {stages.map((stage, i) => {
          const selected = stage.id === selectedStage;
          return (
            <li
              key={stage.id}
              className="stepper-list__item stage-card"
              data-selected={selected || undefined}
              tabIndex={selected ? -1 : undefined}
              ref={(el) => {
                itemRefs.current[i] = el;
                if (selected) selectedRef.current = el;
              }}
            >
              <span className="stepper-list__dot" aria-hidden="true" />
              <div className="stepper-list__art">
                <StationGlyph id={stage.id} />
              </div>
              <StagePanel
                stage={stage}
                play={onScreen && i === lit}
                verb={flightCopy.verbs[i]}
                built={Math.round(((i + 1) / stages.length) * 100)}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
