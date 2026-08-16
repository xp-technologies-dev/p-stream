import { getActiveScope } from "@/utils/browser/focusScopes";

import { Direction } from "./spatial";

const CONTAINER_SELECTOR =
  "[data-nav-row],[data-nav-grid],[data-nav-scope],[data-nav-remember]";

export interface NavContainer {
  el: HTMLElement;
  kind: "row" | "grid" | "none";
  /** Declared column count, or null on a grid that did not give a usable one. */
  columns: number | null;
  remembers: boolean;
  /** A hard boundary: focus may not leave, exactly like an open overlay. */
  isScope: boolean;
}

function parseColumns(raw: string | null): number | null {
  if (raw === null) return null;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 1) return null;
  return value;
}

/** The container `el` declares itself to be, or null if it declares none. */
export function readContainer(el: HTMLElement): NavContainer | null {
  const isGrid = el.hasAttribute("data-nav-grid");
  const isRow = el.hasAttribute("data-nav-row");
  const isScope = el.hasAttribute("data-nav-scope");
  const remembers = el.hasAttribute("data-nav-remember");
  if (!isGrid && !isRow && !isScope && !remembers) return null;

  let kind: NavContainer["kind"] = "none";
  if (isGrid) kind = "grid";
  else if (isRow) kind = "row";

  return {
    el,
    kind,
    columns: isGrid ? parseColumns(el.getAttribute("data-nav-grid")) : null,
    remembers,
    isScope,
  };
}

export function containerChain(
  origin: HTMLElement,
  root: HTMLElement | Document = document,
): NavContainer[] {
  const out: NavContainer[] = [];
  let node = origin.closest<HTMLElement>(CONTAINER_SELECTOR);

  while (node !== null) {
    if (root instanceof HTMLElement && !root.contains(node)) break;

    const container = readContainer(node);
    if (container !== null) out.push(container);
    if (node === root) break;

    const parent: HTMLElement | null = node.parentElement;
    node =
      parent === null ? null : parent.closest<HTMLElement>(CONTAINER_SELECTOR);
  }

  return out;
}

export function resolveSearchRoot(origin: HTMLElement): HTMLElement | Document {
  const overlay = getActiveScope();
  const marked = origin.closest<HTMLElement>("[data-nav-scope]");
  if (marked !== null && (overlay === null || overlay.contains(marked))) {
    return marked;
  }
  return overlay ?? document;
}

/** Whether `container` refuses to let `direction` out of it. */
export function confines(
  container: NavContainer,
  direction: Direction,
): boolean {
  if (container.isScope) return true;
  if (container.kind === "grid") return true;
  if (container.kind === "row") {
    return direction === "left" || direction === "right";
  }
  return false;
}

export function stepInGrid(
  index: number,
  count: number,
  columns: number,
  direction: Direction,
): number | null {
  const column = index % columns;
  switch (direction) {
    case "right":
      return column === columns - 1 || index + 1 >= count ? null : index + 1;
    case "left":
      return column === 0 ? null : index - 1;
    case "down":
      return index + columns < count ? index + columns : null;
    default:
      return index - columns >= 0 ? index - columns : null;
  }
}

export function stepInDocumentOrder(
  index: number,
  count: number,
  direction: Direction,
): number | null {
  const forward = direction === "down" || direction === "right";
  const next = forward ? index + 1 : index - 1;
  return next >= 0 && next < count ? next : null;
}

const lastFocused = new WeakMap<HTMLElement, HTMLElement>();

/** Records `el` as the way back into every remembering container above it. */
export function rememberDescendant(el: HTMLElement): void {
  const parent = el.parentElement;
  let node =
    parent === null ? null : parent.closest<HTMLElement>("[data-nav-remember]");
  while (node !== null) {
    lastFocused.set(node, el);
    const above: HTMLElement | null = node.parentElement;
    node =
      above === null ? null : above.closest<HTMLElement>("[data-nav-remember]");
  }
}

/** Where focus was last inside `container`, if that element is still there. */
export function recallDescendant(container: HTMLElement): HTMLElement | null {
  const el = lastFocused.get(container);
  if (el === undefined) return null;
  if (!el.isConnected || !container.contains(el)) return null;
  return el;
}

export function resolveContainerEntry(
  container: NavContainer,
  inside: readonly HTMLElement[],
): HTMLElement | null {
  if (container.remembers) {
    const remembered = recallDescendant(container.el);
    if (remembered !== null && inside.indexOf(remembered) !== -1) {
      return remembered;
    }
  }

  const first = container.el.querySelector<HTMLElement>("[data-nav-first]");
  if (first !== null) {
    for (let i = 0; i < inside.length; i += 1) {
      if (inside[i] === first || first.contains(inside[i])) return inside[i];
    }
  }

  return null;
}

export function crossedContainers(
  origin: HTMLElement,
  target: HTMLElement,
): NavContainer[] {
  const out: NavContainer[] = [];
  let node = target.closest<HTMLElement>(CONTAINER_SELECTOR);

  while (node !== null) {
    if (node.contains(origin)) break;
    const container = readContainer(node);
    if (container !== null) out.push(container);
    const parent: HTMLElement | null = node.parentElement;
    node =
      parent === null ? null : parent.closest<HTMLElement>(CONTAINER_SELECTOR);
  }

  return out.reverse();
}
