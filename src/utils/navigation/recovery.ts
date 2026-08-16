import { noteKeyModality } from "@/utils/browser/inputModality";

import { collectNavigationCandidates, focusCandidate } from "./engine";
import { focusEntryPoint } from "./entryPoint";
import { NavRect } from "./spatial";

export interface FocusOrigin {
  el: HTMLElement;
  /** Ancestors, innermost first. Read eagerly; unreadable later. */
  chain: HTMLElement[];
  /** Where the element was, for choosing the nearest survivor. */
  rect: NavRect;
}

/** Snapshots everything recovery will need about `el`. Call while connected. */
export function rememberFocus(el: HTMLElement): FocusOrigin {
  const chain: HTMLElement[] = [];
  let node = el.parentElement;
  while (node !== null) {
    chain.push(node);
    node = node.parentElement;
  }
  return { el, chain, rect: el.getBoundingClientRect() };
}

function centreDistance(a: NavRect, b: NavRect): number {
  const dx = (a.left + a.right) / 2 - (b.left + b.right) / 2;
  const dy = (a.top + a.bottom) / 2 - (b.top + b.bottom) / 2;
  return Math.sqrt(dx * dx + dy * dy);
}

/** {@link recoverFocus} minus the ring. Split only so the ring is unmissable. */
function placeFocus(origin: FocusOrigin): boolean {
  if (origin.el.isConnected) return false;

  for (let i = 0; i < origin.chain.length; i += 1) {
    const ancestor = origin.chain[i];
    if (!ancestor.isConnected) continue;

    const candidates = collectNavigationCandidates(ancestor);
    if (candidates.length === 0) continue;

    let best = candidates[0];
    let bestDistance = centreDistance(
      origin.rect,
      best.getBoundingClientRect(),
    );
    for (let j = 1; j < candidates.length; j += 1) {
      const distance = centreDistance(
        origin.rect,
        candidates[j].getBoundingClientRect(),
      );
      if (distance < bestDistance) {
        best = candidates[j];
        bestDistance = distance;
      }
    }

    if (focusCandidate(best)) return true;
  }

  return focusEntryPoint();
}

export function recoverFocus(origin: FocusOrigin): boolean {
  if (!placeFocus(origin)) return false;
  noteKeyModality();
  return true;
}
