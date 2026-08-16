import {
  ArrowKeyDirection,
  ownsArrowKeys,
} from "@/utils/browser/keyboardTarget";

import { isBackKey } from "./back";
import { needsEntryPoint } from "./entryPoint";

const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

export const WIDGET_IDLE_MS = 10000;

export function isArrowKey(event: KeyboardEvent): boolean {
  return ARROW_KEYS.indexOf(event.key) !== -1;
}

export function isWidgetEntryKey(event: KeyboardEvent): boolean {
  if (event.key !== "Enter") return false;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return false;
  }
  return !event.repeat;
}

/** The press that closes it again. Escape, or a remote's back button. */
export function isWidgetExitKey(event: KeyboardEvent): boolean {
  return isBackKey(event);
}

export function canEnterWidgetMode(): boolean {
  return needsEntryPoint();
}

export function isWidgetArrowEntry(event: KeyboardEvent): boolean {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return false;
  }
  return isArrowKey(event);
}

export function canEnterWidgetModeByArrow(
  target: EventTarget | null,
  root: HTMLElement | null,
  direction?: ArrowKeyDirection,
): boolean {
  if (ownsArrowKeys(target, direction)) return false;
  if (needsEntryPoint()) return true;
  const active = document.activeElement;
  return root !== null && active !== null && root.contains(active);
}
