/* eslint-disable import/no-extraneous-dependencies */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pushScope } from "@/utils/browser/focusScopes";

import {
  collectNavigationCandidates,
  directionForKey,
  handleNavigationKeydown,
  isNavSkipped,
  moveFocus,
} from "./engine";

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

/** A row of buttons, left to right, 20px apart. */
function row(labels: string[], y: number) {
  return labels.map((label, i) => button(label, i * 120, y));
}

const releases: (() => void)[] = [];
const enabled = () => true;

function keydown(key: string, init: KeyboardEventInit = {}) {
  return new KeyboardEvent("keydown", { key, cancelable: true, ...init });
}

beforeEach(() => {
  document.body.innerHTML = "";
  vi.spyOn(window, "scrollBy").mockImplementation(() => {});
});

afterEach(() => {
  while (releases.length) releases.pop()!();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("directionForKey", () => {
  it("maps the four arrows", () => {
    expect(directionForKey(keydown("ArrowUp"))).toBe("up");
    expect(directionForKey(keydown("ArrowDown"))).toBe("down");
    expect(directionForKey(keydown("ArrowLeft"))).toBe("left");
    expect(directionForKey(keydown("ArrowRight"))).toBe("right");
  });

  it("ignores everything else", () => {
    expect(directionForKey(keydown("Enter"))).toBeNull();
    expect(directionForKey(keydown("a"))).toBeNull();
    expect(directionForKey(keydown("Tab"))).toBeNull();
  });

  it("declines any modified arrow", () => {
    for (const modifier of ["altKey", "ctrlKey", "metaKey", "shiftKey"]) {
      expect(
        directionForKey(keydown("ArrowLeft", { [modifier]: true })),
      ).toBeNull();
    }
  });
});

describe("candidate collection", () => {
  it("drops subtrees marked data-nav-skip, at any depth", () => {
    const outside = button("outside", 0, 0);
    const player = document.createElement("div");
    player.setAttribute("data-nav-skip", "");
    place(player, 0, 100, 500, 300);
    const nested = document.createElement("div");
    place(nested, 10, 110, 200, 100);
    nested.append(button("deep inside", 20, 120));
    player.append(button("inside", 0, 100), nested);
    document.body.append(outside, player);

    expect(collectNavigationCandidates().map((el) => el.textContent)).toEqual([
      "outside",
    ]);
    expect(isNavSkipped(outside)).toBe(false);
  });

  it("counts the marked element itself as skipped", () => {
    const el = button("me", 0, 0);
    el.setAttribute("data-nav-skip", "");
    document.body.append(el);

    expect(collectNavigationCandidates()).toEqual([]);
  });
});

describe("moveFocus", () => {
  it("steps to the neighbour in the direction pressed", () => {
    const [a, b, c] = row(["a", "b", "c"], 0);
    document.body.append(a, b, c);
    b.focus();

    expect(moveFocus("right")).toBe(true);
    expect(document.activeElement).toBe(c);
    expect(moveFocus("left")).toBe(true);
    expect(document.activeElement).toBe(b);
  });

  it("reports no move, and leaves focus alone, at the edge", () => {
    const [a, b] = row(["a", "b"], 0);
    document.body.append(a, b);
    a.focus();

    expect(moveFocus("left")).toBe(false);
    expect(document.activeElement).toBe(a);
  });

  it("does nothing without an origin", () => {
    const [a] = row(["a"], 0);
    document.body.append(a);
    (document.activeElement as HTMLElement | null)?.blur();

    expect(moveFocus("down")).toBe(false);
  });

  it("stays put when focus is inside a skipped subtree", () => {
    const outside = button("outside", 0, 0);
    const player = document.createElement("div");
    player.setAttribute("data-nav-skip", "");
    place(player, 0, 100, 500, 300);
    const inner = button("volume", 0, 100);
    player.append(inner);
    document.body.append(outside, player);
    inner.focus();

    expect(moveFocus("up")).toBe(false);
    expect(document.activeElement).toBe(inner);
  });

  it("confines itself to the active focus scope", () => {
    const behind = button("behind", 0, 0);
    const modal = document.createElement("div");
    place(modal, 0, 200, 600, 300);
    const [first, second] = row(["first", "second"], 220);
    modal.append(first, second);
    document.body.append(behind, modal);
    releases.push(pushScope(modal));
    first.focus();

    expect(moveFocus("up")).toBe(false);
    expect(moveFocus("right")).toBe(true);
    expect(document.activeElement).toBe(second);
  });

  it("will not enter an overlay that is closing", () => {
    const page = button("page", 0, 0);
    const closing = document.createElement("div");
    closing.className = "popout-wrapper";
    closing.setAttribute("data-nav-skip", "");
    place(closing, 0, 100, 600, 300);
    closing.append(button("in the dying modal", 0, 100));
    document.body.append(page, closing);
    page.focus();

    expect(moveFocus("down")).toBe(false);
    expect(document.activeElement).toBe(page);
  });

  it("reports no move when the target refuses focus", () => {
    const [a, b] = row(["a", "b"], 0);
    b.focus = () => {};
    document.body.append(a, b);
    a.focus();

    expect(moveFocus("right")).toBe(false);
    expect(document.activeElement).toBe(a);
  });
});

describe("moveFocus with container hints", () => {
  function container(
    attrs: Record<string, string>,
    ...children: HTMLElement[]
  ) {
    const el = document.createElement("div");
    Object.keys(attrs).forEach((name) => el.setAttribute(name, attrs[name]));
    el.append(...children);
    return el;
  }

  function twoTracks() {
    const a1 = button("a1", 0, 0);
    const a2 = button("a2", 600, 0);
    const b1 = button("b1", 0, 45);
    const b2 = button("b2", 110, 45);
    return { a1, a2, b1, b2 };
  }

  it("jumps tracks without a hint — the case data-nav-row exists for", () => {
    const { a1, a2, b1, b2 } = twoTracks();
    document.body.append(container({}, a1, a2), container({}, b1, b2));
    a1.focus();

    expect(moveFocus("right")).toBe(true);
    expect(document.activeElement).toBe(b2);
  });

  it("keeps left and right inside a row", () => {
    const { a1, a2, b1, b2 } = twoTracks();
    document.body.append(
      container({ "data-nav-row": "" }, a1, a2),
      container({ "data-nav-row": "" }, b1, b2),
    );
    a1.focus();

    expect(moveFocus("right")).toBe(true);
    expect(document.activeElement).toBe(a2);
  });

  it("lets up and down out of a row", () => {
    const { a1, a2, b1, b2 } = twoTracks();
    document.body.append(
      container({ "data-nav-row": "" }, a1, a2),
      container({ "data-nav-row": "" }, b1, b2),
    );
    a1.focus();

    expect(moveFocus("down")).toBe(true);
    expect(document.activeElement).toBe(b1);
  });

  it("falls through to document order off the end of a row, reversibly", () => {
    const [a, b] = row(["a", "b"], 0);
    const [c, d] = row(["c", "d"], 60);
    document.body.append(
      container({ "data-nav-row": "" }, a, b),
      container({ "data-nav-row": "" }, c, d),
    );
    b.focus();

    expect(moveFocus("right")).toBe(true);
    expect(document.activeElement).toBe(c);
    expect(moveFocus("left")).toBe(true);
    expect(document.activeElement).toBe(b);
  });

  it("does not fall through to document order without a container", () => {
    const [a, b] = row(["a", "b"], 0);
    document.body.append(a, b);
    b.focus();

    expect(moveFocus("right")).toBe(false);
    expect(document.activeElement).toBe(b);
  });

  describe("data-nav-grid", () => {
    function grid() {
      const cells = Array.from({ length: 8 }, (_, i) =>
        button(`${i}`, (i % 3) * 120, Math.floor(i / 3) * 60),
      );
      document.body.append(
        container({ "data-nav-grid": "3" }, ...cells),
        button("after", 0, 300),
      );
      return cells;
    }

    it("moves by a whole row on the vertical axis", () => {
      const cells = grid();
      cells[1].focus();

      expect(moveFocus("down")).toBe(true);
      expect(document.activeElement).toBe(cells[4]);
      expect(moveFocus("up")).toBe(true);
      expect(document.activeElement).toBe(cells[1]);
    });

    it("moves by one within a row", () => {
      const cells = grid();
      cells[3].focus();

      expect(moveFocus("right")).toBe(true);
      expect(document.activeElement).toBe(cells[4]);
      expect(moveFocus("left")).toBe(true);
      expect(document.activeElement).toBe(cells[3]);
    });

    it("continues into the next row off a row's end, reversibly", () => {
      const cells = grid();
      cells[5].focus();

      expect(moveFocus("right")).toBe(true);
      expect(document.activeElement).toBe(cells[6]);
      expect(moveFocus("left")).toBe(true);
      expect(document.activeElement).toBe(cells[5]);
    });

    it("leaves the grid rather than moving diagonally off a ragged row", () => {
      const cells = grid();
      cells[5].focus();

      expect(moveFocus("down")).toBe(true);
      expect(document.activeElement).not.toBe(cells[7]);
      expect((document.activeElement as HTMLElement).textContent).toBe("after");
    });

    it("leaves the grid upward from the first row", () => {
      const above = button("above", 0, -100);
      const cells = grid();
      document.body.prepend(above);
      cells[1].focus();

      expect(moveFocus("up")).toBe(true);
      expect(document.activeElement).toBe(above);
    });
  });

  describe("data-nav-scope", () => {
    function panel() {
      const outside = button("outside", 0, 0);
      const [first, second] = row(["first", "second"], 200);
      document.body.append(
        outside,
        container({ "data-nav-scope": "" }, first, second),
      );
      return { outside, first, second };
    }

    it("moves freely inside", () => {
      const { first, second } = panel();
      first.focus();

      expect(moveFocus("right")).toBe(true);
      expect(document.activeElement).toBe(second);
    });

    it("will not let focus out, in any direction", () => {
      const { first } = panel();
      first.focus();

      expect(moveFocus("up")).toBe(false);
      expect(moveFocus("left")).toBe(false);
      expect(document.activeElement).toBe(first);
    });

    it("can still be entered from outside", () => {
      const { outside, first } = panel();
      outside.focus();

      expect(moveFocus("down")).toBe(true);
      expect(document.activeElement).toBe(first);
    });
  });

  describe("data-nav-remember", () => {
    function rows(remember: boolean) {
      const [a1, a2] = row(["a1", "a2"], 0);
      const [b1, b2] = row(["b1", "b2"], 60);
      document.body.append(
        container({ "data-nav-row": "" }, a1, a2),
        container(
          remember
            ? { "data-nav-row": "", "data-nav-remember": "" }
            : { "data-nav-row": "" },
          b1,
          b2,
        ),
      );
      return { a1, a2, b1, b2 };
    }

    /** Leaves focus on `b2`, then walks up and back to the top-left. */
    function visitThenLeave(b1: HTMLElement, a1: HTMLElement) {
      b1.focus();
      moveFocus("right");
      moveFocus("up");
      moveFocus("left");
      expect(document.activeElement).toBe(a1);
    }

    it("restores the last-focused descendant on re-entry", () => {
      const { a1, b1, b2 } = rows(true);
      visitThenLeave(b1, a1);

      expect(moveFocus("down")).toBe(true);
      expect(document.activeElement).toBe(b2);
    });

    it("without the hint, geometry sends focus back to the first column", () => {
      const { a1, b1 } = rows(false);
      visitThenLeave(b1, a1);

      expect(moveFocus("down")).toBe(true);
      expect(document.activeElement).toBe(b1);
    });

    it("falls back to geometry once the remembered element is gone", () => {
      const { a1, b1, b2 } = rows(true);
      visitThenLeave(b1, a1);
      b2.remove();

      expect(moveFocus("down")).toBe(true);
      expect(document.activeElement).toBe(b1);
    });
  });

  describe("data-nav-first", () => {
    it("chooses where focus enters a container it has not been in", () => {
      const above = button("above", 0, 0);
      const [b1, b2] = row(["b1", "b2"], 60);
      b2.setAttribute("data-nav-first", "");
      document.body.append(above, container({ "data-nav-row": "" }, b1, b2));
      above.focus();

      expect(moveFocus("down")).toBe(true);
      expect(document.activeElement).toBe(b2);
    });

    it("has no say once focus is already inside", () => {
      const [a1, a2] = row(["a1", "a2"], 0);
      a2.setAttribute("data-nav-first", "");
      document.body.append(container({ "data-nav-row": "" }, a1, a2));
      a2.focus();

      expect(moveFocus("left")).toBe(true);
      expect(document.activeElement).toBe(a1);
    });
  });
});

describe("moveFocus across positioning layers", () => {
  function bar(...children: HTMLElement[]) {
    const el = document.createElement("div");
    el.setAttribute("data-nav-obstruct", "");
    place(el, 0, 0, 1000, 86);
    el.append(...children);
    return el;
  }

  it("goes to the row above rather than into the chrome overlapping it", () => {
    const chromeButton = button("chrome", 250, 23, 40, 40);
    const above = button("above", 100, -100, 200, 80);
    const card = button("card", 100, 24, 200, 349);
    document.body.append(bar(chromeButton), above, card);
    card.focus();

    expect(moveFocus("up")).toBe(true);
    expect(document.activeElement).toBe(above);
  });

  it("still reaches the chrome once the page has nothing left above", () => {
    const chromeButton = button("chrome", 400, 23, 40, 40);
    const card = button("card", 100, 200, 200, 349);
    document.body.append(bar(chromeButton), card);
    card.focus();

    expect(moveFocus("up")).toBe(true);
    expect(document.activeElement).toBe(chromeButton);
  });

  it("leaves the chrome downwards into the page", () => {
    const chromeButton = button("chrome", 100, 23, 40, 40);
    const card = button("card", 100, 200, 200, 349);
    document.body.append(bar(chromeButton), card);
    chromeButton.focus();

    expect(moveFocus("down")).toBe(true);
    expect(document.activeElement).toBe(card);
  });

  it("prefers a sibling inside the chrome to the page behind it", () => {
    const one = button("one", 100, 23, 40, 40);
    const two = button("two", 200, 23, 40, 40);
    const card = button("card", 300, 24, 200, 349);
    document.body.append(bar(one, two), card);
    one.focus();

    expect(moveFocus("right")).toBe(true);
    expect(document.activeElement).toBe(two);
  });

  it("changes nothing on a page with no marked chrome", () => {
    const above = button("above", 100, -100, 200, 80);
    const overlapping = button("overlapping", 250, 23, 40, 40);
    const card = button("card", 100, 24, 200, 349);
    document.body.append(overlapping, above, card);
    card.focus();

    expect(moveFocus("up")).toBe(true);
    expect(document.activeElement).toBe(overlapping);
  });
});

describe("handleNavigationKeydown", () => {
  function pressOn(el: HTMLElement, key: string, init: KeyboardEventInit = {}) {
    const event = keydown(key, init);
    Object.defineProperty(event, "target", { value: el });
    return { event, taken: handleNavigationKeydown(event, enabled) };
  }

  it("takes the key and cancels the default when focus moves", () => {
    const [a, b] = row(["a", "b"], 0);
    document.body.append(a, b);
    a.focus();

    const { event, taken } = pressOn(a, "ArrowRight");

    expect(taken).toBe(true);
    expect(document.activeElement).toBe(b);
    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves the default alone when nothing moved", () => {
    const [a, b] = row(["a", "b"], 0);
    document.body.append(a, b);
    a.focus();

    const { event, taken } = pressOn(a, "ArrowLeft");

    expect(taken).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it("stands down when the engine is dormant", () => {
    const [a, b] = row(["a", "b"], 0);
    document.body.append(a, b);
    a.focus();

    const event = keydown("ArrowRight");
    Object.defineProperty(event, "target", { value: a });

    expect(handleNavigationKeydown(event, () => false)).toBe(false);
    expect(document.activeElement).toBe(a);
    expect(event.defaultPrevented).toBe(false);
  });

  // How Headless UI's Listbox keeps the arrows while its options are open.
  it("stands down when someone has already claimed the key", () => {
    const [a, b] = row(["a", "b"], 0);
    document.body.append(a, b);
    a.focus();

    const event = keydown("ArrowRight");
    event.preventDefault();
    Object.defineProperty(event, "target", { value: a });

    expect(handleNavigationKeydown(event, enabled)).toBe(false);
    expect(document.activeElement).toBe(a);
  });

  it("stands down on controls the arrows already drive", () => {
    const select = document.createElement("select");
    place(select, 0, 0);
    const range = document.createElement("input");
    range.type = "range";
    place(range, 0, 60);
    const text = document.createElement("input");
    place(text, 0, 120);
    const target = button("target", 0, 180);
    document.body.append(select, range, text, target);

    for (const el of [select, range]) {
      el.focus();
      expect(pressOn(el, "ArrowDown").taken).toBe(false);
      expect(document.activeElement).toBe(el);
    }

    text.value = "abc";
    text.setSelectionRange(1, 1);
    text.focus();
    expect(pressOn(text, "ArrowLeft").taken).toBe(false);
    expect(document.activeElement).toBe(text);
  });

  it("moves off a single-line field vertically", () => {
    const text = document.createElement("input");
    place(text, 0, 0);
    const target = button("target", 0, 60);
    document.body.append(text, target);
    text.focus();

    expect(pressOn(text, "ArrowDown").taken).toBe(true);
    expect(document.activeElement).toBe(target);
  });

  it("moves sideways off a field whose caret has nowhere left to go", () => {
    const text = document.createElement("input");
    place(text, 0, 0);
    const beside = button("beside", 200, 0);
    document.body.append(text, beside);

    text.focus();
    expect(pressOn(text, "ArrowRight").taken).toBe(true);
    expect(document.activeElement).toBe(beside);

    // But not while there is still value to walk through.
    text.value = "abc";
    text.setSelectionRange(0, 0);
    text.focus();
    expect(pressOn(text, "ArrowRight").taken).toBe(false);
    expect(document.activeElement).toBe(text);
  });

  it("still moves off a checkbox, a radio and a button", () => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    place(checkbox, 0, 0);
    const radio = document.createElement("input");
    radio.type = "radio";
    place(radio, 0, 60);
    const target = button("target", 0, 120);
    document.body.append(checkbox, radio, target);

    checkbox.focus();
    expect(pressOn(checkbox, "ArrowDown").taken).toBe(true);
    expect(document.activeElement).toBe(radio);
    expect(pressOn(radio, "ArrowDown").taken).toBe(true);
    expect(document.activeElement).toBe(target);
  });

  it("ignores keys it does not own", () => {
    const [a, b] = row(["a", "b"], 0);
    document.body.append(a, b);
    a.focus();

    expect(pressOn(a, "Tab").taken).toBe(false);
    expect(pressOn(a, "ArrowRight", { altKey: true }).taken).toBe(false);
    expect(document.activeElement).toBe(a);
  });
});
