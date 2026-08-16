import { ownsKeyboardInput } from "@/utils/browser/keyboardTarget";

import { isNavSkipped } from "./engine";

const NATIVE_ACTIVATION = [
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "SUMMARY",
  "OPTION",
  "LABEL",
  "AUDIO",
  "VIDEO",
];

/** Whether the browser will fire a click on this element without our help. */
export function isNativelyActivatable(el: Element): boolean {
  if (NATIVE_ACTIVATION.indexOf(el.nodeName) !== -1) return true;
  if (el.nodeName === "A" || el.nodeName === "AREA") {
    return el.hasAttribute("href");
  }
  return false;
}

export function handleActivationKeydown(
  event: KeyboardEvent,
  isEnabled: () => boolean,
): boolean {
  if (event.defaultPrevented) return false;

  if (event.key !== "Enter" && event.key !== " ") return false;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return false;
  }

  if (event.repeat) return false;

  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;

  // A field: Space is a character and Enter submits. Both are the browser's.
  if (ownsKeyboardInput(target)) return false;

  // The player binds Space to play/pause and is not ours to activate into.
  if (isNavSkipped(target)) return false;

  if (isNativelyActivatable(target)) return false;
  if (!target.hasAttribute("tabindex")) return false;

  if (!isEnabled()) return false;

  target.click();

  event.preventDefault();
  return true;
}
