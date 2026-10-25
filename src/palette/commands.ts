import { ANCHORS, type AnchorId } from '../config';
import { content } from '../data/content';
import { copyText } from '../lib/clipboard';
import { scrollToAnchor } from '../lib/scroll';
import type { IconName } from '../ui/Icon';

export type CommandGroup = 'navigate' | 'actions';

/** What a command may do to the palette and the page. Supplied by CommandPalette. */
export interface CommandContext {
  /** Close the palette. `restoreFocus: false` when the command moves focus itself. */
  readonly close: (options?: { readonly restoreFocus?: boolean }) => void;
  readonly toast: (message: string) => void;
  /** Swap the list for the manual-copy row (FR-40). */
  readonly showCopyFallback: () => void;
}

export interface Command {
  readonly id: string;
  readonly group: CommandGroup;
  readonly label: string;
  readonly hint: string;
  readonly icon: IconName;
  readonly run: (ctx: CommandContext) => Promise<void> | void;
}

/** Click a throwaway anchor so the file downloads under its own name from the site origin (FR-41). */
export function triggerDownload(href: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  link.rel = 'noopener';
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function gotoCommand(id: AnchorId, label: string): Command {
  return {
    id: `goto-${id}`,
    group: 'navigate',
    label,
    hint: `#${id}`,
    icon: 'arrow-right',
    run: (ctx) => {
      // Close first and leave focus alone: the heading takes it after the scroll (FR-43).
      ctx.close({ restoreFocus: false });
      return scrollToAnchor(id, { focus: true });
    },
  };
}

/** The eleven commands (FR-34): one "Go to" per anchor, then three actions. */
export function buildCommands(): readonly Command[] {
  const { nav, contact } = content;
  const goto: Command[] = [
    gotoCommand(ANCHORS.top, content.palette.goToTop),
    ...nav.map((item) => gotoCommand(ANCHORS[item.anchor], `${content.palette.goTo} ${item.label}`)),
  ];
  goto[0] = { ...goto[0], hint: content.palette.topHint };

  const actions: Command[] = [
    {
      id: 'resume',
      group: 'actions',
      label: content.palette.resume,
      hint: content.palette.resumeHint,
      icon: 'download',
      run: (ctx) => {
        triggerDownload(contact.resumePath, contact.resumeFileName);
        ctx.close();
      },
    },
    {
      id: 'copy-email',
      group: 'actions',
      label: content.palette.copyEmail,
      hint: contact.email,
      icon: 'copy',
      run: async (ctx) => {
        const result = await copyText(contact.email);
        if (result === 'copied') {
          ctx.close();
          ctx.toast(content.palette.emailCopied);
        } else {
          ctx.showCopyFallback();
        }
      },
    },
    {
      id: 'linkedin',
      group: 'actions',
      label: content.ui.openLinkedin,
      hint: content.palette.linkedinHint,
      icon: 'external',
      run: (ctx) => {
        window.open(contact.linkedin, '_blank', 'noopener,noreferrer');
        ctx.close();
      },
    },
  ];
  return [...goto, ...actions];
}

/** Lower-case and strip accents so "resume" finds "résumé". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Case- and accent-insensitive substring match on the label; an empty query keeps everything (FR-35). */
export function filterCommands(commands: readonly Command[], query: string): readonly Command[] {
  const needle = fold(query.trim());
  if (needle === '') return commands;
  return commands.filter((command) => fold(command.label).includes(needle));
}

/** Move the highlight with wrap-around; 0 for an empty list. */
export function moveIndex(current: number, delta: number, length: number): number {
  if (length <= 0) return 0;
  return (((current + delta) % length) + length) % length;
}
