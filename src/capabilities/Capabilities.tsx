import { useCallback, useMemo, useState } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { content } from '../data/content';
import { SectionIntro } from '../how/SplitTitle';
import { supportsWebGL } from '../lib/webgl';
import { Section } from '../ui/Section';
import { CapConsole } from './CapConsole';
import { CapStack } from './CapStack';
import { pinnedTier } from './cap3d/quality';
import './Capabilities.css';

interface NavigatorWithConnection {
  readonly connection?: { readonly saveData?: boolean };
}

/**
 * Capabilities: the four domains as an interactive 3D skill core (a flying camera, a central core, four orbiting
 * clusters) on desktop; four stacked lit cards everywhere the 3D does not belong (phones, tablets, reduced motion,
 * no WebGL, save-data, a failed chunk). Both variants carry every skill and proof line as plain DOM.
 */
export function Capabilities() {
  const { capabilities } = content;
  const { reducedMotion, isDesktop } = usePrefs();
  const [failed, setFailed] = useState(false);
  const onFail = useCallback(() => setFailed(true), []);

  const canStage = useMemo(() => {
    if (!isDesktop || reducedMotion) return false;
    if ((navigator as Navigator & NavigatorWithConnection).connection?.saveData === true) return false;
    return supportsWebGL(pinnedTier(window.location.search) !== null);
  }, [isDesktop, reducedMotion]);

  return (
    <Section anchor="capabilities" className="stage-world cap">
      <SectionIntro anchor="capabilities" heading={capabilities.heading} lead={capabilities.lead || undefined} />
      {canStage && !failed ? <CapConsole onFail={onFail} /> : <CapStack />}
    </Section>
  );
}
