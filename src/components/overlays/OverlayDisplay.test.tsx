/* eslint-disable import/no-extraneous-dependencies --
   airbnb's allowed-devDependency globs cover `*.test.js` and `*.test.ts` but
   not `*.test.tsx`, so importing vitest here reads as a stray dependency. */
import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OverlayPortal } from "@/components/overlays/OverlayDisplay";
import { getScopeDepth } from "@/utils/browser/focusScopes";
import { collectNavigationCandidates } from "@/utils/navigation/engine";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function place(el: Element, x: number, y: number, w = 100, h = 40) {
  const rect = {
    x,
    y,
    width: w,
    height: h,
    left: x,
    top: y,
    right: x + w,
    bottom: y + h,
    toJSON: () => ({}),
  } as DOMRect;
  (el as HTMLElement).getBoundingClientRect = () => rect;
  (el as HTMLElement).getClientRects = () => [rect] as unknown as DOMRectList;
}

let root: Root | null = null;
let host: HTMLDivElement;

function render(show: boolean) {
  act(() => {
    root!.render(
      <OverlayPortal show={show}>
        <button type="button">inside the modal</button>
      </OverlayPortal>,
    );
    vi.runOnlyPendingTimers();
  });
}

function wrapper() {
  return document.querySelector(".popout-wrapper");
}

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement("div");
  document.body.append(host);
  act(() => {
    root = createRoot(host);
  });
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("OverlayPortal — closing window", () => {
  it("does not mark the wrapper while the overlay is open", () => {
    render(true);

    expect(wrapper()).not.toBeNull();
    expect(wrapper()!.hasAttribute("data-nav-skip")).toBe(false);
    expect(getScopeDepth()).toBe(1);
  });

  it("keeps the dying overlay's controls out of the candidate set", () => {
    render(true);
    const button = document.querySelector(".popout-wrapper button")!;
    place(button, 100, 100);
    place(wrapper()!, 0, 0, 800, 600);

    expect(collectNavigationCandidates()).toContain(button);

    render(false);

    expect(collectNavigationCandidates()).not.toContain(button);
  });

  it("comes back clean when the same overlay opens again", () => {
    render(true);
    render(false);
    render(true);

    expect(wrapper()!.hasAttribute("data-nav-skip")).toBe(false);
    expect(getScopeDepth()).toBe(1);
  });

  it("settles back to no scopes after five open/close cycles", () => {
    for (let i = 0; i < 5; i += 1) {
      render(true);
      render(false);
    }

    expect(getScopeDepth()).toBe(0);
  });
});
