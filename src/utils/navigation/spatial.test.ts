/* eslint-disable import/no-extraneous-dependencies */
import { describe, expect, it } from "vitest";

import { NavRect, navigationDistance, pickCandidate } from "./spatial";

function rect(
  left: number,
  top: number,
  width: number,
  height: number,
): NavRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

/** `cols x rows` boxes of `w x h`, gutter `gap`, in row-major document order. */
function grid(cols: number, rows: number, w = 200, h = 120, gap = 20) {
  const out: NavRect[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      out.push(rect(c * (w + gap), r * (h + gap), w, h));
    }
  }
  return out;
}

describe("navigationDistance", () => {
  it("matches §8.4 for a straight horizontal move", () => {
    const origin = rect(0, 0, 100, 40);
    const target = rect(200, 0, 100, 40);
    // euclidean 100 + displacement (0 + 40/2) * 30 - alignment (40/40) * 5
    expect(navigationDistance(origin, target, "right")).toBe(695);
  });

  it("matches §8.4 for a straight vertical move", () => {
    const origin = rect(0, 0, 100, 40);
    const target = rect(0, 140, 100, 40);
    // euclidean 100 + displacement (0 + 100/2) * 2 - alignment (100/100) * 5
    expect(navigationDistance(origin, target, "down")).toBe(195);
  });

  it("punishes drifting off a row 15x harder than drifting off a column", () => {
    const origin = rect(0, 0, 100, 100);
    const skew = (Math.sqrt(2) - 1) * 100 + 5; // euclidean + lost alignment
    const acrossRow =
      navigationDistance(origin, rect(200, 200, 100, 100), "right") -
      navigationDistance(origin, rect(200, 0, 100, 100), "right");
    const acrossColumn =
      navigationDistance(origin, rect(200, 200, 100, 100), "down") -
      navigationDistance(origin, rect(0, 200, 100, 100), "down");
    expect(acrossRow).toBeCloseTo(100 * 30 + skew, 6);
    expect(acrossColumn).toBeCloseTo(100 * 2 + skew, 6);
  });

  it("credits overlapping area by its square root", () => {
    const origin = rect(0, 0, 100, 100);
    const half = rect(50, 0, 100, 100);
    // euclidean 0 + displacement (0 + 50) * 30 - alignment 5 - sqrt(50 * 100)
    expect(navigationDistance(origin, half, "right")).toBeCloseTo(
      1500 - 5 - Math.sqrt(5000),
      9,
    );
  });

  it("measures edge to edge, not centre to centre", () => {
    const origin = rect(0, 0, 100, 40);
    const narrow = navigationDistance(origin, rect(200, 0, 100, 40), "right");
    const wide = navigationDistance(origin, rect(200, 0, 1000, 40), "right");
    expect(wide).toBe(narrow);
  });
});

describe("pickCandidate — uniform grid", () => {
  const cells = grid(4, 3);
  const at = (col: number, row: number) => row * 4 + col;

  it("steps one cell in each direction", () => {
    expect(pickCandidate(cells[at(1, 1)], cells, "right")).toBe(at(2, 1));
    expect(pickCandidate(cells[at(1, 1)], cells, "left")).toBe(at(0, 1));
    expect(pickCandidate(cells[at(1, 1)], cells, "down")).toBe(at(1, 2));
    expect(pickCandidate(cells[at(1, 1)], cells, "up")).toBe(at(1, 0));
  });

  it("stops at the edges instead of wrapping", () => {
    expect(pickCandidate(cells[at(0, 0)], cells, "left")).toBeNull();
    expect(pickCandidate(cells[at(0, 0)], cells, "up")).toBeNull();
    expect(pickCandidate(cells[at(3, 2)], cells, "right")).toBeNull();
    expect(pickCandidate(cells[at(3, 2)], cells, "down")).toBeNull();
  });

  it("holds its column and row over a full traversal", () => {
    for (let row = 0; row < 3; row += 1) {
      let index = at(0, row);
      for (let col = 1; col < 4; col += 1) {
        index = pickCandidate(cells[index], cells, "right") as number;
        expect(index).toBe(at(col, row));
      }
    }
  });

  it("never picks the origin, even though it is in the list", () => {
    for (let i = 0; i < cells.length; i += 1) {
      for (const dir of ["up", "down", "left", "right"] as const) {
        expect(pickCandidate(cells[i], cells, dir)).not.toBe(i);
      }
    }
  });

  it("returns null for an empty candidate list", () => {
    expect(pickCandidate(cells[0], [], "down")).toBeNull();
  });
});

describe("pickCandidate — ragged grid", () => {
  const row0 = [
    rect(0, 0, 300, 100),
    rect(320, 0, 300, 100),
    rect(640, 0, 300, 100),
  ];
  const row1 = [
    rect(0, 120, 220, 100),
    rect(240, 120, 220, 100),
    rect(480, 120, 220, 100),
    rect(720, 120, 220, 100),
  ];
  const row2 = [rect(0, 240, 460, 100), rect(480, 240, 460, 100)];
  const cells = [...row0, ...row1, ...row2];

  it("drops onto the cell below with the most column in common", () => {
    expect(pickCandidate(row0[1], cells, "down")).toBe(4);
    // row0[0] spans 0-300, wholly over row1[0] and row1[1]'s left half.
    expect(pickCandidate(row0[0], cells, "down")).toBe(3);
    // row0[2] spans 640-940, best matched by row1[3] at 720-940.
    expect(pickCandidate(row0[2], cells, "down")).toBe(6);
  });

  it("comes back up to a cell that overlaps the one it left", () => {
    for (let i = 0; i < row1.length; i += 1) {
      const up = pickCandidate(row1[i], cells, "up") as number;
      expect(up).not.toBeNull();
      const landed = cells[up];
      const shared =
        Math.min(landed.right, row1[i].right) -
        Math.max(landed.left, row1[i].left);
      expect(shared).toBeGreaterThan(0);
    }
  });

  it("keeps ← → inside the row even when the row above is closer", () => {
    expect(pickCandidate(row1[1], cells, "right")).toBe(5);
    expect(pickCandidate(row1[1], cells, "left")).toBe(3);
  });
});

describe("pickCandidate — one wide element spanning a row", () => {
  const searchBar = rect(0, 0, 1000, 60);
  const cards = [
    rect(0, 100, 220, 300),
    rect(240, 100, 220, 300),
    rect(480, 100, 220, 300),
    rect(720, 100, 220, 300),
  ];
  const cells = [searchBar, ...cards];

  it("drops from the wide element onto the first card, not the middle one", () => {
    expect(pickCandidate(searchBar, cells, "down")).toBe(1);
  });

  it("comes back up to the wide element from any card", () => {
    for (let i = 0; i < cards.length; i += 1) {
      expect(pickCandidate(cards[i], cells, "up")).toBe(0);
    }
  });

  it("does not let the wide element hijack ← → from a card", () => {
    expect(pickCandidate(cards[1], cells, "right")).toBe(3);
    expect(pickCandidate(cards[1], cells, "left")).toBe(1);
  });
});

describe("pickCandidate — nested elements", () => {
  const card = rect(0, 0, 300, 200);
  const play = rect(20, 120, 100, 40);
  const save = rect(140, 120, 100, 40);
  const nextCard = rect(340, 0, 300, 200);
  const cells = [card, play, save, nextCard];

  it("goes into the nesting rather than past it", () => {
    expect(pickCandidate(card, cells, "down")).toBe(1);
  });

  it("moves between siblings without escaping to the parent", () => {
    expect(pickCandidate(play, cells, "right")).toBe(2);
    expect(pickCandidate(save, cells, "left")).toBe(1);
  });

  it("leaves the nesting when the direction actually leads out", () => {
    expect(pickCandidate(save, cells, "right")).toBe(3);
  });

  it("prefers the nearer overlap to the larger one", () => {
    const origin = rect(0, 0, 100, 100);
    const nearer = rect(10, 10, 20, 20);
    const larger = rect(-50, 20, 200, 200);
    expect(pickCandidate(origin, [larger, nearer], "down")).toBe(1);
  });

  it("will not go up into a box that merely contains the origin", () => {
    expect(pickCandidate(play, [card, play, save], "up")).toBeNull();
  });
});

describe("pickCandidate — tall sidebar beside a grid", () => {
  // Settings: a tall nav rail on the left, content to the right of it.
  const sidebar = rect(0, 0, 200, 800);
  const content = [
    rect(240, 0, 300, 100),
    rect(560, 0, 300, 100),
    rect(240, 120, 300, 100),
    rect(560, 120, 300, 100),
  ];
  const cells = [sidebar, ...content];

  it("enters the grid at the top of the nearest column", () => {
    expect(pickCandidate(sidebar, cells, "right")).toBe(1);
  });

  it("returns to the sidebar from the near column only", () => {
    expect(pickCandidate(content[0], cells, "left")).toBe(0);
    expect(pickCandidate(content[2], cells, "left")).toBe(0);
    // From the far column, ← is a step within the grid, not a jump home.
    expect(pickCandidate(content[1], cells, "left")).toBe(1);
    expect(pickCandidate(content[3], cells, "left")).toBe(3);
  });

  it("has nowhere to go up or down from a box taller than everything", () => {
    expect(pickCandidate(sidebar, cells, "up")).toBeNull();
    expect(pickCandidate(sidebar, cells, "down")).toBeNull();
  });
});
