/* eslint-disable import/no-extraneous-dependencies */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getInputModality,
  initInputModality,
  noteKeyModality,
} from "./inputModality";

let teardown: () => void;

const modality = () =>
  document.documentElement.getAttribute("data-input-modality");

function press(init: KeyboardEventInit) {
  document.dispatchEvent(new KeyboardEvent("keydown", init));
}

function typeInto(el: HTMLElement, key: string) {
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

beforeEach(() => {
  teardown = initInputModality();
});

afterEach(() => {
  teardown();
});

describe("initInputModality", () => {
  it("publishes nothing until the user does something", () => {
    expect(modality()).toBe(null);
    expect(getInputModality()).toBe(null);
  });

  it("switches on real key presses and on pointer presses", () => {
    press({ key: "Tab" });
    expect(modality()).toBe("key");

    document.dispatchEvent(new Event("pointerdown"));
    expect(modality()).toBe("pointer");

    press({ key: "ArrowDown" });
    expect(modality()).toBe("key");
  });

  it("ignores modifiers pressed on their own", () => {
    document.dispatchEvent(new Event("pointerdown"));

    press({ key: "Shift", shiftKey: true });
    press({ key: "Control", ctrlKey: true });
    press({ key: "Alt", altKey: true });
    press({ key: "Meta", metaKey: true });

    expect(modality()).toBe("pointer");
  });

  it("ignores browser and OS shortcuts", () => {
    document.dispatchEvent(new Event("pointerdown"));

    press({ key: "r", ctrlKey: true });
    press({ key: "Tab", altKey: true });
    press({ key: "l", metaKey: true });

    expect(modality()).toBe("pointer");
  });

  it("counts a gamepad as keys, so the ring shows up", () => {
    document.dispatchEvent(new Event("pointerdown"));
    window.dispatchEvent(new Event("gamepadconnected"));
    expect(modality()).toBe("key");
  });

  it("lets a gamepad poller re-assert keys after the mouse", () => {
    window.dispatchEvent(new Event("gamepadconnected"));
    document.dispatchEvent(new Event("pointerdown"));
    expect(modality()).toBe("pointer");

    noteKeyModality();
    expect(modality()).toBe("key");
    expect(getInputModality()).toBe("key");
  });

  describe("while a text field has focus", () => {
    let field: HTMLInputElement;

    beforeEach(() => {
      field = document.createElement("input");
      document.body.append(field);
      document.dispatchEvent(new Event("pointerdown"));
    });

    afterEach(() => {
      field.remove();
    });

    it("does not treat typing as navigation", () => {
      "hello".split("").forEach((key) => typeInto(field, key));
      typeInto(field, "Backspace");
      typeInto(field, "Enter");

      expect(modality()).toBe("pointer");
    });

    // In a field an arrow moves the caret, or drives a number/range value.
    it("leaves the arrows to the field", () => {
      typeInto(field, "ArrowRight");
      typeInto(field, "ArrowDown");

      expect(modality()).toBe("pointer");
    });

    it("still switches on the keys that leave the field", () => {
      typeInto(field, "Tab");
      expect(modality()).toBe("key");

      document.dispatchEvent(new Event("pointerdown"));
      typeInto(field, "Escape");
      expect(modality()).toBe("key");
    });

    it("does not undo keys the user already asserted", () => {
      press({ key: "Tab" });
      typeInto(field, "a");

      expect(modality()).toBe("key");
    });

    it("counts a textarea and a contenteditable the same way", () => {
      const area = document.createElement("textarea");
      const rich = document.createElement("div");
      rich.setAttribute("contenteditable", "");
      document.body.append(area, rich);

      typeInto(area, "a");
      typeInto(rich, "a");
      expect(modality()).toBe("pointer");

      area.remove();
      rich.remove();
    });
  });

  it("stops tracking and clears up after teardown", () => {
    press({ key: "Tab" });
    expect(modality()).toBe("key");

    teardown();
    expect(modality()).toBe(null);

    document.dispatchEvent(new Event("pointerdown"));
    expect(modality()).toBe(null);

    // afterEach calls teardown again; make it a no-op rather than a throw
    teardown = () => {};
  });
});
