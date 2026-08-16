import { collectFocusables } from "@/utils/browser/focusables";
import { ownsArrowKeys } from "@/utils/browser/keyboardTarget";

import {
  confines,
  containerChain,
  crossedContainers,
  NavContainer,
  rememberDescendant,
  resolveContainerEntry,
  resolveSearchRoot,
  stepInDocumentOrder,
  stepInGrid,
} from "./containers";
import { layerOf } from "./obstructions";
import { scrollIntoViewport } from "./scrollIntoViewport";
import { Direction, NavRect, pickCandidate } from "./spatial";

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

export function directionForKey(event: KeyboardEvent): Direction | null {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return null;
  }
  return KEY_DIRECTIONS[event.key] ?? null;
}

export function isNavSkipped(el: Element): boolean {
  return el.closest("[data-nav-skip]") !== null;
}

export function collectNavigationCandidates(
  scope: HTMLElement | Document = document,
): HTMLElement[] {
  const focusables = collectFocusables(scope);
  const out: HTMLElement[] = [];
  for (let i = 0; i < focusables.length; i += 1) {
    if (!isNavSkipped(focusables[i])) out.push(focusables[i]);
  }
  return out;
}

export function focusCandidate(
  el: HTMLElement,
  direction?: Direction,
): boolean {
  el.focus({ preventScroll: true });
  if (document.activeElement !== el) return false;
  rememberDescendant(el);
  scrollIntoViewport(el, direction);
  return true;
}

function rectReader(): (el: HTMLElement) => NavRect {
  const cache = new Map<HTMLElement, NavRect>();
  return (el) => {
    const hit = cache.get(el);
    if (hit !== undefined) return hit;
    const rect = el.getBoundingClientRect();
    cache.set(el, rect);
    return rect;
  };
}

function resolveEntry(
  origin: HTMLElement,
  target: HTMLElement,
  candidates: readonly HTMLElement[],
): HTMLElement {
  const crossed = crossedContainers(origin, target);
  for (let i = 0; i < crossed.length; i += 1) {
    const container = crossed[i];
    const inside = candidates.filter((el) => container.el.contains(el));
    const entry = resolveContainerEntry(container, inside);
    if (entry !== null) return entry;
  }
  return target;
}

/** Picks inside one confining container, or null if it has nowhere to offer. */
function pickInside(
  container: NavContainer,
  origin: HTMLElement,
  originRect: NavRect,
  inside: readonly HTMLElement[],
  direction: Direction,
  rectOf: (el: HTMLElement) => NavRect,
): HTMLElement | null {
  const at = inside.indexOf(origin);

  if (container.kind === "grid" && container.columns !== null && at !== -1) {
    const next = stepInGrid(at, inside.length, container.columns, direction);
    return next === null ? null : inside[next];
  }

  const index = pickCandidate(originRect, inside.map(rectOf), direction);
  if (index === null) return null;
  return inside[index] === origin ? null : inside[index];
}

export function moveFocus(direction: Direction): boolean {
  const active = document.activeElement;

  if (!(active instanceof HTMLElement) || active === document.body)
    return false;

  if (isNavSkipped(active)) return false;

  const root = resolveSearchRoot(active);
  const candidates = collectNavigationCandidates(root);
  if (candidates.length === 0) return false;

  const rectOf = rectReader();
  const originRect = rectOf(active);
  const commit = (target: HTMLElement): boolean => {
    const entry = resolveEntry(active, target, candidates);
    if (entry === active) return false;
    return focusCandidate(entry, direction);
  };

  const escaped: HTMLElement[] = [];
  const survives = (el: HTMLElement) =>
    !escaped.some((container) => container.contains(el));

  const chain = containerChain(active, root);
  for (let i = 0; i < chain.length; i += 1) {
    const container = chain[i];
    if (!confines(container, direction)) continue;

    const inside = candidates.filter((el) => container.el.contains(el));
    const target = pickInside(
      container,
      active,
      originRect,
      container.kind === "grid" ? inside : inside.filter(survives),
      direction,
      rectOf,
    );
    if (target !== null) return commit(target);

    // A scope is the overlay contract: focus does not leave, full stop.
    if (container.isScope) return false;
    escaped.push(container.el);
  }

  const outside =
    escaped.length === 0 ? candidates : candidates.filter(survives);
  const ownLayer = layerOf(active);
  const takes: HTMLElement[][] = [[], []];
  for (let i = 0; i < outside.length; i += 1) {
    takes[layerOf(outside[i]) === ownLayer ? 0 : 1].push(outside[i]);
  }
  for (let take = 0; take < takes.length; take += 1) {
    const tier = takes[take];
    if (tier.length === 0) continue;
    const index = pickCandidate(originRect, tier.map(rectOf), direction);
    if (index !== null && tier[index] !== active) {
      return commit(tier[index]);
    }
  }

  // Tier 3.
  if (escaped.length === 0) return false;
  const at = candidates.indexOf(active);
  if (at === -1) return false;
  const next = stepInDocumentOrder(at, candidates.length, direction);
  if (next === null) return false;
  return commit(candidates[next]);
}

export function handleNavigationKeydown(
  event: KeyboardEvent,
  isEnabled: () => boolean,
): boolean {
  if (event.defaultPrevented) return false;

  const direction = directionForKey(event);
  if (direction === null) return false;

  if (ownsArrowKeys(event.target, direction)) return false;
  if (!isEnabled()) return false;

  if (!moveFocus(direction)) return false;

  event.preventDefault();
  return true;
}
