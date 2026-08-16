/* eslint-disable import/no-extraneous-dependencies */
import { afterEach, describe, expect, it } from "vitest";

import {
  FOCUSABLE_SELECTOR,
  collectFocusables,
  isFocusableVisible,
} from "./focusables";

function box(el: HTMLElement, width = 100, height = 40) {
  const rect = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
  } as DOMRect;
  el.getBoundingClientRect = () => rect;
  el.getClientRects = (() => [rect]) as unknown as Element["getClientRects"];
}

function unbox(el: HTMLElement) {
  el.getClientRects = (() => []) as unknown as Element["getClientRects"];
}

/** Renders `html` into the body and gives every element a non-zero box. */
function render(html: string): HTMLElement {
  document.body.innerHTML = html;
  const all = document.body.querySelectorAll<HTMLElement>("*");
  for (let i = 0; i < all.length; i += 1) box(all[i]);
  return document.body;
}

const ids = (els: HTMLElement[]) => els.map((el) => el.id);

afterEach(() => {
  document.body.innerHTML = "";
});

describe("FOCUSABLE_SELECTOR", () => {
  it("matches the natively focusable elements", () => {
    render(`
      <a id="a" href="/x">link</a>
      <button id="b">go</button>
      <input id="c" />
      <select id="d"></select>
      <textarea id="e"></textarea>
      <div id="f" tabindex="0"></div>
      <div id="g" contenteditable="true"></div>
    `);
    expect(ids(collectFocusables())).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
    ]);
  });

  it("skips elements that opted out", () => {
    render(`
      <a id="no-href">not a link</a>
      <button id="off" disabled>go</button>
      <input id="hidden" type="hidden" />
      <div id="untabbable" tabindex="-1"></div>
      <div id="not-editable" contenteditable="false"></div>
      <button id="ok">go</button>
    `);
    expect(ids(collectFocusables())).toEqual(["ok"]);
  });

  it("returns each element once even when several clauses match it", () => {
    render(`<button id="b" tabindex="0">go</button>`);
    expect(ids(collectFocusables())).toEqual(["b"]);
  });

  it("yields one candidate for a card, not the wrapper and the inner", () => {
    render(`
      <a id="card-link" href="/media/1" tabindex="-1">
        <div id="card-inner" tabindex="0">poster</div>
      </a>
    `);
    expect(ids(collectFocusables())).toEqual(["card-inner"]);
  });

  it("parses in this browser", () => {
    expect(() => document.querySelectorAll(FOCUSABLE_SELECTOR)).not.toThrow();
  });
});

describe("isFocusableVisible", () => {
  it("rejects an element with no layout boxes", () => {
    const [el] = render(`<button id="b">go</button>`).children;
    unbox(el as HTMLElement);
    expect(isFocusableVisible(el as HTMLElement)).toBe(false);
  });

  it("rejects a zero-size element", () => {
    const el = render(`<div id="spacer" tabindex="0"></div>`)
      .children[0] as HTMLElement;
    box(el, 0, 0);
    expect(isFocusableVisible(el)).toBe(false);
    expect(collectFocusables()).toEqual([]);
  });

  it("rejects a hidden element", () => {
    const el = render(`<button id="b">go</button>`).children[0] as HTMLElement;
    el.style.visibility = "hidden";
    expect(isFocusableVisible(el)).toBe(false);
  });

  it("accepts a visible, sized element", () => {
    const el = render(`<button id="b">go</button>`).children[0] as HTMLElement;
    expect(isFocusableVisible(el)).toBe(true);
  });
});

describe("collectFocusables", () => {
  it("returns document order", () => {
    render(`
      <div><button id="one">1</button></div>
      <div><a id="two" href="/x">2</a><button id="three">3</button></div>
    `);
    expect(ids(collectFocusables())).toEqual(["one", "two", "three"]);
  });

  it("limits itself to a scope, and excludes the scope element itself", () => {
    render(`
      <button id="outside">out</button>
      <div id="modal" tabindex="0">
        <button id="inside">in</button>
      </div>
    `);
    const modal = document.getElementById("modal") as HTMLElement;
    expect(ids(collectFocusables(modal))).toEqual(["inside"]);
  });
});
