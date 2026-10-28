/**
 * The seam between the credentials' DOM and its 3D layer. The DOM owns layout (each badge has an empty slot in the
 * grid); the stage reads the slots' rectangles, relative to the vault, and places a badge in each one. So the 390 px
 * layout is a different grid, not a shrunk canvas. Framework-free.
 */
export interface SlotRect {
  /** Centre, in CSS px from the vault's top-left corner. */
  readonly cx: number;
  readonly cy: number;
  readonly w: number;
  readonly h: number;
}

export interface VaultStore {
  /** The vault element every rectangle is measured against. */
  container: HTMLElement | null;
  readonly els: Map<string, HTMLElement>;
  readonly rects: Map<string, SlotRect>;
  /** Badge under the cursor (or most recently tapped), or null. */
  hover: string | null;
  /** Cursor in CSS px from the vault's top-left; far outside until it moves. */
  pointer: { x: number; y: number };
  /** True while enough of the vault is on screen for the entrance to play. */
  inView: boolean;
  register(id: string, el: HTMLElement | null): void;
  /** Re-reads the container and every slot. Cheap enough to run every few frames. */
  measure(): void;
}

export function createVaultStore(): VaultStore {
  const els = new Map<string, HTMLElement>();
  const rects = new Map<string, SlotRect>();
  const store: VaultStore = {
    container: null,
    els,
    rects,
    hover: null,
    pointer: { x: -1e4, y: -1e4 },
    inView: false,
    register(id, el) {
      if (el) els.set(id, el);
      else {
        els.delete(id);
        rects.delete(id);
      }
    },
    measure() {
      const c = store.container;
      if (!c) return;
      const base = c.getBoundingClientRect();
      for (const [id, el] of els) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) {
          rects.delete(id);
          continue;
        }
        rects.set(id, { cx: r.left - base.left + r.width / 2, cy: r.top - base.top + r.height / 2, w: r.width, h: r.height });
      }
    },
  };
  return store;
}
