import { directionForKey, isNavSkipped, moveFocus } from "./engine";

/** The wrapper `Dropdown` marks, and the only subtree this applies to. */
const ROOT_SELECTOR = "[data-nav-dropdown]";

const TRIGGER_SELECTOR = '[aria-haspopup="listbox"]';

export function handleDropdownKeydown(
  event: KeyboardEvent,
  isEnabled: () => boolean,
): boolean {
  if (event.defaultPrevented) return false;

  const target = event.target;
  if (!(target instanceof Element)) return false;
  const root = target.closest<HTMLElement>(ROOT_SELECTOR);
  if (root === null) return false;

  if (isNavSkipped(target)) return false;

  const direction = directionForKey(event);
  if (direction === null) return false;
  if (!isEnabled()) return false;

  const trigger = root.querySelector<HTMLElement>(TRIGGER_SELECTOR);
  if (trigger === null) return false;

  const open = trigger.getAttribute("aria-expanded") === "true";
  const vertical = direction === "up" || direction === "down";

  if (open ? vertical : !vertical) return false;

  event.stopPropagation();

  if (open) {
    event.preventDefault();
    trigger.click();
    return true;
  }

  if (!moveFocus(direction)) return false;
  event.preventDefault();
  return true;
}
