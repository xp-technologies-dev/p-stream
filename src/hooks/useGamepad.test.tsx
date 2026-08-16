/* eslint-disable import/no-extraneous-dependencies --
   airbnb's allowed-devDependency globs cover `*.test.js` and `*.test.ts` but
   not `*.test.tsx`. */
import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_GAMEPAD_MAPPING,
  DEFAULT_PLAYER_GAMEPAD_MAPPING,
  resolveGamepadMapping,
  useGamepadPolling,
} from "@/hooks/useGamepad";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("resolveGamepadMapping", () => {
  it("is the general table with nothing saved", () => {
    expect(resolveGamepadMapping({}, false)).toEqual(DEFAULT_GAMEPAD_MAPPING);
  });

  it("is the player table with nothing saved, in transport mode", () => {
    expect(resolveGamepadMapping({}, true)).toEqual(
      DEFAULT_PLAYER_GAMEPAD_MAPPING,
    );
  });

  it("takes the saved remap outside the player", () => {
    const mapping = resolveGamepadMapping({ actionWest: "mute" }, false);

    expect(mapping.actionWest).toBe("mute");
    expect(mapping.dpadUp).toBe("navigate-up");
  });

  it("ignores a saved entry that is only the general default", () => {
    const saved = { ...DEFAULT_GAMEPAD_MAPPING } as Record<string, string>;

    expect(resolveGamepadMapping(saved, true)).toEqual(
      DEFAULT_PLAYER_GAMEPAD_MAPPING,
    );
  });

  // A button deliberately assigned to something should mean that everywhere.
  it("carries a real remap into the player", () => {
    const saved = {
      ...DEFAULT_GAMEPAD_MAPPING,
      select: "confirm",
    } as Record<string, string>;

    const mapping = resolveGamepadMapping(saved, true);

    expect(mapping.select).toBe("confirm");
    expect(mapping.dpadUp).toBe("volume-up");
  });
});

const BUTTON = { ACTION_SOUTH: 0, DPAD_UP: 12 };

function pad(index: number, pressed: number[]): Gamepad {
  const buttons = Array.from({ length: 16 }, (_unused, i) => ({
    pressed: pressed.indexOf(i) !== -1,
    touched: false,
    value: 0,
  }));
  return { index, buttons } as unknown as Gamepad;
}

let pads: (Gamepad | null)[] = [];
let frames: FrameRequestCallback[] = [];
let root: Root | null = null;
let host: HTMLDivElement;
const actions = vi.fn();

/** Runs exactly one poll. The loop re-queues itself, so this drains and refills. */
function step() {
  const queued = frames;
  frames = [];
  act(() => {
    queued.forEach((cb) => cb(0));
  });
}

function Harness({ enabled }: { enabled: boolean }) {
  useGamepadPolling({ onAction: actions, enabled });
  return null;
}

function mount(enabled = true) {
  act(() => {
    root = createRoot(host);
    root.render(<Harness enabled={enabled} />);
  });
}

beforeEach(() => {
  pads = [];
  frames = [];
  actions.mockClear();
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    frames.push(cb);
    return frames.length;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
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
  vi.restoreAllMocks();
});

describe("useGamepadPolling", () => {
  it("does not poll at all while disabled", () => {
    pads = [pad(0, [BUTTON.ACTION_SOUTH])];
    mount(false);

    expect(frames).toEqual([]);
  });

  it("fires once on the press, not for every frame it is held", () => {
    mount();
    pads = [pad(0, [BUTTON.ACTION_SOUTH])];

    step();
    step();
    step();

    expect(actions.mock.calls).toEqual([["confirm"]]);
  });

  it("fires again after a release and a second press", () => {
    mount();
    pads = [pad(0, [BUTTON.DPAD_UP])];
    step();
    pads = [pad(0, [])];
    step();
    pads = [pad(0, [BUTTON.DPAD_UP])];
    step();

    expect(actions.mock.calls).toEqual([["navigate-up"], ["navigate-up"]]);
  });

  it("hears a controller that is not in the first slot", () => {
    mount();
    pads = [null, pad(1, [BUTTON.ACTION_SOUTH])];

    step();

    expect(actions.mock.calls).toEqual([["confirm"]]);
  });

  it("keeps each controller's edge state to itself", () => {
    mount();
    pads = [pad(0, [BUTTON.ACTION_SOUTH]), pad(1, [])];
    step();
    // Pad 1 taps the same button twice while pad 0 never lets go.
    pads = [pad(0, [BUTTON.ACTION_SOUTH]), pad(1, [BUTTON.ACTION_SOUTH])];
    step();
    pads = [pad(0, [BUTTON.ACTION_SOUTH]), pad(1, [])];
    step();
    pads = [pad(0, [BUTTON.ACTION_SOUTH]), pad(1, [BUTTON.ACTION_SOUTH])];
    step();

    // Three presses total, and pad 0's hold contributed exactly one of them.
    expect(actions.mock.calls).toEqual([["confirm"], ["confirm"], ["confirm"]]);
  });

  // A pad unplugged mid-press would otherwise stay recorded as held.
  it("forgets a controller that goes away", () => {
    mount();
    pads = [pad(0, [BUTTON.ACTION_SOUTH])];
    step();
    pads = [];
    step();
    pads = [pad(0, [BUTTON.ACTION_SOUTH])];
    step();

    expect(actions.mock.calls).toEqual([["confirm"], ["confirm"]]);
  });
});
