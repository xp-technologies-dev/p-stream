import { Direction } from "./spatial";
import { safeViewport } from "./obstructions";

const EDGE_MARGIN = 24;

const LOOKAHEAD = 0.25;

export function scrollDelta(
  min: number,
  max: number,
  boundsMin: number,
  boundsMax: number,
  marginMin = EDGE_MARGIN,
  marginMax = marginMin,
): number {
  let low = marginMin;
  let high = marginMax;

  if (max - min > boundsMax - boundsMin - low - high) {
    low = Math.min(low, EDGE_MARGIN);
    high = Math.min(high, EDGE_MARGIN);
  }

  const leadingGap = min - (boundsMin + low);
  const trailingGap = max - (boundsMax - high);

  if (max - min > boundsMax - boundsMin - low - high) return leadingGap;

  if (leadingGap < 0) return leadingGap;
  if (trailingGap > 0) return trailingGap;
  return 0;
}

function axisMargins(
  size: number,
  towardsMax: boolean | null,
  margin: number,
): [number, number] {
  if (towardsMax === null) return [margin, margin];
  const band = Math.max(margin, size * LOOKAHEAD);
  return towardsMax ? [margin, band] : [band, margin];
}

/** Whether `direction` travels towards the high end of each axis, or is not on it. */
function axisSense(direction: Direction | undefined) {
  if (direction === undefined) return { x: null, y: null };
  return {
    x: direction === "right" ? true : direction === "left" ? false : null,
    y: direction === "down" ? true : direction === "up" ? false : null,
  };
}

function scrolls(el: Element, horizontal: boolean): boolean {
  const style = window.getComputedStyle(el);
  const overflow = horizontal ? style.overflowX : style.overflowY;
  if (overflow !== "auto" && overflow !== "scroll") return false;
  return horizontal
    ? el.scrollWidth > el.clientWidth
    : el.scrollHeight > el.clientHeight;
}

export function scrollIntoViewport(
  el: HTMLElement,
  direction?: Direction,
  margin = EDGE_MARGIN,
) {
  const sense = axisSense(direction);
  let node: HTMLElement | null = el.parentElement;

  while (node && node !== document.body && node !== document.documentElement) {
    const bounds = node.getBoundingClientRect();

    if (scrolls(node, false)) {
      const rect = el.getBoundingClientRect();
      const [top, bottom] = axisMargins(node.clientHeight, sense.y, margin);
      const dy = scrollDelta(
        rect.top,
        rect.bottom,
        bounds.top,
        bounds.bottom,
        top,
        bottom,
      );
      if (dy !== 0) node.scrollTop += dy;
    }
    if (scrolls(node, true)) {
      const rect = el.getBoundingClientRect();
      const [left, right] = axisMargins(node.clientWidth, sense.x, margin);
      const dx = scrollDelta(
        rect.left,
        rect.right,
        bounds.left,
        bounds.right,
        left,
        right,
      );
      if (dx !== 0) node.scrollLeft += dx;
    }

    node = node.parentElement;
  }

  const safe = safeViewport();
  const rect = el.getBoundingClientRect();
  const [left, right] = axisMargins(safe.right - safe.left, sense.x, margin);
  const [top, bottom] = axisMargins(safe.bottom - safe.top, sense.y, margin);
  const dx = scrollDelta(
    rect.left,
    rect.right,
    safe.left,
    safe.right,
    left,
    right,
  );
  const dy = scrollDelta(
    rect.top,
    rect.bottom,
    safe.top,
    safe.bottom,
    top,
    bottom,
  );
  if (dx !== 0 || dy !== 0) window.scrollBy(dx, dy);
}
