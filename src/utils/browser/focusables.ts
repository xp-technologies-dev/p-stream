export const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"]):not([type="hidden"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]:not([contenteditable="false"]):not([tabindex="-1"])',
].join(",");

export function isFocusableVisible(el: HTMLElement): boolean {
  if (el.getClientRects().length === 0) return false;

  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  if (window.getComputedStyle(el).visibility !== "visible") return false;

  return true;
}

export function collectFocusables(
  scope: HTMLElement | Document = document,
): HTMLElement[] {
  const nodes = scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  const out: HTMLElement[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    if (isFocusableVisible(nodes[i])) out.push(nodes[i]);
  }
  return out;
}
