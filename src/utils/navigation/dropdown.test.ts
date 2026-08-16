/* eslint-disable import/no-extraneous-dependencies */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleDropdownKeydown } from "./dropdown";

const enabled = () => true;

/** jsdom has no layout, and every move below is decided by geometry. */
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

function button(label: string, x: number, y: number, w = 100, h = 40) {
  const el = document.createElement("button");
  el.textContent = label;
  return place(el, x, y, w, h);
}

let clicks: string[] = [];

function dropdown(x: number, y: number, open: boolean) {
  const root = document.createElement("div");
  root.setAttribute("data-nav-dropdown", "");

  const trigger = button("Language", x, y);
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", String(open));
  trigger.addEventListener("click", () => {
    clicks.push("trigger");
    trigger.setAttribute("aria-expanded", "false");
    root.querySelector("[role=listbox]")?.remove();
    trigger.focus();
  });
  root.appendChild(trigger);

  let options: HTMLElement | null = null;
  if (open) {
    options = document.createElement("ul");
    options.setAttribute("role", "listbox");
    options.tabIndex = 0;
    place(options, x, y + 40, 100, 120);
    root.appendChild(options);
  }

  document.body.appendChild(root);
  return { root, trigger, options };
}

function press(el: HTMLElement, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  el.dispatchEvent(event);
  return event;
}

let reachedBubble: string[] = [];
let stop: () => void;

function listen(isEnabled = enabled) {
  const onCapture = (event: Event) => {
    handleDropdownKeydown(event as KeyboardEvent, isEnabled);
  };
  const onBubble = (event: Event) => {
    reachedBubble.push((event as KeyboardEvent).key);
  };
  document.addEventListener("keydown", onCapture, true);
  window.addEventListener("keydown", onBubble);
  return () => {
    document.removeEventListener("keydown", onCapture, true);
    window.removeEventListener("keydown", onBubble);
  };
}

beforeEach(() => {
  document.body.innerHTML = "";
  clicks = [];
  reachedBubble = [];
  vi.spyOn(window, "scrollBy").mockImplementation(() => {});
  stop = listen();
});

afterEach(() => {
  stop();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("handleDropdownKeydown, closed", () => {
  it("moves past the dropdown instead of letting it open", () => {
    const above = button("Above", 0, 0);
    document.body.appendChild(above);
    const { trigger } = dropdown(0, 200, false);

    trigger.focus();
    const event = press(trigger, "ArrowUp");

    expect(document.activeElement).toBe(above);
    expect(event.defaultPrevented).toBe(true);
    // Headless UI's opener never sees the press, so there is nothing to open.
    expect(reachedBubble).toEqual([]);
  });

  it("does the same downwards", () => {
    const { trigger } = dropdown(0, 0, false);
    const below = button("Below", 0, 200);
    document.body.appendChild(below);

    trigger.focus();
    press(trigger, "ArrowDown");

    expect(document.activeElement).toBe(below);
  });

  it("leaves sideways moves to the engine", () => {
    const { trigger } = dropdown(200, 0, false);
    document.body.appendChild(button("Left", 0, 0));

    trigger.focus();
    press(trigger, "ArrowLeft");

    expect(reachedBubble).toEqual(["ArrowLeft"]);
    expect(document.activeElement).toBe(trigger);
  });

  it("does not claim a move with nowhere to go", () => {
    const { trigger } = dropdown(0, 0, false);

    trigger.focus();
    const event = press(trigger, "ArrowUp");

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });
});

describe("handleDropdownKeydown, open", () => {
  it("closes on a sideways press and hands focus back to the button", () => {
    const beside = button("Beside", 400, 0);
    document.body.appendChild(beside);
    const { trigger, options } = dropdown(0, 0, true);

    options!.focus();
    const event = press(options!, "ArrowRight");

    expect(clicks).toEqual(["trigger"]);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    expect(event.defaultPrevented).toBe(true);
    // Not `beside`: leaving the menu open and stepping past it is the bug.
    expect(reachedBubble).toEqual([]);
  });

  it("closes on the other side too", () => {
    const { trigger, options } = dropdown(400, 0, true);
    document.body.appendChild(button("Beside", 0, 0));

    options!.focus();
    press(options!, "ArrowLeft");

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  // The one place the arrows have somewhere of their own to go.
  it("leaves up and down to the open menu", () => {
    const { options } = dropdown(0, 0, true);
    document.body.appendChild(button("Below", 0, 400));

    options!.focus();
    press(options!, "ArrowDown");

    expect(clicks).toEqual([]);
    expect(document.activeElement).toBe(options);
    expect(reachedBubble).toEqual(["ArrowDown"]);
  });
});

describe("handleDropdownKeydown, when it stands down", () => {
  it("does nothing outside a marked dropdown", () => {
    const plain = button("Plain", 0, 200);
    document.body.appendChild(plain);
    document.body.appendChild(button("Above", 0, 0));

    plain.focus();
    press(plain, "ArrowUp");

    expect(reachedBubble).toEqual(["ArrowUp"]);
    expect(document.activeElement).toBe(plain);
  });

  it("leaves the ARIA behaviour alone while navigation is off", () => {
    stop();
    stop = listen(() => false);
    document.body.appendChild(button("Above", 0, 0));
    const { trigger } = dropdown(0, 200, false);

    trigger.focus();
    press(trigger, "ArrowUp");

    expect(reachedBubble).toEqual(["ArrowUp"]);
    expect(document.activeElement).toBe(trigger);
  });

  it("stands down inside the player", () => {
    const player = document.createElement("div");
    player.setAttribute("data-nav-skip", "");
    document.body.appendChild(player);
    document.body.appendChild(button("Above", 0, 0));
    const { root, trigger } = dropdown(0, 200, false);
    player.appendChild(root);

    trigger.focus();
    press(trigger, "ArrowUp");

    expect(reachedBubble).toEqual(["ArrowUp"]);
    expect(document.activeElement).toBe(trigger);
  });

  it("ignores a chord, which belongs to the browser", () => {
    document.body.appendChild(button("Above", 0, 0));
    const { trigger } = dropdown(0, 200, false);

    trigger.focus();
    press(trigger, "ArrowUp", { altKey: true });

    expect(reachedBubble).toEqual(["ArrowUp"]);
    expect(document.activeElement).toBe(trigger);
  });

  it("ignores everything that is not an arrow", () => {
    const { trigger } = dropdown(0, 0, false);
    document.body.appendChild(button("Above", 0, -200));

    trigger.focus();
    press(trigger, "Enter");
    press(trigger, "Escape");
    press(trigger, "a");

    expect(reachedBubble).toEqual(["Enter", "Escape", "a"]);
    expect(clicks).toEqual([]);
  });

  it("stands down with no trigger to read", () => {
    const root = document.createElement("div");
    root.setAttribute("data-nav-dropdown", "");
    const orphan = button("Orphan", 0, 200);
    root.appendChild(orphan);
    document.body.appendChild(root);
    document.body.appendChild(button("Above", 0, 0));

    orphan.focus();
    press(orphan, "ArrowUp");

    expect(reachedBubble).toEqual(["ArrowUp"]);
    expect(document.activeElement).toBe(orphan);
  });
});
