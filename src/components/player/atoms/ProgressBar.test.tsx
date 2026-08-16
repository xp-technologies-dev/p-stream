/* eslint-disable import/no-extraneous-dependencies --
   airbnb's allowed-devDependency globs cover `*.test.js` and `*.test.ts` but
   not `*.test.tsx`, so importing vitest here reads as a stray dependency. */
import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProgressBar } from "@/components/player/atoms/ProgressBar";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";
import { collectNavigationCandidates } from "@/utils/navigation/engine";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const DURATION = 3600;
const TIME = 100;

let root: Root | null = null;
let host: HTMLDivElement;
let setTime: ReturnType<typeof vi.fn>;
/** What `Date.now()` reads, so a hold can be measured without waiting one. */
let clock: number;

function mount() {
  act(() => {
    root = createRoot(host);
    root.render(
      <MemoryRouter>
        <ProgressBar />
      </MemoryRouter>,
    );
  });
}

/** The bar itself — the element that takes focus and handles the arrows. */
function bar() {
  return host.querySelector<HTMLElement>('[role="slider"]');
}

function press(el: HTMLElement, key: string, type = "keydown") {
  const event = new KeyboardEvent(type, {
    key,
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    el.dispatchEvent(event);
  });
  return event;
}

function draggingTime() {
  return usePlayerStore.getState().progress.draggingTime;
}

function isSeeking() {
  return usePlayerStore.getState().interface.isSeeking;
}

const RECT = {
  x: 0,
  y: 0,
  width: 800,
  height: 32,
  left: 0,
  top: 0,
  right: 800,
  bottom: 32,
  toJSON: () => ({}),
} as DOMRect;

beforeEach(() => {
  usePreferencesStore.setState({ spatialNavigation: "on" });
  setTime = vi.fn();
  usePlayerStore.setState((s) => {
    s.progress.time = TIME;
    s.progress.duration = DURATION;
    s.progress.buffered = 200;
    s.progress.draggingTime = 0;
    s.interface.isSeeking = false;
    s.display = { setTime, setSeeking: vi.fn() } as any;
    s.meta = null;
  });

  clock = 1_000_000;
  vi.spyOn(Date, "now").mockImplementation(() => clock);
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0 Safari/537.36",
  );
  // jsdom lays nothing out, and the candidate census drops zero-size elements.
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(RECT);
  vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([
    RECT,
  ] as unknown as DOMRectList);

  host = document.createElement("div");
  document.body.append(host);
});

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount();
    });
    root = null;
  }
  document.body.innerHTML = "";
  usePreferencesStore.setState({ spatialNavigation: "off" });
  usePlayerStore.setState((s) => {
    s.display = null;
    s.interface.isSeeking = false;
  });
  vi.restoreAllMocks();
});

describe("the seek bar, while the engine is off", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ spatialNavigation: "off" });
  });

  it("is not focusable and not a candidate", () => {
    mount();

    expect(bar()).toBeNull();
    expect(host.querySelector("[tabindex]")).toBeNull();
    expect(collectNavigationCandidates(host)).toEqual([]);
  });
});

describe("the seek bar, with the engine on", () => {
  it("is somewhere the arrows can land", () => {
    mount();

    expect(bar()).not.toBeNull();
    expect(bar()!.tabIndex).toBe(0);
    expect(collectNavigationCandidates(host)).toContain(bar());
  });

  it("says where it is, for anything that reads the page", () => {
    mount();

    expect(bar()!.getAttribute("aria-valuemin")).toBe("0");
    expect(bar()!.getAttribute("aria-valuemax")).toBe(String(DURATION));
    expect(bar()!.getAttribute("aria-valuenow")).toBe(String(TIME));
    expect(bar()!.getAttribute("aria-valuetext")).toBe("01:40");
  });

  it("scrubs a preview without seeking the video", () => {
    mount();

    const event = press(bar()!, "ArrowRight");

    expect(event.defaultPrevented).toBe(true);
    expect(setTime).not.toHaveBeenCalled();
    expect(draggingTime()).toBe(TIME + 5);
    expect(isSeeking()).toBe(true);
  });

  it("commits once, on release", () => {
    mount();
    press(bar()!, "ArrowRight");

    press(bar()!, "ArrowRight", "keyup");

    expect(setTime).toHaveBeenCalledTimes(1);
    expect(setTime).toHaveBeenCalledWith(TIME + 5);
    expect(isSeeking()).toBe(false);
  });

  it("counts a second tap from where the first one landed", () => {
    mount();
    press(bar()!, "ArrowRight");
    press(bar()!, "ArrowRight", "keyup");

    clock += 200;
    press(bar()!, "ArrowRight");
    press(bar()!, "ArrowRight", "keyup");

    expect(setTime).toHaveBeenLastCalledWith(TIME + 10);
  });

  it("trusts the store again once the seek has had time to land", () => {
    mount();
    press(bar()!, "ArrowRight");
    press(bar()!, "ArrowRight", "keyup");

    clock += 2000;
    press(bar()!, "ArrowRight");
    press(bar()!, "ArrowRight", "keyup");

    expect(setTime).toHaveBeenLastCalledWith(TIME + 5);
  });

  it("seeks backwards on ←, and not past the start", () => {
    mount();

    press(bar()!, "ArrowLeft");
    press(bar()!, "ArrowLeft", "keyup");

    expect(setTime).toHaveBeenCalledWith(TIME - 5);

    press(bar()!, "ArrowLeft");
    // Far enough back that an unclamped scrub would go negative.
    clock += 10000;
    for (let i = 0; i < 12; i += 1) press(bar()!, "ArrowLeft");
    press(bar()!, "ArrowLeft", "keyup");

    expect(setTime).toHaveBeenLastCalledWith(0);
  });

  it("accelerates while the key is held", () => {
    mount();

    press(bar()!, "ArrowRight");
    expect(draggingTime()).toBe(TIME + 5);

    clock += 3000;
    press(bar()!, "ArrowRight");

    expect(draggingTime()).toBe(TIME + 5 + 30);
    expect(setTime).not.toHaveBeenCalled();

    press(bar()!, "ArrowRight", "keyup");
    expect(setTime).toHaveBeenCalledWith(TIME + 35);
  });

  // Turning around should not inherit the speed built up going the other way.
  it("starts over when the direction changes", () => {
    mount();
    press(bar()!, "ArrowRight");
    clock += 5000;
    press(bar()!, "ArrowRight");

    press(bar()!, "ArrowLeft");

    expect(draggingTime()).toBe(TIME + 5 + 60 - 5);
  });

  it("leaves ↑ and ↓ to the engine", () => {
    mount();

    expect(press(bar()!, "ArrowUp").defaultPrevented).toBe(false);
    expect(press(bar()!, "ArrowDown").defaultPrevented).toBe(false);
    expect(isSeeking()).toBe(false);
  });

  it("gives the arrows back when the duration is unknown", () => {
    usePlayerStore.setState((s) => {
      s.progress.duration = 0;
    });
    mount();

    expect(press(bar()!, "ArrowRight").defaultPrevented).toBe(false);
    expect(setTime).not.toHaveBeenCalled();
  });

  // The one way a keyup never arrives.
  it("commits a scrub that loses focus mid-hold", () => {
    mount();
    act(() => {
      bar()!.focus();
    });
    press(bar()!, "ArrowRight");

    act(() => {
      bar()!.blur();
    });

    expect(setTime).toHaveBeenCalledWith(TIME + 5);
  });
});
