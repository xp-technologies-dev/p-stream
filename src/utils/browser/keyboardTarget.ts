const NON_TEXT_INPUT_TYPES = [
  "button",
  "checkbox",
  "color",
  "file",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
];

function asElement(target: EventTarget | null): HTMLElement | null {
  return target instanceof HTMLElement ? target : null;
}

function isEditableElement(el: HTMLElement): boolean {
  if (el.nodeName === "TEXTAREA") return true;

  if (el.nodeName === "INPUT") {
    return NON_TEXT_INPUT_TYPES.indexOf((el as HTMLInputElement).type) === -1;
  }

  if (el.isContentEditable) return true;

  if (el.closest('[contenteditable]:not([contenteditable="false"])')) {
    return true;
  }

  return el.closest('[role="textbox"]') !== null;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  const el = asElement(target);
  return el !== null && isEditableElement(el);
}

const ARROW_DRIVEN_INPUT_TYPES = [
  "range",
  "number",
  "date",
  "datetime-local",
  "month",
  "time",
  "week",
];

/** Which arrow is being asked about. */
export type ArrowKeyDirection = "up" | "down" | "left" | "right";

function caretCanMove(el: HTMLInputElement, towardsEnd: boolean): boolean {
  let start: number | null = null;
  let end: number | null = null;
  try {
    start = el.selectionStart;
    end = el.selectionEnd;
  } catch {
    return true;
  }
  if (start === null || end === null) return true;
  if (start !== end) return true;
  return towardsEnd ? start < el.value.length : start > 0;
}

export function ownsArrowKeys(
  target: EventTarget | null,
  direction?: ArrowKeyDirection,
): boolean {
  const el = asElement(target);
  if (el === null) return false;
  if (el.nodeName === "SELECT") return true;
  if (
    el.nodeName === "INPUT" &&
    ARROW_DRIVEN_INPUT_TYPES.indexOf((el as HTMLInputElement).type) !== -1
  ) {
    return true;
  }
  if (!isEditableElement(el)) return false;
  if (direction === undefined || el.nodeName !== "INPUT") return true;
  if (direction === "up" || direction === "down") return false;
  return caretCanMove(el as HTMLInputElement, direction === "right");
}

export function ownsKeyboardInput(target: EventTarget | null): boolean {
  const el = asElement(target);
  if (el === null) return false;
  if (el.nodeName === "INPUT" || el.nodeName === "SELECT") return true;
  return isEditableElement(el);
}
