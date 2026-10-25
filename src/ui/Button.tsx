import type { ReactNode } from 'react';
import { onAnchorClick } from '../lib/scroll';
import { ExternalLink } from './ExternalLink';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'link';

interface CommonProps {
  readonly variant?: ButtonVariant;
  readonly children: ReactNode;
  readonly icon?: IconName;
  readonly className?: string;
}

interface LinkButtonProps extends CommonProps {
  readonly href: string;
  readonly external?: boolean;
  /** Suggested file name; makes the link a download. */
  readonly download?: string;
}

interface ActionButtonProps extends CommonProps {
  readonly onClick: () => void;
  readonly expanded?: boolean;
  readonly controls?: string;
  readonly id?: string;
}

export type ButtonProps = LinkButtonProps | ActionButtonProps;

function classes(variant: ButtonVariant, className?: string): string {
  return className ? `btn btn--${variant} ${className}` : `btn btn--${variant}`;
}

/** Anchor-styled-as-button when given href, native button when given onClick. */
export function Button(props: ButtonProps) {
  const variant = props.variant ?? 'secondary';
  const cls = classes(variant, props.className);
  const icon = props.icon ? <Icon name={props.icon} /> : null;

  if ('href' in props) {
    if (props.external) {
      return (
        <ExternalLink href={props.href} className={cls} icon>
          {props.children}
        </ExternalLink>
      );
    }
    return (
      <a
        href={props.href}
        className={cls}
        download={props.download}
        onClick={props.href.startsWith('#') ? onAnchorClick : undefined}
      >
        {props.children}
        {icon}
      </a>
    );
  }
  return (
    <button
      type="button"
      id={props.id}
      className={cls}
      onClick={props.onClick}
      aria-expanded={props.expanded}
      aria-controls={props.controls}
    >
      {props.children}
      {icon}
    </button>
  );
}
