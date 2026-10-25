import type { ReactNode } from 'react';

export function Chip({ children }: { readonly children: ReactNode }) {
  return <span className="chip">{children}</span>;
}
