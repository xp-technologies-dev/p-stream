/* eslint-disable import/no-extraneous-dependencies */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleActivationKeydown, isNativelyActivatable } from "./activation";

const enabled = () => true;

function press(
  el: HTMLElement,
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  el.dispatchEvent(event);
  return event;
}

function clickable(tag: string, attrs: Record<string, string> = {}) {
  const el = document.createElement(tag);
  Object.keys(attrs).forEach((name) => el.setAttribute(name, attrs[name]));
  document.body.appendChild(el);
  return el;
}

let handled: KeyboardEvent[] = [];
let clicks = 0;

function listen(isEnabled = enabled) {
  const onKeyDown = (event: Event) => {
    if (handleActivationKeydown(event as KeyboardEvent, isEnabled)) {
      handled.push(event as KeyboardEvent);
    }
  };
  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}

let stop: () => void;

beforeEach(() => {
  document.body.innerHTML = "";
  handled = [];
  clicks = 0;
  stop = listen();
});

afterEach(() => {
  stop();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function countClicks(el: HTMLElement) {
  el.addEventListener("click", () => {
    clicks += 1;
  });
  return el;
}

describe("isNativelyActivatable", () => {
  it("knows the tags the browser clicks by itself", () => {
    expect(isNativelyActivatable(document.createElement("button"))).toBe(true);
    expect(isNativelyActivatable(document.createElement("input"))).toBe(true);
    expect(isNativelyActivatable(document.createElement("select"))).toBe(true);
    expect(isNativelyActivatable(document.createElement("summary"))).toBe(true);
    expect(isNativelyActivatable(document.createElement("div"))).toBe(false);
    expect(isNativelyActivatable(document.createElement("span"))).toBe(false);
  });

  it("decides an anchor by its href, not its tag", () => {
    expect(isNativelyActivatable(clickable("a", { href: "/x" }))).toBe(true);
    // A tabbable <a> with no href is a hand-rolled control like any div.
    expect(isNativelyActivatable(clickable("a", { tabindex: "0" }))).toBe(
      false,
    );
  });
});

describe("handleActivationKeydown", () => {
  it("clicks a tabbable div on Enter and on Space", () => {
    const el = countClicks(clickable("div", { tabindex: "0" }));

    expect(press(el, "Enter").defaultPrevented).toBe(true);
    expect(press(el, " ").defaultPrevented).toBe(true);
    expect(clicks).toBe(2);
  });

  it("leaves a button alone — the browser already clicks it", () => {
    const el = countClicks(clickable("button"));

    press(el, "Enter");

    expect(clicks).toBe(0);
    expect(handled).toHaveLength(0);
  });

  it("leaves an anchor with an href alone", () => {
    const el = countClicks(clickable("a", { href: "/x", tabindex: "0" }));

    press(el, "Enter");

    expect(clicks).toBe(0);
  });

  it("stands down on an element that handled the key itself", () => {
    const el = countClicks(clickable("div", { tabindex: "0" }));
    el.addEventListener("keydown", (event) => event.preventDefault());

    press(el, "Enter");

    // One click, from its own handler's point of view zero from ours.
    expect(clicks).toBe(0);
    expect(handled).toHaveLength(0);
  });

  it("ignores an element with no tabindex", () => {
    const el = countClicks(clickable("div"));

    press(el, "Enter");

    expect(clicks).toBe(0);
  });

  it("does not act on a held key", () => {
    const el = countClicks(clickable("div", { tabindex: "0" }));

    press(el, "Enter", { repeat: true });

    expect(clicks).toBe(0);
  });

  it("ignores modifier chords", () => {
    const el = countClicks(clickable("div", { tabindex: "0" }));

    press(el, "Enter", { ctrlKey: true });
    press(el, "Enter", { shiftKey: true });
    press(el, " ", { altKey: true });
    press(el, "Enter", { metaKey: true });

    expect(clicks).toBe(0);
  });

  it("ignores keys that are not Enter or Space", () => {
    const el = countClicks(clickable("div", { tabindex: "0" }));

    press(el, "ArrowDown");
    press(el, "a");
    press(el, "Escape");

    expect(clicks).toBe(0);
  });

  it("leaves a text field's Space and Enter to the field", () => {
    const el = clickable("div", { tabindex: "0", contenteditable: "" });
    countClicks(el);

    expect(press(el, " ").defaultPrevented).toBe(false);
    expect(clicks).toBe(0);
  });

  it("does not act inside the player", () => {
    // `data-nav-skip` on the player root. Space is play/pause there.
    const skip = clickable("div", { "data-nav-skip": "" });
    const el = countClicks(document.createElement("div"));
    el.setAttribute("tabindex", "0");
    skip.appendChild(el);

    press(el, " ");

    expect(clicks).toBe(0);
  });

  it("does nothing while the engine is dormant", () => {
    const el = countClicks(clickable("div", { tabindex: "0" }));
    stop();
    stop = listen(() => false);

    const event = press(el, "Enter");

    expect(clicks).toBe(0);
    expect(event.defaultPrevented).toBe(false);
    expect(handled).toHaveLength(0);
  });
});
