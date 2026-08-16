import { isEditableTarget } from "@/utils/browser/keyboardTarget";

export type InputModality = "pointer" | "key";

const ATTRIBUTE = "data-input-modality";

const MODIFIER_KEYS = ["Shift", "Control", "Alt", "Meta", "AltGraph"];

const FIELD_NAV_KEYS = ["Tab", "Escape"];

let current: InputModality | null = null;

function set(modality: InputModality) {
  if (current === modality) return;
  current = modality;
  document.documentElement.setAttribute(ATTRIBUTE, modality);
}

export function getInputModality(): InputModality | null {
  return current;
}

function handleKeyDown(event: KeyboardEvent) {
  // Browser and OS shortcuts aren't the user navigating the page
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (MODIFIER_KEYS.indexOf(event.key) !== -1) return;
  if (
    isEditableTarget(event.target) &&
    FIELD_NAV_KEYS.indexOf(event.key) === -1
  )
    return;
  set("key");
}

function handlePointerDown() {
  set("pointer");
}

function handleGamepad() {
  set("key");
}

export function noteKeyModality() {
  set("key");
}

export function initInputModality(): () => void {
  document.addEventListener("keydown", handleKeyDown, true);
  document.addEventListener("pointerdown", handlePointerDown, true);
  window.addEventListener("gamepadconnected", handleGamepad);

  return () => {
    document.removeEventListener("keydown", handleKeyDown, true);
    document.removeEventListener("pointerdown", handlePointerDown, true);
    window.removeEventListener("gamepadconnected", handleGamepad);
    current = null;
    document.documentElement.removeAttribute(ATTRIBUTE);
  };
}
