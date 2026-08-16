import { ownsKeyboardInput } from "@/utils/browser/keyboardTarget";

import { isNativelyActivatable } from "./activation";
import { BACK_KEY_CODE } from "./back";
import { focusEntryPoint, needsEntryPoint } from "./entryPoint";

const ACTION_KEYS: Record<string, string> = {
  "navigate-up": "ArrowUp",
  "navigate-down": "ArrowDown",
  "navigate-left": "ArrowLeft",
  "navigate-right": "ArrowRight",
  confirm: "Enter",
  back: "Escape",
};

export function keyForGamepadAction(action: string): string | null {
  return ACTION_KEYS[action] ?? null;
}

export function isNavigationAction(action: string): boolean {
  return keyForGamepadAction(action) !== null;
}

/** Where a synthesized press should be aimed. */
function pressTarget(): HTMLElement {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.isConnected) return active;
  return document.body;
}

export function dispatchGamepadAction(action: string): boolean {
  const key = keyForGamepadAction(action);
  if (key === null) return false;

  if (key !== "Escape" && needsEntryPoint() && focusEntryPoint()) {
    return true;
  }

  const target = pressTarget();
  const event = new KeyboardEvent("keydown", {
    key,
    keyCode: key === "Escape" ? BACK_KEY_CODE : undefined,
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  target.dispatchEvent(event);

  if (
    key === "Enter" &&
    !event.defaultPrevented &&
    target !== document.body &&
    !ownsKeyboardInput(target) &&
    isNativelyActivatable(target)
  ) {
    target.click();
  }

  return true;
}
