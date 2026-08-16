const OBSTRUCT_SELECTOR = "[data-nav-obstruct]";

export function layerOf(el: Element): HTMLElement | null {
  return el.closest<HTMLElement>(OBSTRUCT_SELECTOR);
}

/** The viewport, minus the bands the chrome is sitting on. */
export interface ViewportBounds {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

function hugsEdge(gap: number, size: number): boolean {
  return gap < size;
}

export function safeViewport(): ViewportBounds {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const bounds: ViewportBounds = {
    top: 0,
    right: width,
    bottom: height,
    left: 0,
  };

  const nodes = document.querySelectorAll<HTMLElement>(OBSTRUCT_SELECTOR);
  for (let i = 0; i < nodes.length; i += 1) {
    const rect = nodes[i].getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    if (rect.height / height <= rect.width / width) {
      if (hugsEdge(rect.top, rect.height)) {
        bounds.top = Math.max(bounds.top, rect.bottom);
      }
      if (hugsEdge(height - rect.bottom, rect.height)) {
        bounds.bottom = Math.min(bounds.bottom, rect.top);
      }
    } else {
      if (hugsEdge(rect.left, rect.width)) {
        bounds.left = Math.max(bounds.left, rect.right);
      }
      if (hugsEdge(width - rect.right, rect.width)) {
        bounds.right = Math.min(bounds.right, rect.left);
      }
    }
  }

  return bounds;
}
