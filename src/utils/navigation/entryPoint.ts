import { collectNavigationCandidates, focusCandidate } from "./engine";

export function getNavRoot(): HTMLElement | Document {
  return document.querySelector("main") ?? document;
}

export function resolveEntryPoint(
  root: HTMLElement | Document = getNavRoot(),
): HTMLElement | null {
  const candidates = collectNavigationCandidates(root);
  if (candidates.length === 0) return null;

  const preferred = root.querySelector<HTMLElement>("[data-nav-first]");
  if (preferred !== null) {
    for (let i = 0; i < candidates.length; i += 1) {
      if (candidates[i] === preferred || preferred.contains(candidates[i])) {
        return candidates[i];
      }
    }
  }

  return candidates[0];
}

export function needsEntryPoint(): boolean {
  const active = document.activeElement;
  if (active === null) return true;
  if (active === document.body || active === document.documentElement) {
    return true;
  }
  return !active.isConnected;
}

/** Moves focus to the entry point. Returns whether it landed anywhere. */
export function focusEntryPoint(): boolean {
  const target = resolveEntryPoint();
  if (target === null) return false;
  return focusCandidate(target);
}
