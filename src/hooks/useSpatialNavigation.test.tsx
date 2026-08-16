/* eslint-disable import/no-extraneous-dependencies --
   airbnb's allowed-devDependency globs cover `*.test.js` and `*.test.ts` but
   not `*.test.tsx`, so importing vitest here reads as a stray dependency. */
import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSpatialNavigation } from "@/hooks/useSpatialNavigation";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { usePreferencesStore } from "@/stores/preferences";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function place(el: HTMLElement, x: number, y: number, w = 100, h = 40) {
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
  el.getBoundingClientRect = () => rect;
  el.getClientRects = () => [rect] as unknown as DOMRectList;
  return el;
}

function Harness() {
  useSpatialNavigation();
  return null;
}

let root: Root | null = null;
let host: HTMLDivElement;
let first: HTMLButtonElement;
let second: HTMLButtonElement;

function mount() {
  act(() => {
    root = createRoot(host);
    root.render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>,
    );
  });
}

async function nextFrame() {
  await act(async () => {
    await new Promise((resolve) => {
      requestAnimationFrame(() => resolve(null));
    });
  });
}

async function pastRouteEntry() {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 600);
    });
  });
}

function unmount() {
  act(() => {
    root?.unmount();
  });
  root = null;
}

/** A real bubbling keydown, the way the browser delivers one. */
function press(el: HTMLElement, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  act(() => {
    el.dispatchEvent(event);
  });
  return event;
}

function pressArrowRight() {
  return press(first, "ArrowRight");
}

beforeEach(() => {
  usePreferencesStore.setState({ spatialNavigation: "off" });
  useOverlayStack.setState({ modalStack: [] });
  vi.spyOn(window, "scrollBy").mockImplementation(() => {});
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0 Safari/537.36",
  );

  host = document.createElement("div");
  first = place(document.createElement("button"), 0, 0) as HTMLButtonElement;
  second = place(document.createElement("button"), 120, 0) as HTMLButtonElement;
  document.body.append(host, first, second);
  first.focus();
});

afterEach(() => {
  if (root) unmount();
  document.body.innerHTML = "";
  usePreferencesStore.setState({ spatialNavigation: "off" });
  useOverlayStack.setState({ modalStack: [] });
  vi.restoreAllMocks();
});

describe("useSpatialNavigation", () => {
  it("does nothing at all with the preference off", () => {
    mount();

    const event = pressArrowRight();

    expect(document.activeElement).toBe(first);
    expect(event.defaultPrevented).toBe(false);
  });

  it("attaches no listeners at all while dormant", () => {
    const onWindow = vi.spyOn(window, "addEventListener");
    const onDocument = vi.spyOn(document, "addEventListener");
    const observe = vi.spyOn(MutationObserver.prototype, "observe");
    mount();

    expect(onWindow.mock.calls.filter(([type]) => type === "keydown")).toEqual(
      [],
    );
    expect(
      onDocument.mock.calls.filter(([type]) =>
        ["keydown", "focusout", "focusin"].includes(type as string),
      ),
    ).toEqual([]);
    expect(observe).not.toHaveBeenCalled();
  });

  it("navigates once the preference is on", () => {
    usePreferencesStore.setState({ spatialNavigation: "on" });
    mount();

    const event = pressArrowRight();

    expect(document.activeElement).toBe(second);
    expect(event.defaultPrevented).toBe(true);
  });

  it("picks up a preference flipped while mounted", () => {
    mount();
    expect(pressArrowRight().defaultPrevented).toBe(false);

    act(() => {
      usePreferencesStore.setState({ spatialNavigation: "on" });
    });

    expect(pressArrowRight().defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(second);
  });

  it("overrides the preference on a TV", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 76.0.3809.146/6.0 TV Safari/537.36",
    );
    mount();

    pressArrowRight();

    expect(document.activeElement).toBe(second);
  });

  it("turns on when a gamepad arrives mid-session", () => {
    mount();
    expect(pressArrowRight().defaultPrevented).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("gamepadconnected"));
    });

    expect(pressArrowRight().defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(second);
  });

  it("stops listening when it unmounts", () => {
    usePreferencesStore.setState({ spatialNavigation: "on" });
    mount();
    unmount();

    const event = pressArrowRight();

    expect(document.activeElement).toBe(first);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe("activation, wired up", () => {
  let widget: HTMLDivElement;
  let clicks: number;

  beforeEach(() => {
    clicks = 0;
    widget = place(document.createElement("div"), 0, 200) as HTMLDivElement;
    widget.setAttribute("tabindex", "0");
    widget.addEventListener("click", () => {
      clicks += 1;
    });
    document.body.appendChild(widget);
  });

  it("clicks a tabbable div on Enter", () => {
    usePreferencesStore.setState({ spatialNavigation: "on" });
    mount();

    expect(press(widget, "Enter").defaultPrevented).toBe(true);
    expect(clicks).toBe(1);
  });

  it("leaves Enter alone while dormant", () => {
    mount();

    expect(press(widget, "Enter").defaultPrevented).toBe(false);
    expect(clicks).toBe(0);
  });
});

describe("back, wired up", () => {
  function watchBack() {
    return vi.spyOn(window.history, "back").mockImplementation(() => {});
  }

  beforeEach(() => {
    window.history.pushState({ idx: 1 }, "");
  });

  it("goes back on the back button with nothing on screen to close", () => {
    const back = watchBack();
    usePreferencesStore.setState({ spatialNavigation: "on" });
    mount();

    press(first, "Unidentified", { keyCode: 10009 });

    expect(back).toHaveBeenCalledTimes(1);
  });

  it("does not go back on the Escape key", () => {
    const back = watchBack();
    usePreferencesStore.setState({ spatialNavigation: "on" });
    mount();

    press(first, "Escape");

    expect(back).not.toHaveBeenCalled();
  });

  it("does not go back on the back button while dormant", () => {
    const back = watchBack();
    mount();

    press(first, "Unidentified", { keyCode: 10009 });

    expect(back).not.toHaveBeenCalled();
  });

  it("defers to the modal handler, even though it has already run", () => {
    const back = watchBack();
    usePreferencesStore.setState({ spatialNavigation: "on" });
    useOverlayStack.setState({ modalStack: ["details"] });

    const closeTopModal = (event: Event) => {
      if ((event as KeyboardEvent).key !== "Escape") return;
      useOverlayStack.setState({ modalStack: [] });
    };
    document.addEventListener("keydown", closeTopModal);
    mount();

    try {
      press(first, "Escape");
    } finally {
      document.removeEventListener("keydown", closeTopModal);
    }

    expect(useOverlayStack.getState().modalStack).toEqual([]);
    expect(back).not.toHaveBeenCalled();
  });

  it("stands down when something else handled the press", () => {
    const back = watchBack();
    usePreferencesStore.setState({ spatialNavigation: "on" });
    const swallow = (event: Event) => event.preventDefault();
    document.addEventListener("keydown", swallow);
    mount();

    try {
      press(first, "Escape");
    } finally {
      document.removeEventListener("keydown", swallow);
    }

    expect(back).not.toHaveBeenCalled();
  });
});

describe("route entry and focus recovery, wired up", () => {
  it("puts focus somewhere when a route arrives with focus nowhere", async () => {
    usePreferencesStore.setState({ spatialNavigation: "on" });
    (document.activeElement as HTMLElement | null)?.blur();
    mount();

    await nextFrame();

    expect(document.activeElement).toBe(first);
  });

  it("leaves focus alone when it is already on a control", async () => {
    usePreferencesStore.setState({ spatialNavigation: "on" });
    second.focus();
    mount();

    await nextFrame();

    expect(document.activeElement).toBe(second);
  });

  it("recovers focus when the focused element is destroyed", async () => {
    usePreferencesStore.setState({ spatialNavigation: "on" });
    mount();
    await pastRouteEntry();
    first.focus();

    first.remove();

    await nextFrame();

    expect(document.activeElement).toBe(second);
  });

  it("recovers focus when the element vanishes with no focusout", async () => {
    usePreferencesStore.setState({ spatialNavigation: "on" });
    mount();
    await pastRouteEntry();
    first.focus();
    const swallow = (event: Event) => event.stopImmediatePropagation();
    document.addEventListener("focusout", swallow, true);

    first.remove();
    await nextFrame();
    await nextFrame();
    document.removeEventListener("focusout", swallow, true);

    expect(document.activeElement).toBe(second);
  });

  it("does neither while dormant", async () => {
    mount();
    first.focus();
    first.remove();

    await nextFrame();

    expect(document.activeElement).toBe(document.body);
  });
});
