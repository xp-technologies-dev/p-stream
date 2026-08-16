/* eslint-disable import/no-extraneous-dependencies */
import { describe, expect, it } from "vitest";

import { stepForHold } from "./seekRamp";

const HOUR = 3600;

describe("stepForHold", () => {
  it("starts at the 5s the player has always used", () => {
    expect(stepForHold(0, HOUR)).toBe(5);
    expect(stepForHold(400, HOUR)).toBe(5);
  });

  it("grows through the bands while the key stays down", () => {
    expect(stepForHold(1500, HOUR)).toBe(15);
    expect(stepForHold(3000, HOUR)).toBe(30);
    expect(stepForHold(5000, HOUR)).toBe(60);
  });

  it("stays at the top band however long it is held", () => {
    expect(stepForHold(30000, HOUR)).toBe(60);
  });

  it("never goes backwards as the hold gets longer", () => {
    let previous = 0;
    for (let held = 0; held <= 8000; held += 100) {
      const step = stepForHold(held, HOUR);
      expect(step).toBeGreaterThanOrEqual(previous);
      previous = step;
    }
  });

  it("caps the step against the length of the title", () => {
    expect(stepForHold(5000, 90)).toBeCloseTo(4.5);
    expect(stepForHold(0, 40)).toBe(2);
  });

  it("leaves a feature film to the bands", () => {
    expect(stepForHold(5000, 2 * HOUR)).toBe(60);
  });

  it("keeps the step usable on a very short title", () => {
    expect(stepForHold(0, 4)).toBe(1);
  });

  // Duration arrives from the media element, and it is 0 until it does.
  it("falls back to the bands with no duration reported", () => {
    expect(stepForHold(0)).toBe(5);
    expect(stepForHold(5000)).toBe(60);
  });
});
