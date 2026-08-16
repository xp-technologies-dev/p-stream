/* eslint-disable import/no-extraneous-dependencies */
import { afterEach, describe, expect, it } from "vitest";

import { getActiveScope, getScopeDepth, pushScope } from "./focusScopes";

const releases: Array<() => void> = [];

function open() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const release = pushScope(el);
  releases.push(release);
  return { el, release };
}

afterEach(() => {
  releases.splice(0).forEach((release) => release());
  document.body.innerHTML = "";
});

describe("focusScopes", () => {
  it("reports no scope when nothing is open", () => {
    expect(getActiveScope()).toBe(null);
    expect(getScopeDepth()).toBe(0);
  });

  it("reports the innermost scope", () => {
    const outer = open();
    expect(getActiveScope()).toBe(outer.el);

    const inner = open();
    expect(getActiveScope()).toBe(inner.el);
    expect(getScopeDepth()).toBe(2);

    inner.release();
    expect(getActiveScope()).toBe(outer.el);
  });

  it("releases the right entry when overlays close out of order", () => {
    const first = open();
    const second = open();

    first.release();

    expect(getScopeDepth()).toBe(1);
    expect(getActiveScope()).toBe(second.el);
  });

  it("ignores a repeated release", () => {
    const outer = open();
    const inner = open();

    inner.release();
    inner.release();

    // The second call must not pop the outer scope out from under it.
    expect(getScopeDepth()).toBe(1);
    expect(getActiveScope()).toBe(outer.el);
  });

  it("keeps both pushes separate when one element is pushed twice", () => {
    // StrictMode double-invokes effects in dev, so this happens for real.
    const el = document.createElement("div");
    document.body.appendChild(el);
    const releaseA = pushScope(el);
    const releaseB = pushScope(el);
    releases.push(releaseA, releaseB);

    releaseA();
    expect(getActiveScope()).toBe(el);

    releaseB();
    expect(getActiveScope()).toBe(null);
  });

  it("drops scopes whose element left the document", () => {
    const outer = open();
    const orphan = open();

    orphan.el.remove();

    expect(getActiveScope()).toBe(outer.el);
    expect(getScopeDepth()).toBe(1);
  });
});
