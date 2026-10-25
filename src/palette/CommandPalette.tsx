import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { content } from '../data/content';
import { lockScroll } from '../lib/scroll';
import { useUi } from '../app/providers/uiContext';
import { Icon } from '../ui/Icon';
import { buildCommands, filterCommands, moveIndex, type Command, type CommandGroup } from './commands';
import './CommandPalette.css';

const GROUP_LABELS: Record<CommandGroup, string> = {
  navigate: content.palette.groupNavigate,
  actions: content.palette.groupActions,
};
const GROUP_ORDER: readonly CommandGroup[] = ['navigate', 'actions'];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled])';

function optionId(id: string): string {
  return `palette-opt-${id}`;
}

/** Is this the Cmd+K / Ctrl+K chord (FR-32)? */
function isPaletteChord(event: globalThis.KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'k';
}

/** Global shortcut plus the dialog. Always mounted; renders nothing while closed. */
export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useUi();

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!isPaletteChord(event)) return;
      event.preventDefault();
      setPaletteOpen(!paletteOpen);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [paletteOpen, setPaletteOpen]);

  return paletteOpen ? <PaletteDialog /> : null;
}

function PaletteDialog() {
  const { setPaletteOpen, showToast } = useUi();
  const commands = useMemo(buildCommands, []);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [fallback, setFallback] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<Element | null>(null);
  const restoreRef = useRef(true);

  const visible = useMemo(() => filterCommands(commands, query), [commands, query]);
  const active: Command | undefined = visible[Math.min(activeIndex, visible.length - 1)];

  // Open: remember the opener, freeze the page, focus the input. Close: undo all three (FR-37, FR-38).
  useEffect(() => {
    returnFocusRef.current = document.activeElement;
    lockScroll(true);
    inputRef.current?.focus();
    return () => {
      lockScroll(false);
      if (!restoreRef.current) return;
      const opener = returnFocusRef.current;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
      else document.getElementById('menu-button')?.focus();
    };
  }, []);

  useEffect(() => {
    if (!fallback) return;
    const input = fallbackInputRef.current;
    input?.focus();
    input?.select();
  }, [fallback]);

  const close = useCallback(
    (options?: { readonly restoreFocus?: boolean }) => {
      restoreRef.current = options?.restoreFocus !== false;
      setPaletteOpen(false);
    },
    [setPaletteOpen],
  );

  const run = useCallback(
    (command: Command) => {
      void command.run({ close, toast: showToast, showCopyFallback: () => setFallback(true) });
    },
    [close, showToast],
  );

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex(moveIndex(activeIndex, 1, visible.length));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex(moveIndex(activeIndex, -1, visible.length));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(Math.max(0, visible.length - 1));
        break;
      case 'Enter':
        event.preventDefault();
        if (active) run(active);
        break;
      default:
    }
  };

  /** Escape closes; Tab wraps inside the dialog so focus never leaves it (FR-37, FR-38). */
  const onDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!items || items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="palette-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label={content.palette.dialogLabel}
        onKeyDown={onDialogKeyDown}
      >
        <div className="palette__input-row">
          <span className="palette__prompt" aria-hidden="true">
            <Icon name="chevron-down" />
          </span>
          <input
            ref={inputRef}
            className="palette__input mono-value"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={active && !fallback ? optionId(active.id) : undefined}
            aria-autocomplete="list"
            aria-label={content.palette.inputLabel}
            placeholder={content.palette.placeholder}
            autoComplete="off"
            spellCheck={false}
            value={query}
            readOnly={fallback}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
          />
        </div>

        {fallback ? (
          <div className="palette__fallback">
            <p className="mono-caption">{content.palette.copyFallbackLead}</p>
            <input
              ref={fallbackInputRef}
              className="palette__email mono-value"
              type="text"
              readOnly
              aria-label={content.ui.contactEmail}
              value={content.contact.email}
            />
            <a className="btn btn--primary" href={`mailto:${content.contact.email}`}>
              {content.palette.writeEmail}
            </a>
          </div>
        ) : (
          <ul id="palette-list" className="palette__list" role="listbox" aria-label={content.palette.dialogLabel}>
            {visible.length === 0 ? (
              <li className="palette__empty mono-caption" role="option" aria-disabled="true" aria-selected="false">
                {content.palette.empty}
              </li>
            ) : (
              GROUP_ORDER.map((group) => {
                const rows = visible.filter((command) => command.group === group);
                if (rows.length === 0) return null;
                return (
                  <li key={group} role="presentation">
                    <p className="palette__group mono-label" id={`palette-group-${group}`}>
                      {GROUP_LABELS[group]}
                    </p>
                    <ul role="group" aria-labelledby={`palette-group-${group}`}>
                      {rows.map((command) => {
                        const selected = command === active;
                        return (
                          <li
                            key={command.id}
                            id={optionId(command.id)}
                            role="option"
                            aria-selected={selected}
                            className="palette__row"
                            data-active={selected || undefined}
                            onMouseMove={() => setActiveIndex(visible.indexOf(command))}
                            onClick={() => run(command)}
                          >
                            <Icon name={command.icon} />
                            <span className="palette__label">{command.label}</span>
                            <span className="palette__hint mono-caption">{command.hint}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })
            )}
          </ul>
        )}

        <p className="palette__footer mono-caption" aria-hidden="true">
          {content.palette.footerHint}
        </p>
      </div>
    </div>
  );
}
