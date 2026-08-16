/* eslint-disable import/no-extraneous-dependencies */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readContainer } from "@/utils/navigation/containers";

import { pushScope } from "./focusScopes";
import { describeContainer, dumpRects, measure } from "./navDebugProbe";

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
}

function button(text: string, x: number, y: number, w = 100, h = 40) {
  const el = document.createElement("button");
  el.textContent = text;
  place(el, x, y, w, h);
  return el;
}

const releases: (() => void)[] = [];

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  while (releases.length) releases.pop()!();
  document.body.innerHTML = "";
});

describe("dumpRects", () => {
  it("returns one entry per candidate, in document order", () => {
    document.body.append(
      button("first", 0, 0),
      button("second", 120, 0),
      button("third", 240, 0),
    );

    const dump = dumpRects();

    expect(dump.count).toBe(3);
    expect(dump.rects.map((r) => r.i)).toEqual([0, 1, 2]);
    expect(dump.rects.map((r) => r.label)).toEqual([
      "first",
      "second",
      "third",
    ]);
    expect(dump.rects[1]).toMatchObject({
      x: 120,
      y: 0,
      width: 100,
      height: 40,
    });
  });

  it("rounds to 2dp", () => {
    document.body.append(button("a", 10.123456, 20.987654, 30.5, 40.005));

    const [rect] = dumpRects().rects;

    expect(rect).toMatchObject({
      x: 10.12,
      y: 20.99,
      width: 30.5,
      height: 40.01,
    });
  });

  it("prefers aria-label over text for the label, and tolerates neither", () => {
    const labelled = button("visible text", 0, 0);
    labelled.setAttribute("aria-label", "Close");
    const bare = button("", 0, 60);
    document.body.append(labelled, bare);

    expect(dumpRects().rects.map((r) => r.label)).toEqual(["Close", ""]);
  });

  it("collapses whitespace in text labels", () => {
    document.body.append(button("  Watch\n   now  ", 0, 0));

    expect(dumpRects().rects[0].label).toBe("Watch now");
  });

  it("follows the active focus scope", () => {
    const page = button("behind", 0, 0);
    const modal = document.createElement("div");
    place(modal, 0, 0, 400, 300);
    const inside = button("inside", 20, 20);
    modal.append(inside);
    document.body.append(page, modal);

    releases.push(pushScope(modal));
    const dump = dumpRects();

    expect(dump.scopeDepth).toBe(1);
    expect(dump.rects.map((r) => r.label)).toEqual(["inside"]);
  });

  it("records the viewport the rects were measured at", () => {
    document.body.append(button("a", 0, 0));

    const dump = dumpRects();

    expect(dump.viewport).toEqual({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    expect(dump.scope).toBe("document");
  });

  it("is empty rather than throwing on a page with nothing focusable", () => {
    expect(dumpRects()).toMatchObject({ count: 0, rects: [] });
  });
});

describe("describeContainer", () => {
  function read(html: string) {
    document.body.innerHTML = html;
    return readContainer(document.body.firstElementChild as HTMLElement)!;
  }

  it("names each kind", () => {
    expect(describeContainer(read(`<div data-nav-row></div>`))).toBe("row");
    expect(describeContainer(read(`<div data-nav-grid="5"></div>`))).toBe(
      "grid 5",
    );
    expect(describeContainer(read(`<div data-nav-scope></div>`))).toBe("scope");
  });

  it("shows a grid that gave no usable column count", () => {
    expect(describeContainer(read(`<div data-nav-grid="auto"></div>`))).toBe(
      "grid ?",
    );
  });

  it("shows the flags stacked on a kind", () => {
    expect(
      describeContainer(read(`<div data-nav-row data-nav-remember></div>`)),
    ).toBe("row + remember");
  });
});

describe("measure", () => {
  it("reports the container chain around focus, innermost first", () => {
    document.body.innerHTML = `
      <div data-nav-grid="3" id="grid">
        <div data-nav-row data-nav-remember id="row"></div>
      </div>
    `;
    const target = button("a", 0, 0);
    document.body.querySelector("#row")!.appendChild(target);
    target.focus();

    expect(measure().containers).toEqual(["row + remember", "grid 3"]);
  });

  it("reports no containers on an unannotated surface", () => {
    const target = button("a", 0, 0);
    document.body.append(target);
    target.focus();

    expect(measure().containers).toEqual([]);
  });

  it("narrows the candidate set to a marked scope around focus", () => {
    document.body.innerHTML = `<div data-nav-scope id="panel"></div>`;
    const inside = button("inside", 0, 0);
    document.body.querySelector("#panel")!.appendChild(inside);
    document.body.append(button("outside", 0, 200));
    inside.focus();

    expect(measure()).toMatchObject({ count: 1, containers: ["scope"] });
  });
});
