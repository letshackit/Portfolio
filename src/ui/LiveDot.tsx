export type DotTone = 'amber' | 'cyan';

/** Status dot. Static in step 1; the pulse ring arrives with the motion step. */
export function LiveDot({ tone, hollow = false }: { readonly tone: DotTone; readonly hollow?: boolean }) {
  return <span className="live-dot" data-tone={tone} data-hollow={hollow || undefined} aria-hidden="true" />;
}
