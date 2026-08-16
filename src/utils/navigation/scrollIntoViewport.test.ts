/* eslint-disable import/no-extraneous-dependencies */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { scrollDelta, scrollIntoViewport } from "./scrollIntoViewport";

const MARGIN = 24;

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

function scroller(
  axis: "x" | "y",
  x: number,
  y: number,
  w: number,
  h: number,
  content: number,
) {
  const el = document.createElement("div");
  el.style.overflowX = axis === "x" ? "auto" : "visible";
  el.style.overflowY = axis === "y" ? "auto" : "visible";
  Object.defineProperties(el, {
    clientWidth: { value: w, configurable: true },
    clientHeight: { value: h, configurable: true },
    scrollWidth: { value: axis === "x" ? content : w, configurable: true },
    scrollHeight: { value: axis === "y" ? content : h, configurable: true },
  });
  return place(el, x, y, w, h);
}

beforeEach(() => {
  document.body.innerHTML = "";
  vi.spyOn(window, "scrollBy").mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("scrollDelta", () => {
  it("is zero for something already comfortably inside", () => {
    expect(scrollDelta(100, 200, 0, 500, MARGIN)).toBe(0);
  });

  it("pulls back just far enough to clear the leading edge", () => {
    // Top at 10, so it needs to end up at 24: scroll back by 14.
    expect(scrollDelta(10, 60, 0, 500, MARGIN)).toBe(-14);
  });

  it("pushes forward just far enough to clear the trailing edge", () => {
    // Bottom at 500, and the usable edge is 476: scroll on by 24.
    expect(scrollDelta(450, 500, 0, 500, MARGIN)).toBe(24);
  });

  it("counts an item touching the edge as needing a scroll", () => {
    expect(scrollDelta(0, 50, 0, 500, MARGIN)).toBe(-24);
    expect(scrollDelta(0, 50, 0, 500, 0)).toBe(0);
  });

  it("aligns the leading edge of something too big to fit", () => {
    expect(scrollDelta(-100, 900, 0, 500, MARGIN)).toBe(-124);
  });

  it("is symmetric about the bounds it is given", () => {
    // Bounds that do not start at 0 -- a nested scroller, not the viewport.
    expect(scrollDelta(300, 340, 300, 800, MARGIN)).toBe(-24);
    expect(scrollDelta(760, 800, 300, 800, MARGIN)).toBe(24);
  });

  it("keeps the asymmetric margin it is given clear of each edge", () => {
    // A 200px band at the trailing edge: bottom 500 against a usable 300.
    expect(scrollDelta(450, 500, 0, 500, MARGIN, 200)).toBe(200);
    // And nothing at all at the leading edge it is travelling away from.
    expect(scrollDelta(30, 80, 0, 500, MARGIN, 200)).toBe(0);
  });

  it("drops the band for an element too big to fit inside it", () => {
    expect(scrollDelta(150, 550, 0, 500, MARGIN, 200)).toBe(74);
  });
});

describe("scrollIntoViewport", () => {
  it("moves a carousel sideways without touching the page", () => {
    const carousel = scroller("x", 0, 200, 1000, 300, 4000);
    const item = place(document.createElement("button"), 1200, 220, 200, 260);
    carousel.append(item);
    document.body.append(carousel);

    scrollIntoViewport(item);

    // Right edge at 1400 against a usable edge of 976.
    expect(carousel.scrollLeft).toBe(424);
    expect(carousel.scrollTop).toBe(0);
  });

  it("leaves a scroller that already shows the element alone", () => {
    const carousel = scroller("x", 0, 200, 1000, 300, 4000);
    carousel.scrollLeft = 100;
    const item = place(document.createElement("button"), 300, 220, 200, 260);
    carousel.append(item);
    document.body.append(carousel);

    scrollIntoViewport(item);

    expect(carousel.scrollLeft).toBe(100);
    expect(window.scrollBy).not.toHaveBeenCalled();
  });

  it("skips ancestors that are not scrollers", () => {
    const plain = place(document.createElement("div"), 0, 0, 1000, 800);
    const carousel = scroller("x", 0, 200, 1000, 300, 4000);
    const item = place(document.createElement("button"), 1200, 220, 200, 260);
    carousel.append(item);
    plain.append(carousel);
    document.body.append(plain);

    scrollIntoViewport(item);

    expect(plain.scrollLeft).toBe(0);
    expect(plain.scrollTop).toBe(0);
    expect(carousel.scrollLeft).toBe(424);
  });

  it("falls through to the viewport for what the scrollers could not fix", () => {
    // Nothing scrollable in between, and the item is below the fold.
    const item = place(document.createElement("button"), 100, 2000, 200, 100);
    document.body.append(item);

    scrollIntoViewport(item);

    expect(window.scrollBy).toHaveBeenCalledWith(
      0,
      scrollDelta(2000, 2100, 0, window.innerHeight, MARGIN),
    );
  });

  it("stops short of the chrome instead of parking focus beneath it", () => {
    const bar = document.createElement("div");
    bar.setAttribute("data-nav-obstruct", "");
    place(bar, 0, 0, window.innerWidth, 86);
    const item = place(document.createElement("button"), 100, 40, 200, 100);
    document.body.append(bar, item);

    scrollIntoViewport(item);

    // Top at 40 against a usable edge of 86 + 24.
    expect(window.scrollBy).toHaveBeenCalledWith(0, -70);
  });

  it("leaves a band ahead of the element along the axis being travelled", () => {
    const item = place(document.createElement("button"), 100, 700, 200, 100);
    document.body.append(item);

    scrollIntoViewport(item, "down");

    // A quarter of the viewport kept clear below, rather than 24px.
    const band = window.innerHeight * 0.25;
    expect(window.scrollBy).toHaveBeenCalledWith(
      0,
      800 - (window.innerHeight - band),
    );
  });

  it("leaves it on the other side when travelling the other way", () => {
    const item = place(document.createElement("button"), 100, 40, 200, 100);
    document.body.append(item);

    scrollIntoViewport(item, "up");

    expect(window.scrollBy).toHaveBeenCalledWith(
      0,
      40 - window.innerHeight * 0.25,
    );
  });

  it("keeps the orthogonal axis on the minimum", () => {
    const item = place(document.createElement("button"), 900, 700, 200, 100);
    document.body.append(item);

    scrollIntoViewport(item, "down");

    const [dx] = (window.scrollBy as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(dx).toBe(scrollDelta(900, 1100, 0, window.innerWidth, MARGIN));
  });

  it("gives a carousel the same lookahead sideways", () => {
    const carousel = scroller("x", 0, 200, 1000, 300, 4000);
    const item = place(document.createElement("button"), 900, 220, 200, 260);
    carousel.append(item);
    document.body.append(carousel);

    scrollIntoViewport(item, "right");

    // Right edge at 1100 against a usable edge of 1000 - 250.
    expect(carousel.scrollLeft).toBe(350);
  });

  it("adjusts each axis on its own", () => {
    const box = scroller("y", 0, 0, 500, 400, 3000);
    // Also make it scroll horizontally, so both axes are live at once.
    Object.defineProperty(box, "scrollWidth", { value: 2000 });
    box.style.overflowX = "auto";
    const item = place(document.createElement("button"), 700, 500, 100, 40);
    box.append(item);
    document.body.append(box);

    scrollIntoViewport(item);

    expect(box.scrollTop).toBe(164); // bottom 540 vs usable 376
    expect(box.scrollLeft).toBe(324); // right 800 vs usable 476
  });
});
