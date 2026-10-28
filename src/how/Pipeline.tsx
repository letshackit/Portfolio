import { useCallback, useMemo, useState } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { pinnedQuality } from './flight/quality';
import { supportsWebGL } from '../lib/webgl';
import { Flight } from './Flight';
import { StageList } from './StageList';

interface NavigatorWithConnection {
  readonly connection?: { readonly saveData?: boolean };
}

/**
 * Picks how the seven stages are shown. With motion allowed, WebGL and no save-data: the flight (pinned, 3D, scroll is
 * the clock). Otherwise, or if the 3D chunk fails or the context is lost: the still list, which carries every stage,
 * artifact and number with a line drawing of each station. `?quality=high|mid|low` pins the tier and accepts a
 * software GL renderer (QA and screenshots only; the page itself never asks for it).
 */
export function Pipeline() {
  const { reducedMotion } = usePrefs();
  const quality = useMemo(() => pinnedQuality(window.location.search), []);
  const gl = useMemo(() => supportsWebGL(quality !== null), [quality]);
  const [failed, setFailed] = useState(false);
  const onFail = useCallback(() => setFailed(true), []);
  const saveData = (navigator as Navigator & NavigatorWithConnection).connection?.saveData === true;
  const flies = !reducedMotion && gl && !saveData && !failed;
  return flies ? <Flight quality={quality} onFail={onFail} /> : <StageList />;
}
