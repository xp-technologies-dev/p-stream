/* eslint-disable import/no-extraneous-dependencies */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pushScope } from "@/utils/browser/focusScopes";

import {
  canGoBack,
  isBackKey,
  isRouteBackKey,
  resolveBack,
  snapshotBackContext,
} from "./back";

const releases: (() => void)[] = [];

function keydown(init: KeyboardEventInit = {}) {
  return new KeyboardEvent("keydown", {
    key: "Escape",
    cancelable: true,
    ...init,
  });
}

/** A real Back button, which is the only press that leaves the page. */
function backButton(init: KeyboardEventInit = {}) {
  return keydown({ key: "Unidentified", keyCode: 10009, ...init });
}

function openScope() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  releases.push(pushScope(el));
  return el;
}

beforeEach(() => {
  document.body.innerHTML = "";
  // Index 0 is "the entry the user arrived on", which is where jsdom starts.
  window.history.replaceState({ idx: 0 }, "");
});

afterEach(() => {
  while (releases.length) releases.pop()!();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("isBackKey", () => {
  it("accepts Escape", () => {
    expect(isBackKey(keydown())).toBe(true);
  });

  it("accepts the Tizen and webOS back codes", () => {
    expect(isBackKey(keydown({ key: "Unidentified", keyCode: 10009 }))).toBe(
      true,
    );
    expect(isBackKey(keydown({ key: "Unidentified", keyCode: 461 }))).toBe(
      true,
    );
  });

  it("rejects everything else", () => {
    expect(isBackKey(keydown({ key: "Enter", keyCode: 13 }))).toBe(false);
    expect(isBackKey(keydown({ key: "Backspace", keyCode: 8 }))).toBe(false);
    expect(isBackKey(keydown({ key: "ArrowLeft", keyCode: 37 }))).toBe(false);
  });
});

describe("canGoBack", () => {
  it("is false on the entry the session started on", () => {
    expect(canGoBack()).toBe(false);
  });

  it("is true once the app has navigated", () => {
    window.history.pushState({ idx: 1 }, "");
    expect(canGoBack()).toBe(true);
  });

  it("is false when there is no router state to read", () => {
    window.history.replaceState(null, "");
    expect(canGoBack()).toBe(false);
  });
});

describe("resolveBack", () => {
  it("defers to the global handler when a modal was open", () => {
    const context = snapshotBackContext(true);
    expect(resolveBack(keydown(), context)).toBe("defer");
  });

  it("goes back when nothing is on screen to close", () => {
    window.history.pushState({ idx: 1 }, "");
    expect(resolveBack(backButton(), snapshotBackContext(false))).toBe(
      "history",
    );
  });

  it("leaves the route alone for the Escape key", () => {
    window.history.pushState({ idx: 1 }, "");
    expect(resolveBack(keydown(), snapshotBackContext(false))).toBe("none");
  });

  it("still lets Escape close what is open", () => {
    expect(resolveBack(keydown(), snapshotBackContext(true))).toBe("defer");
  });

  it("stays put on the first history entry", () => {
    expect(resolveBack(backButton(), snapshotBackContext(false))).toBe("none");
  });

  it("stands down on a press something else already handled", () => {
    window.history.pushState({ idx: 1 }, "");
    const event = backButton();
    event.preventDefault();

    expect(resolveBack(event, snapshotBackContext(false))).toBe("none");
  });

  it("stays put while a focus scope is live with no modal behind it", () => {
    window.history.pushState({ idx: 1 }, "");
    openScope();

    expect(resolveBack(backButton(), snapshotBackContext(false))).toBe("none");
  });
});

describe("isRouteBackKey", () => {
  it("accepts the Tizen and webOS back codes", () => {
    expect(isRouteBackKey(backButton())).toBe(true);
    expect(isRouteBackKey(keydown({ key: "Unidentified", keyCode: 461 }))).toBe(
      true,
    );
  });

  // Both are Back keys; only one of them leaves the page.
  it("rejects the Escape key it shares isBackKey with", () => {
    expect(isBackKey(keydown())).toBe(true);
    expect(isRouteBackKey(keydown())).toBe(false);
  });

  it("rejects keys that are not Back at all", () => {
    expect(isRouteBackKey(keydown({ key: "Enter" }))).toBe(false);
    expect(isRouteBackKey(keydown({ key: "ArrowLeft" }))).toBe(false);
  });

  // No keyboard on a television, so an Escape there came from the remote.
  it("accepts a bare Escape on a television, where nothing else could have sent it", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36",
    );
    expect(isRouteBackKey(keydown())).toBe(true);
    expect(resolveBack(keydown(), snapshotBackContext(false))).toBe("none");

    window.history.pushState({ idx: 1 }, "");
    expect(resolveBack(keydown(), snapshotBackContext(false))).toBe("history");
  });

  it("rejects a bare Escape everywhere else", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0 Safari/537.36",
    );
    expect(isRouteBackKey(keydown())).toBe(false);
  });
});
