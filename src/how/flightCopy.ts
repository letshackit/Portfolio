/** Interface copy for the flight. The stage names, artifacts and numbers all come from content.ts; this is only chrome. */
export const flightCopy = {
  eyebrow: 'FLIGHT PATH',
  hint: 'Scroll to fly the pipeline',
  hintVertical: 'Scroll to descend the pipeline',
  packet: 'Work packet',
  meter: 'Product built',
  next: 'Next',
  /** One verb per stage, in stage order: what the work is called at that station. */
  verbs: ['COLLECT', 'STRUCTURE', 'DESIGN', 'BUILD', 'BREAK DOWN', 'GATE', 'SHIP'],
  done: 'Pipeline complete',
  conduit: 'Conduit',
  region: 'Interactive 3D flight through the seven stations of the pipeline. Scroll to move; the panel names each station.',
} as const;
