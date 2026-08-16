/* eslint-disable import/no-extraneous-dependencies */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  focusEntryPoint,
  getNavRoot,
  needsEntryPoint,
  resolveEntryPoint,
} from "./entryPoint";

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

function button(label: string, y: number) {
  const el = document.createElement("button");
  el.textContent = label;
  return place(el, 0, y);
}

function main() {
  const el = document.createElement("main");
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = "";
  vi.spyOn(window, "scrollBy").mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("getNavRoot", () => {
  it("is the landmark when there is one", () => {
    const root = main();
    expect(getNavRoot()).toBe(root);
  });

  it("falls back to the document", () => {
    expect(getNavRoot()).toBe(document);
  });
});

describe("resolveEntryPoint", () => {
  it("is the first candidate in document order", () => {
    const root = main();
    const first = button("first", 0);
    root.append(first, button("second", 100));

    expect(resolveEntryPoint()).toBe(first);
  });

  it("never leaves the landmark, so a modal's controls are not entry points", () => {
    const root = main();
    const inside = button("inside", 100);
    root.appendChild(inside);
    const modal = document.createElement("div");
    modal.appendChild(button("dialog", 0));
    document.body.insertBefore(modal, root);

    expect(resolveEntryPoint()).toBe(inside);
  });

  it("prefers a marked control", () => {
    const root = main();
    const marked = button("marked", 200);
    marked.setAttribute("data-nav-first", "");
    root.append(button("first", 0), marked);

    expect(resolveEntryPoint()).toBe(marked);
  });

  it("descends into a marked container", () => {
    const root = main();
    const container = document.createElement("div");
    container.setAttribute("data-nav-first", "");
    const inner = button("inner", 300);
    container.append(inner, button("later", 400));
    root.append(button("first", 0), container);

    expect(resolveEntryPoint()).toBe(inner);
  });

  it("falls through when the marked element is not a candidate", () => {
    const root = main();
    const marked = document.createElement("div");
    marked.setAttribute("data-nav-first", "");
    marked.setAttribute("data-nav-skip", "");
    marked.appendChild(button("skipped", 300));
    const first = button("first", 0);
    root.append(first, marked);

    expect(resolveEntryPoint()).toBe(first);
  });

  it("is null when there is nothing to enter", () => {
    main();
    expect(resolveEntryPoint()).toBeNull();
  });
});

describe("needsEntryPoint", () => {
  it("is true with focus on the body", () => {
    expect(needsEntryPoint()).toBe(true);
  });

  it("is false with focus on a live control", () => {
    const root = main();
    const el = button("here", 0);
    root.appendChild(el);
    el.focus();

    expect(needsEntryPoint()).toBe(false);
  });

  it("is true once the focused control leaves the document", () => {
    const root = main();
    const el = button("here", 0);
    root.appendChild(el);
    el.focus();
    el.remove();

    expect(needsEntryPoint()).toBe(true);
  });
});

describe("focusEntryPoint", () => {
  it("focuses the entry point and says so", () => {
    const root = main();
    const first = button("first", 0);
    root.append(first, button("second", 100));

    expect(focusEntryPoint()).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it("reports failure rather than throwing on an empty page", () => {
    main();
    expect(focusEntryPoint()).toBe(false);
    expect(document.activeElement).toBe(document.body);
  });
});
