/* eslint-disable import/no-extraneous-dependencies */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getInputModality,
  initInputModality,
} from "@/utils/browser/inputModality";

import { recoverFocus, rememberFocus } from "./recovery";

/** jsdom has no layout, and `collectFocusables` rejects zero-sized elements. */
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

function button(label: string, x: number, y: number) {
  const el = document.createElement("button");
  el.textContent = label;
  return place(el, x, y);
}

/** A grid item wrapped the way `MediaCard` and the bookmark grid wrap theirs. */
function card(label: string, x: number, y: number) {
  const wrapper = place(document.createElement("div"), x, y);
  const el = button(label, x, y);
  wrapper.appendChild(el);
  return { wrapper, el };
}

function main() {
  const el = document.createElement("main");
  document.body.appendChild(el);
  return el;
}

let endModality: () => void;

beforeEach(() => {
  document.body.innerHTML = "";
  vi.spyOn(window, "scrollBy").mockImplementation(() => {});
  endModality = initInputModality();
});

afterEach(() => {
  endModality();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

/** The state a mouse click leaves behind: focus rings off. */
function clickedWithAPointer() {
  document.dispatchEvent(new Event("pointerdown"));
}

describe("rememberFocus", () => {
  it("records the ancestors while they still reach the document", () => {
    const root = main();
    const grid = document.createElement("div");
    const { wrapper, el } = card("a", 0, 0);
    grid.appendChild(wrapper);
    root.appendChild(grid);

    const origin = rememberFocus(el);
    wrapper.remove();

    expect(el.isConnected).toBe(false);
    expect(el.closest("main")).toBeNull();
    expect(origin.chain[0]).toBe(wrapper);
    expect(origin.chain).toContain(grid);
    expect(origin.chain).toContain(root);
    expect(origin.rect.width).toBe(100);
  });

  it("records nothing but the element when it is the root of the removal", () => {
    const root = main();
    const el = button("a", 0, 0);
    root.appendChild(el);

    const origin = rememberFocus(el);
    el.remove();

    expect(el.parentElement).toBeNull();
    expect(origin.chain[0]).toBe(root);
  });
});

describe("recoverFocus", () => {
  it("hands focus to the nearest surviving neighbour", () => {
    const root = main();
    const grid = document.createElement("div");
    const a = card("a", 0, 0);
    const b = card("b", 120, 0);
    const c = card("c", 600, 0);
    grid.append(a.wrapper, b.wrapper, c.wrapper);
    root.appendChild(grid);

    a.el.focus();
    const origin = rememberFocus(a.el);
    a.wrapper.remove();

    expect(recoverFocus(origin)).toBe(true);
    expect(document.activeElement).toBe(b.el);
  });

  it("widens one ancestor at a time rather than jumping to the chrome", () => {
    const root = main();
    const nav = document.createElement("div");
    nav.appendChild(button("home", 0, 0));
    const grid = document.createElement("div");
    const a = card("a", 0, 400);
    const b = card("b", 120, 400);
    grid.append(a.wrapper, b.wrapper);
    root.append(nav, grid);

    a.el.focus();
    const origin = rememberFocus(a.el);
    a.wrapper.remove();

    recoverFocus(origin);

    expect(document.activeElement).toBe(b.el);
  });

  it("falls back to the entry point when the whole subtree went away", () => {
    const root = main();
    const first = button("first", 0, 0);
    const grid = document.createElement("div");
    const a = card("a", 0, 400);
    grid.appendChild(a.wrapper);
    root.append(first, grid);

    a.el.focus();
    const origin = rememberFocus(a.el);
    grid.remove();

    expect(recoverFocus(origin)).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it("does nothing when the element never left", () => {
    const root = main();
    const a = card("a", 0, 0);
    const b = card("b", 120, 0);
    root.append(a.wrapper, b.wrapper);

    a.el.focus();
    const origin = rememberFocus(a.el);

    expect(recoverFocus(origin)).toBe(false);
    expect(document.activeElement).toBe(a.el);
  });

  it("does not recover into a skipped subtree", () => {
    const root = main();
    const overlay = document.createElement("div");
    overlay.setAttribute("data-nav-skip", "");
    const dying = card("dying", 0, 0);
    const sibling = button("sibling", 0, 100);
    overlay.append(dying.wrapper, sibling);
    const outside = button("outside", 0, 600);
    root.append(overlay, outside);

    dying.el.focus();
    const origin = rememberFocus(dying.el);
    dying.wrapper.remove();

    expect(recoverFocus(origin)).toBe(true);
    expect(document.activeElement).toBe(outside);
  });

  it("turns the ring on, so the recovered control is visible", () => {
    const root = main();
    const a = card("a", 0, 0);
    const b = card("b", 120, 0);
    root.append(a.wrapper, b.wrapper);

    a.el.focus();
    const origin = rememberFocus(a.el);
    clickedWithAPointer();
    a.wrapper.remove();

    expect(recoverFocus(origin)).toBe(true);
    expect(document.activeElement).toBe(b.el);
    expect(getInputModality()).toBe("key");
  });

  it("leaves the ring alone when focus did not move", () => {
    const root = main();
    const a = card("a", 0, 0);
    root.appendChild(a.wrapper);

    a.el.focus();
    const origin = rememberFocus(a.el);
    clickedWithAPointer();

    expect(recoverFocus(origin)).toBe(false);
    expect(getInputModality()).toBe("pointer");
  });

  it("returns false on a page with nothing left to focus", () => {
    const root = main();
    const a = card("a", 0, 0);
    root.appendChild(a.wrapper);

    a.el.focus();
    const origin = rememberFocus(a.el);
    root.innerHTML = "";

    expect(recoverFocus(origin)).toBe(false);
    expect(document.activeElement).toBe(document.body);
  });
});
