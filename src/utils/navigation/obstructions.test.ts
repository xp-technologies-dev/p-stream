/* eslint-disable import/no-extraneous-dependencies */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { layerOf, safeViewport } from "./obstructions";

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

function place(el: HTMLElement, x: number, y: number, w: number, h: number) {
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

/** A marked obstruction at the given viewport rect. */
function chrome(x: number, y: number, w: number, h: number) {
  const el = document.createElement("div");
  el.setAttribute("data-nav-obstruct", "");
  place(el, x, y, w, h);
  document.body.append(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("layerOf", () => {
  it("is null for page content", () => {
    const el = document.createElement("button");
    document.body.append(el);
    expect(layerOf(el)).toBeNull();
  });

  it("is the marked ancestor for anything inside one", () => {
    const bar = chrome(0, 0, WIDTH, 80);
    const el = document.createElement("button");
    bar.append(el);
    expect(layerOf(el)).toBe(bar);
  });

  it("is the nearest one when they nest", () => {
    const outer = chrome(0, 0, WIDTH, 80);
    const inner = document.createElement("div");
    inner.setAttribute("data-nav-obstruct", "");
    const el = document.createElement("button");
    inner.append(el);
    outer.append(inner);
    expect(layerOf(el)).toBe(inner);
  });

  it("separates a bar from the page and joins the bar to itself", () => {
    const bar = chrome(0, 0, WIDTH, 80);
    const a = document.createElement("button");
    const b = document.createElement("button");
    bar.append(a, b);
    const card = document.createElement("button");
    document.body.append(card);

    expect(layerOf(a)).toBe(layerOf(b));
    expect(layerOf(a)).not.toBe(layerOf(card));
  });
});

describe("safeViewport", () => {
  it("is the whole viewport when nothing is marked", () => {
    expect(safeViewport()).toEqual({
      top: 0,
      right: WIDTH,
      bottom: HEIGHT,
      left: 0,
    });
  });

  it("insets the top for a bar against the top edge", () => {
    chrome(0, 0, WIDTH, 86);
    expect(safeViewport().top).toBe(86);
  });

  it("does not inset sideways for a full-width bar", () => {
    chrome(0, 0, WIDTH, 86);
    const bounds = safeViewport();
    expect(bounds.left).toBe(0);
    expect(bounds.right).toBe(WIDTH);
  });

  it("insets the bottom for a pill floating just off it", () => {
    // 45 tall with a 16px gap below: there is nothing usable under it.
    chrome(400, HEIGHT - 61, 150, 45);
    expect(safeViewport().bottom).toBe(HEIGHT - 61);
  });

  it("insets nothing for an obstruction that reaches no edge", () => {
    chrome(0, 172, WIDTH, 95);
    expect(safeViewport()).toEqual({
      top: 0,
      right: WIDTH,
      bottom: HEIGHT,
      left: 0,
    });
  });

  it("insets the left for a sidebar, and not the top", () => {
    chrome(0, 0, 240, HEIGHT);
    const bounds = safeViewport();
    expect(bounds.left).toBe(240);
    expect(bounds.top).toBe(0);
    expect(bounds.bottom).toBe(HEIGHT);
  });

  it("takes the largest inset per edge", () => {
    chrome(0, 0, WIDTH, 40);
    chrome(0, 0, WIDTH, 86);
    expect(safeViewport().top).toBe(86);
  });

  it("ignores an obstruction with no size", () => {
    chrome(0, 0, WIDTH, 0);
    expect(safeViewport().top).toBe(0);
  });
});
