export type IconName =
  | 'arrow-right'
  | 'arrow-up'
  | 'external'
  | 'copy'
  | 'check'
  | 'command'
  | 'chevron-down';

const PATHS: Record<IconName, string> = {
  'arrow-right': 'M3 8h10M9 4l4 4-4 4',
  'arrow-up': 'M8 13V3M4 7l4-4 4 4',
  external: 'M9 3h4v4M13 3L7 9M11 9v4H3V5h4',
  copy: 'M5 5h8v8H5zM3 11V3h8',
  check: 'M3 8.5l3.5 3.5L13 4.5',
  command: 'M6 6h4v4H6zM6 6V4a2 2 0 1 0-2 2h2zM10 6h2a2 2 0 1 0-2-2v2zM6 10H4a2 2 0 1 0 2 2v-2zM10 10h2a2 2 0 1 1-2 2v-2z',
  'chevron-down': 'M4 6l4 4 4-4',
};

/** Decorative inline icon, drawn rather than typed (ADR-004). Always aria-hidden. */
export function Icon({ name }: { readonly name: IconName }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
