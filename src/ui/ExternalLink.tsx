import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface ExternalLinkProps {
  readonly href: string;
  readonly children: ReactNode;
  readonly className?: string;
  /** Show the trailing external-link icon. */
  readonly icon?: boolean;
}

/** The only component allowed to render target="_blank" (NFR-31). */
export function ExternalLink({ href, children, className, icon = false }: ExternalLinkProps) {
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
      {icon ? <Icon name="external" /> : null}
    </a>
  );
}
