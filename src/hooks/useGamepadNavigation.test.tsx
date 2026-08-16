/* eslint-disable import/no-extraneous-dependencies --
   airbnb's allowed-devDependency globs cover `*.test.js` and `*.test.ts` but
   not `*.test.tsx`. */
import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  useGamepadNavigation,
  useGamepadPlayerActions,
} from "@/hooks/useGamepadNavigation";
import { usePreferencesStore } from "@/stores/preferences";
import { initInputModality } from "@/utils/browser/inputModality";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const BUTTON = { ACTION_SOUTH: 0, ACTION_EAST: 1, DPAD_UP: 12 };

function pad(pressed: number[]): Gamepad {
  const buttons = Array.from({ length: 16 }, (_unused, i) => ({
    pressed: pressed.indexOf(i) !== -1,
    touched: false,
    value: 0,
  }));
  return { index: 0, buttons } as unknown as Gamepad;
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

let pads: (Gamepad | null)[] = [];
let frames: FrameRequestCallback[] = [];
let root: Root | null = null;
let host: HTMLDivElement;
const playerActions = vi.fn();

function step() {
  const queued = frames;
  frames = [];
  act(() => {
    queued.forEach((cb) => cb(0));
  });
}

/** Presses one button and releases it, which is one poll each way. */
function pressButton(index: number) {
  pads = [pad([index])];
  step();
  pads = [pad([])];
  step();
}

function Adapter() {
  useGamepadNavigation();
  return null;
}

/** Stands in for `GamepadEvents`, which is the player's half of the split. */
function PlayerActions({ transport }: { transport: boolean }) {
  useGamepadPlayerActions(playerActions, transport);
  return null;
}

function mount(node: React.ReactNode) {
  act(() => {
    root = createRoot(host);
    root.render(node);
  });
}

function render(node: React.ReactNode) {
  act(() => {
    root?.render(node);
  });
}

beforeEach(() => {
  pads = [];
  frames = [];
  playerActions.mockClear();
  usePreferencesStore.setState({
    enableGamepadControls: true,
    gamepadMapping: {},
  });
  // Resets the modality module's own state, which outlives one test.
  initInputModality()();

  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    frames.push(cb);
    return frames.length;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  vi.spyOn(window, "scrollBy").mockImplementation(() => {});
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(RECT);
  vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([
    RECT,
  ] as unknown as DOMRectList);
  Object.defineProperty(navigator, "getGamepads", {
    value: () => pads,
    configurable: true,
    writable: true,
  });

  host = document.createElement("div");
  document.body.append(host);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-input-modality");
  usePreferencesStore.setState({
    enableGamepadControls: false,
    gamepadMapping: {},
  });
  vi.restoreAllMocks();
});

function watchKeys() {
  const keys: string[] = [];
  const listener = (event: Event) => keys.push((event as KeyboardEvent).key);
  document.addEventListener("keydown", listener);
  return {
    keys,
    stop: () => document.removeEventListener("keydown", listener),
  };
}

function focusTarget() {
  const el = document.createElement("button");
  el.type = "button";
  document.body.append(el);
  el.focus();
  return el;
}

describe("useGamepadNavigation", () => {
  it("does not poll with the preference off and no controller in sight", () => {
    usePreferencesStore.setState({ enableGamepadControls: false });
    mount(<Adapter />);

    expect(frames).toEqual([]);
  });

  it("starts polling as soon as a controller announces itself", () => {
    usePreferencesStore.setState({ enableGamepadControls: false });
    focusTarget();
    mount(<Adapter />);
    expect(frames).toEqual([]);

    act(() => {
      window.dispatchEvent(new Event("gamepadconnected"));
    });
    const watch = watchKeys();
    pressButton(BUTTON.DPAD_UP);

    expect(watch.keys).toEqual(["ArrowUp"]);
    watch.stop();
  });

  it("turns the D-pad into arrow keys", () => {
    focusTarget();
    mount(<Adapter />);
    const watch = watchKeys();

    pressButton(BUTTON.DPAD_UP);

    expect(watch.keys).toEqual(["ArrowUp"]);
    watch.stop();
  });

  it("declares the input key-like, so focus rings come back", () => {
    focusTarget();
    mount(<Adapter />);

    pressButton(BUTTON.DPAD_UP);

    expect(document.documentElement.dataset.inputModality).toBe("key");
  });

  it("hands a playback action to the player instead", () => {
    focusTarget();
    mount(
      <>
        <Adapter />
        <PlayerActions transport />
      </>,
    );
    const watch = watchKeys();

    // In transport mode the D-pad is the player's volume and seek.
    pressButton(BUTTON.DPAD_UP);

    expect(playerActions.mock.calls).toEqual([["volume-up"]]);
    expect(watch.keys).toEqual([]);
    watch.stop();
  });

  it("gives the D-pad back to navigation in widget mode", () => {
    focusTarget();
    mount(
      <>
        <Adapter />
        <PlayerActions transport />
      </>,
    );
    render(
      <>
        <Adapter />
        <PlayerActions transport={false} />
      </>,
    );
    const watch = watchKeys();

    pressButton(BUTTON.DPAD_UP);

    expect(watch.keys).toEqual(["ArrowUp"]);
    expect(playerActions).not.toHaveBeenCalled();
    watch.stop();
  });

  it("sends back through Escape even while the player owns the pad", () => {
    focusTarget();
    mount(
      <>
        <Adapter />
        <PlayerActions transport />
      </>,
    );
    const watch = watchKeys();

    pressButton(BUTTON.ACTION_EAST);

    expect(watch.keys).toEqual(["Escape"]);
    expect(playerActions).not.toHaveBeenCalled();
    watch.stop();
  });

  it("goes back to the general mapping when the player unmounts", () => {
    focusTarget();
    mount(
      <>
        <Adapter />
        <PlayerActions transport />
      </>,
    );
    render(<Adapter />);
    const watch = watchKeys();

    pressButton(BUTTON.ACTION_SOUTH);

    expect(watch.keys).toEqual(["Enter"]);
    expect(playerActions).not.toHaveBeenCalled();
    watch.stop();
  });

  it("honours a saved remap", () => {
    focusTarget();
    usePreferencesStore.setState({
      gamepadMapping: { actionSouth: "navigate-left" },
    });
    mount(<Adapter />);
    const watch = watchKeys();

    pressButton(BUTTON.ACTION_SOUTH);

    expect(watch.keys).toEqual(["ArrowLeft"]);
    watch.stop();
  });
});
