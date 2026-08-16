/* eslint-disable import/no-extraneous-dependencies */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { pushScope } from "@/utils/browser/focusScopes";

import {
  confines,
  containerChain,
  crossedContainers,
  NavContainer,
  readContainer,
  recallDescendant,
  rememberDescendant,
  resolveContainerEntry,
  resolveSearchRoot,
  stepInDocumentOrder,
  stepInGrid,
} from "./containers";
import { Direction } from "./spatial";

const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];
const releases: (() => void)[] = [];

/** `<div data-nav-row><button/>…` from a compact description. */
function markup(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}

function el(selector: string): HTMLElement {
  return document.body.querySelector<HTMLElement>(selector)!;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  while (releases.length) releases.pop()!();
  document.body.innerHTML = "";
});

describe("readContainer", () => {
  it("returns null for an element that declares nothing", () => {
    expect(readContainer(markup(`<div class="grid"></div>`))).toBeNull();
  });

  it("reads a row", () => {
    const container = readContainer(markup(`<div data-nav-row></div>`))!;
    expect(container.kind).toBe("row");
    expect(container.columns).toBeNull();
    expect(container.remembers).toBe(false);
    expect(container.isScope).toBe(false);
  });

  it("reads a grid's column count", () => {
    expect(
      readContainer(markup(`<div data-nav-grid="6"></div>`))!.columns,
    ).toBe(6);
  });

  it("stays a grid with an unusable column count", () => {
    for (const value of ["auto", "0", "-2", ""]) {
      const container = readContainer(
        markup(`<div data-nav-grid="${value}"></div>`),
      )!;
      expect(container.kind).toBe("grid");
      expect(container.columns).toBeNull();
    }
  });

  it("carries the flags that stack on top of a kind", () => {
    const container = readContainer(
      markup(`<div data-nav-row data-nav-remember data-nav-scope></div>`),
    )!;
    expect(container.kind).toBe("row");
    expect(container.remembers).toBe(true);
    expect(container.isScope).toBe(true);
  });

  it("treats data-nav-remember on its own as no geometry at all", () => {
    const container = readContainer(markup(`<div data-nav-remember></div>`))!;
    expect(container.kind).toBe("none");
    expect(DIRECTIONS.every((d) => !confines(container, d))).toBe(true);
  });
});

describe("confines", () => {
  function read(html: string): NavContainer {
    return readContainer(markup(html))!;
  }

  it("holds left and right inside a row, and lets up and down out", () => {
    const row = read(`<div data-nav-row></div>`);
    expect(confines(row, "left")).toBe(true);
    expect(confines(row, "right")).toBe(true);
    expect(confines(row, "up")).toBe(false);
    expect(confines(row, "down")).toBe(false);
  });

  it("holds both axes inside a grid", () => {
    const grid = read(`<div data-nav-grid="4"></div>`);
    expect(DIRECTIONS.every((d) => confines(grid, d))).toBe(true);
  });

  it("holds everything inside a scope, whatever else it is", () => {
    const scope = read(`<div data-nav-scope data-nav-row></div>`);
    expect(DIRECTIONS.every((d) => confines(scope, d))).toBe(true);
  });
});

describe("containerChain", () => {
  it("reports containers innermost first", () => {
    markup(`
      <div data-nav-grid="3" id="grid">
        <div data-nav-row id="row">
          <div data-nav-remember id="cell"><button id="btn"></button></div>
        </div>
      </div>
    `);

    expect(containerChain(el("#btn")).map((c) => c.el.id)).toEqual([
      "cell",
      "row",
      "grid",
    ]);
  });

  it("is empty on an unannotated page", () => {
    markup(`<div><button id="btn"></button></div>`);
    expect(containerChain(el("#btn"))).toEqual([]);
  });

  it("includes the root itself when the root is a container", () => {
    markup(`<div data-nav-scope id="modal"><button id="btn"></button></div>`);
    expect(
      containerChain(el("#btn"), el("#modal")).map((c) => c.el.id),
    ).toEqual(["modal"]);
  });

  it("stops at the root and reports nothing above it", () => {
    markup(`
      <div data-nav-grid="3" id="outer">
        <div id="modal"><div data-nav-row id="row">
          <button id="btn"></button>
        </div></div>
      </div>
    `);

    expect(
      containerChain(el("#btn"), el("#modal")).map((c) => c.el.id),
    ).toEqual(["row"]);
  });
});

describe("resolveSearchRoot", () => {
  it("is the document with nothing declared and no overlay open", () => {
    markup(`<div><button id="btn"></button></div>`);
    expect(resolveSearchRoot(el("#btn"))).toBe(document);
  });

  it("is the nearest marked scope", () => {
    markup(`
      <div data-nav-scope id="outer">
        <div data-nav-scope id="inner"><button id="btn"></button></div>
      </div>
    `);
    expect(resolveSearchRoot(el("#btn"))).toBe(el("#inner"));
  });

  it("takes the marked scope when it is inside the open overlay", () => {
    markup(`
      <div id="modal"><div data-nav-scope id="panel">
        <button id="btn"></button>
      </div></div>
    `);
    releases.push(pushScope(el("#modal")));

    expect(resolveSearchRoot(el("#btn"))).toBe(el("#panel"));
  });

  it("takes the overlay when the marked scope is behind it", () => {
    markup(`
      <div>
        <div data-nav-scope id="page"><button id="btn"></button></div>
        <div id="modal"><button></button></div>
      </div>
    `);
    releases.push(pushScope(el("#modal")));

    expect(resolveSearchRoot(el("#btn"))).toBe(el("#modal"));
  });
});

describe("stepInGrid", () => {
  const step = (index: number, direction: Direction) =>
    stepInGrid(index, 8, 3, direction);

  it("moves by one within a row", () => {
    expect(step(3, "right")).toBe(4);
    expect(step(4, "left")).toBe(3);
  });

  it("moves by a full row on the other axis", () => {
    expect(step(1, "down")).toBe(4);
    expect(step(4, "up")).toBe(1);
  });

  it("stops at a row's edges rather than wrapping", () => {
    expect(step(2, "right")).toBeNull();
    expect(step(3, "left")).toBeNull();
  });

  it("leaves the grid at the top and the bottom", () => {
    expect(step(1, "up")).toBeNull();
    expect(step(7, "down")).toBeNull();
  });

  it("does not walk off the end of a ragged last row", () => {
    // Column 2 of the last row does not exist. Nothing may resolve to index 8.
    expect(step(5, "down")).toBeNull();
    expect(step(7, "right")).toBeNull();
    expect(step(6, "right")).toBe(7);
  });
});

describe("stepInDocumentOrder", () => {
  it("goes forward for down and right, backward for up and left", () => {
    expect(stepInDocumentOrder(2, 5, "down")).toBe(3);
    expect(stepInDocumentOrder(2, 5, "right")).toBe(3);
    expect(stepInDocumentOrder(2, 5, "up")).toBe(1);
    expect(stepInDocumentOrder(2, 5, "left")).toBe(1);
  });

  it("has nothing past either end", () => {
    expect(stepInDocumentOrder(4, 5, "down")).toBeNull();
    expect(stepInDocumentOrder(0, 5, "up")).toBeNull();
  });
});

describe("focus memory", () => {
  function carousel() {
    markup(`
      <div data-nav-remember id="outer">
        <div data-nav-remember id="inner">
          <button id="a"></button><button id="b"></button>
        </div>
      </div>
    `);
  }

  it("records into every remembering container above the element", () => {
    carousel();
    rememberDescendant(el("#b"));

    expect(recallDescendant(el("#inner"))).toBe(el("#b"));
    expect(recallDescendant(el("#outer"))).toBe(el("#b"));
  });

  it("has nothing for a container never visited", () => {
    carousel();
    expect(recallDescendant(el("#outer"))).toBeNull();
  });

  it("forgets an element that has left the document", () => {
    carousel();
    const b = el("#b");
    rememberDescendant(b);
    b.remove();

    expect(recallDescendant(el("#inner"))).toBeNull();
  });

  it("forgets an element moved out of the container", () => {
    carousel();
    const b = el("#b");
    rememberDescendant(b);
    document.body.appendChild(b);

    expect(recallDescendant(el("#inner"))).toBeNull();
  });
});

describe("resolveContainerEntry", () => {
  function entry(html: string) {
    markup(html);
    const container = readContainer(el("#c"))!;
    const inside = Array.from(el("#c").querySelectorAll<HTMLElement>("button"));
    return { container, inside };
  }

  it("has no opinion on a container with neither memory nor a marked first", () => {
    const { container, inside } = entry(
      `<div data-nav-row id="c"><button id="a"></button></div>`,
    );
    expect(resolveContainerEntry(container, inside)).toBeNull();
  });

  it("uses data-nav-first on a control", () => {
    const { container, inside } = entry(`
      <div data-nav-row id="c">
        <button id="a"></button><button id="b" data-nav-first></button>
      </div>
    `);
    expect(resolveContainerEntry(container, inside)).toBe(el("#b"));
  });

  it("uses data-nav-first on a wrapper, resolving to what is inside it", () => {
    const { container, inside } = entry(`
      <div data-nav-row id="c">
        <button id="a"></button>
        <div data-nav-first><button id="b"></button></div>
      </div>
    `);
    expect(resolveContainerEntry(container, inside)).toBe(el("#b"));
  });

  it("ignores a marked element that is not one of the candidates", () => {
    const { container } = entry(`
      <div data-nav-row id="c">
        <button id="a"></button><button id="b" data-nav-first></button>
      </div>
    `);
    // `b` is marked but hidden, disabled, or otherwise not collectable.
    expect(resolveContainerEntry(container, [el("#a")])).toBeNull();
  });

  it("prefers memory over data-nav-first", () => {
    const { container, inside } = entry(`
      <div data-nav-row data-nav-remember id="c">
        <button id="a" data-nav-first></button><button id="b"></button>
      </div>
    `);
    rememberDescendant(el("#b"));

    expect(resolveContainerEntry(container, inside)).toBe(el("#b"));
  });

  it("ignores memory on a container that does not ask to remember", () => {
    const { container, inside } = entry(`
      <div data-nav-row id="c">
        <button id="a"></button><button id="b"></button>
      </div>
    `);
    rememberDescendant(el("#b"));

    expect(resolveContainerEntry(container, inside)).toBeNull();
  });
});

describe("crossedContainers", () => {
  it("is empty for a move that stays inside the same containers", () => {
    markup(`
      <div data-nav-row id="row">
        <button id="a"></button><button id="b"></button>
      </div>
    `);
    expect(crossedContainers(el("#a"), el("#b"))).toEqual([]);
  });

  it("reports the boundaries entered, outermost first", () => {
    markup(`
      <button id="from"></button>
      <div data-nav-grid="3" id="grid">
        <div data-nav-row id="row"><button id="to"></button></div>
      </div>
    `);

    expect(
      crossedContainers(el("#from"), el("#to")).map((c) => c.el.id),
    ).toEqual(["grid", "row"]);
  });

  it("stops at a container the origin is already in", () => {
    markup(`
      <div data-nav-grid="3" id="grid">
        <button id="from"></button>
        <div data-nav-row id="row"><button id="to"></button></div>
      </div>
    `);

    expect(
      crossedContainers(el("#from"), el("#to")).map((c) => c.el.id),
    ).toEqual(["row"]);
  });
});
