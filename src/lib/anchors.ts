import { ANCHORS } from '../config';
import type { AnchorKey } from '../data/content.types';

/** In-page href for an anchor key from the content file. */
export function anchorHref(key: AnchorKey): string {
  return `#${ANCHORS[key]}`;
}
