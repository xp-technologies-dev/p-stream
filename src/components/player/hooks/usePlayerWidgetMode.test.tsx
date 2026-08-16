/* eslint-disable import/no-extraneous-dependencies --
   airbnb's allowed-devDependency globs cover `*.test.js` and `*.test.ts` but
   not `*.test.tsx`, so importing vitest here reads as a stray dependency. */
import { act, useRef } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePlayerWidgetMode } from "@/components/player/hooks/usePlayerWidgetMode";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";
import { WIDGET_IDLE_MS } from "@/utils/navigation/playerMode";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function Harness() {
  const ref = useRef<HTMLDivElement | null>(null);
  const widgetMode = usePlayerWidgetMode(ref);

  return (
    <div
      ref={ref}
      data-testid="player"
      data-nav-skip={widgetMode ? undefined : ""}
      data-nav-scope={widgetMode ? "" : undefined}
    >
      <button type="button" id="back">
        back
      </button>
      <div data-nav-first>
        <button type="button" id="pause">
          pause
        </button>
      </div>
    </div>
  );
}

let root: Root | null = null;
let host: HTMLDivElement;

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

function unmount() {
  act(() => {
    root?.unmount();
  });
  root = null;
}

function player() {
  return host.querySelector<HTMLElement>("[data-testid=player]");
}

function press(key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  act(() => {
    (document.activeElement ?? document.body).dispatchEvent(event);
  });
  return event;
}

function isWidgetMode() {
  return usePlayerStore.getState().interface.widgetMode;
}

const RECT = {
  x: 0,
  y: 0,
  width: 100,
  height: 40,
  left: 0,
  top: 0,
  right: 100,
  bottom: 40,
  toJSON: () => ({}),
} as DOMRect;

beforeEach(() => {
  usePreferencesStore.setState({ spatialNavigation: "off" });
  usePlayerStore.setState((s) => {
    s.interface.widgetMode = false;
    s.interface.hasOpenOverlay = false;
  });
  vi.spyOn(window, "scrollBy").mockImplementation(() => {});
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0 Safari/537.36",
  );
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(RECT);
  vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([
    RECT,
  ] as unknown as DOMRectList);

  host = document.createElement("div");
  document.body.append(host);
});

afterEach(() => {
  if (root) unmount();
  document.body.innerHTML = "";
  usePreferencesStore.setState({ spatialNavigation: "off" });
  usePlayerStore.setState((s) => {
    s.interface.widgetMode = false;
    s.interface.hasOpenOverlay = false;
  });
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("transport mode", () => {
  it("is what the player mounts in, with the preference off", () => {
    mount();

    expect(player()!.hasAttribute("data-nav-skip")).toBe(true);
    expect(player()!.hasAttribute("data-nav-scope")).toBe(false);
  });

  it("does not switch on OK while dormant", () => {
    mount();

    const event = press("Enter");

    expect(isWidgetMode()).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it.each(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"])(
    "leaves %s to transport while dormant",
    (key) => {
      mount();

      const event = press(key);

      expect(isWidgetMode()).toBe(false);
      expect(event.defaultPrevented).toBe(false);
    },
  );

  it("attaches no listener at all while dormant", () => {
    const onDocument = vi.spyOn(document, "addEventListener");
    mount();

    expect(
      onDocument.mock.calls.filter(([type]) => type === "keydown"),
    ).toEqual([]);
  });
});

describe("widget mode", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ spatialNavigation: "on" });
  });

  it("opens on OK, and swaps the skip for a scope", () => {
    mount();

    const event = press("Enter");

    expect(isWidgetMode()).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(player()!.hasAttribute("data-nav-skip")).toBe(false);
    expect(player()!.hasAttribute("data-nav-scope")).toBe(true);
  });

  it.each(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"])(
    "opens on %s, and claims the press so nothing seeks on it",
    (key) => {
      mount();

      const event = press(key);

      expect(isWidgetMode()).toBe(true);
      expect(event.defaultPrevented).toBe(true);
      expect(player()!.hasAttribute("data-nav-scope")).toBe(true);
    },
  );

  it("does not also take a step on the arrow that opened it", () => {
    mount();

    press("ArrowUp");

    expect(document.activeElement?.id).toBe("pause");
  });

  it("opens on an arrow even with focus already on a control", () => {
    mount();
    const pause = host.querySelector<HTMLElement>("#pause")!;
    pause.focus();

    const event = press("ArrowLeft");

    expect(isWidgetMode()).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves a field the arrow that moves its caret", () => {
    mount();
    const input = document.createElement("input");
    input.value = "hello";
    player()!.append(input);
    input.focus();
    input.setSelectionRange(2, 2);

    const event = press("ArrowLeft");

    expect(isWidgetMode()).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it("takes the one it cannot answer", () => {
    mount();
    const input = document.createElement("input");
    input.value = "hello";
    player()!.append(input);
    input.focus();

    const event = press("ArrowUp");

    expect(isWidgetMode()).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it("puts focus on the marked control", () => {
    mount();
    press("Enter");

    expect(document.activeElement?.id).toBe("pause");
  });

  it("closes on Back, and does not let the press go on to cost a route", () => {
    mount();
    press("Enter");

    const event = press("Escape");

    expect(isWidgetMode()).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(player()!.hasAttribute("data-nav-skip")).toBe(true);
  });

  it("takes focus off the controls on the way out", () => {
    mount();
    press("Enter");
    expect(document.activeElement?.id).toBe("pause");

    press("Escape");

    expect(document.activeElement).toBe(document.body);
  });

  // One press per layer. The popout is what Back means while it is open.
  it("closes a popout before it closes the mode", () => {
    mount();
    press("Enter");
    act(() => {
      usePlayerStore.setState((s) => {
        s.interface.hasOpenOverlay = true;
      });
    });

    const event = press("Escape");

    expect(isWidgetMode()).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not re-enter on OK once it is already on", () => {
    mount();
    press("Enter");

    const event = press("Enter");

    expect(isWidgetMode()).toBe(true);
    expect(event.defaultPrevented).toBe(false);
  });

  it("falls back to transport after a stretch of silence", () => {
    vi.useFakeTimers();
    mount();
    press("Enter");

    act(() => {
      vi.advanceTimersByTime(WIDGET_IDLE_MS + 1);
    });

    expect(isWidgetMode()).toBe(false);
  });

  it("re-opens on an arrow after it has timed out", () => {
    vi.useFakeTimers();
    mount();
    press("Enter");
    act(() => {
      vi.advanceTimersByTime(WIDGET_IDLE_MS + 1);
    });
    expect(isWidgetMode()).toBe(false);

    const event = press("ArrowRight");

    expect(isWidgetMode()).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it("is re-armed by any key press, including the arrows it is being used with", () => {
    vi.useFakeTimers();
    mount();
    press("Enter");

    act(() => {
      vi.advanceTimersByTime(WIDGET_IDLE_MS - 100);
    });
    press("ArrowRight");
    act(() => {
      vi.advanceTimersByTime(WIDGET_IDLE_MS - 100);
    });

    expect(isWidgetMode()).toBe(true);
  });

  // Reading an episode list is not idleness.
  it("does not time out while a popout is open", () => {
    vi.useFakeTimers();
    mount();
    press("Enter");
    act(() => {
      usePlayerStore.setState((s) => {
        s.interface.hasOpenOverlay = true;
      });
    });
    act(() => {
      vi.advanceTimersByTime(WIDGET_IDLE_MS * 3);
    });

    expect(isWidgetMode()).toBe(true);
  });

  it("resets when the player unmounts", () => {
    mount();
    press("Enter");
    expect(isWidgetMode()).toBe(true);

    unmount();

    expect(isWidgetMode()).toBe(false);
  });

  it("collapses back to transport if the engine is turned off under it", () => {
    mount();
    press("Enter");

    act(() => {
      usePreferencesStore.setState({ spatialNavigation: "off" });
    });

    expect(player()!.hasAttribute("data-nav-skip")).toBe(true);
    expect(document.activeElement).toBe(document.body);
  });
});
