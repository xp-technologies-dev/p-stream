import { getScopeDepth } from "@/utils/browser/focusScopes";
import { isTvBrowser } from "@/utils/browser/tvBrowser";

const BACK_KEY_CODES = [10009, 461];

export const BACK_KEY_CODE = BACK_KEY_CODES[0];

export function isBackKey(event: KeyboardEvent): boolean {
  if (event.key === "Escape") return true;
  return BACK_KEY_CODES.indexOf(event.keyCode) !== -1;
}

export function isRouteBackKey(event: KeyboardEvent): boolean {
  if (!isBackKey(event)) return false;
  if (BACK_KEY_CODES.indexOf(event.keyCode) !== -1) return true;
  return isTvBrowser();
}

export type BackAction =
  /** Something else owns this press. Do nothing. */
  | "none"
  /** A modal was open; the existing global handler closes it. */
  | "defer"
  /** Nothing on screen to close, and there is somewhere to go back to. */
  | "history";

export interface BackContext {
  /** Whether a modal was open *before* this event started propagating. */
  hadModal: boolean;
}

export function canGoBack(): boolean {
  const state = window.history.state;
  if (state === null || typeof state !== "object") return false;
  const idx = (state as { idx?: unknown }).idx;
  return typeof idx === "number" && idx > 0;
}

/** Captures what the bubble phase will no longer be able to see. */
export function snapshotBackContext(hasModal: boolean): BackContext {
  return { hadModal: hasModal };
}

export function resolveBack(
  event: KeyboardEvent,
  context: BackContext,
): BackAction {
  if (event.defaultPrevented) return "none";

  if (context.hadModal) return "defer";

  if (getScopeDepth() > 0) return "none";

  if (!isRouteBackKey(event)) return "none";

  return canGoBack() ? "history" : "none";
}
