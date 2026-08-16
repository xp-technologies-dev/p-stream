/* eslint-disable import/no-extraneous-dependencies --
   airbnb's allowed-devDependency globs cover `*.test.js` and `*.test.ts` but
   not `*.test.tsx`, so importing vitest here reads as a stray dependency. The
   .ts tests in this repo lint clean without this. */
import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MediaBookmarkButton } from "@/components/media/MediaBookmark";
import { MediaCard, MediaCardSkeleton } from "@/components/media/MediaCard";
import { WatchedMediaCard } from "@/components/media/WatchedMediaCard";
import { usePreferencesStore } from "@/stores/preferences";
import { FOCUSABLE_SELECTOR } from "@/utils/browser/focusables";
import { MediaItem } from "@/utils/media/mediaTypes";

import "@/setup/i18n";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const MOVIE: MediaItem = {
  id: "603",
  title: "The Matrix",
  poster: "/poster.png",
  type: "movie",
  year: 1999,
};

let container: HTMLDivElement;
let root: Root;

function render(node: React.ReactElement) {
  act(() => {
    root.render(<MemoryRouter>{node}</MemoryRouter>);
  });
}

/** The element the card puts focus on, per the contract in `MediaCard.tsx`. */
function focusHost(): HTMLElement {
  const host = container.querySelector<HTMLElement>('[tabindex="0"]');
  if (!host) throw new Error("card has no focusable host");
  return host;
}

/** Returns whether the card marked the event as handled. */
function pressEnter(el: HTMLElement, init: KeyboardEventInit = {}): boolean {
  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
    ...init,
  });
  act(() => {
    el.dispatchEvent(event);
  });
  return event.defaultPrevented;
}

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    vi.fn(() => ({
      observe: () => {},
      unobserve: () => {},
      disconnect: () => {},
    })),
  );
  usePreferencesStore.setState({
    enableMinimalCards: false,
    enableDetailsModal: false,
    enableLowPerformanceMode: true,
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("MediaCard skeleton", () => {
  it("contributes no focus candidates", () => {
    render(<MediaCardSkeleton />);
    expect(container.querySelectorAll(FOCUSABLE_SELECTOR)).toHaveLength(0);
  });

  it("contributes no focus candidates through forceSkeleton either", () => {
    render(<MediaCard linkable media={MOVIE} forceSkeleton />);
    expect(container.querySelectorAll(FOCUSABLE_SELECTOR)).toHaveLength(0);
  });
});

describe("MediaCard keyboard activation", () => {
  it("keeps the navigating link out of the tab order", () => {
    render(<MediaCard linkable media={MOVIE} />);
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("tabindex")).toBe("-1");
    expect(link!.matches(FOCUSABLE_SELECTOR)).toBe(false);
  });

  it("puts focus on the styled element inside the link, not the link", () => {
    render(<MediaCard linkable media={MOVIE} />);
    const host = focusHost();
    expect(host.closest("a")).not.toBeNull();
    expect(host.classList.contains("group")).toBe(true);
  });

  it("activates the link when Enter is pressed on the focus host", () => {
    render(<MediaCard linkable media={MOVIE} />);
    const link = container.querySelector("a")!;
    const clicks = vi.fn();
    link.addEventListener("click", clicks);

    pressEnter(focusHost());

    expect(clicks).toHaveBeenCalledTimes(1);
  });

  it("activates once for a held Enter, not once per repeat", () => {
    render(<MediaCard linkable media={MOVIE} />);
    const link = container.querySelector("a")!;
    const clicks = vi.fn();
    link.addEventListener("click", clicks);

    const host = focusHost();
    pressEnter(host);
    // What a remote or a keyboard sends while the key stays down.
    pressEnter(host, { repeat: true });
    pressEnter(host, { repeat: true });

    expect(clicks).toHaveBeenCalledTimes(1);
  });

  it("marks the Enter it handled, and only that one", () => {
    render(<MediaCard linkable media={MOVIE} />);
    const host = focusHost();

    expect(pressEnter(host)).toBe(true);
    expect(pressEnter(host, { repeat: true })).toBe(false);
  });

  it("ignores keys other than Enter", () => {
    render(<MediaCard linkable media={MOVIE} />);
    const link = container.querySelector("a")!;
    const clicks = vi.fn();
    link.addEventListener("click", clicks);

    act(() => {
      focusHost().dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });

    expect(clicks).not.toHaveBeenCalled();
  });

  it("leaves Enter on the buttons inside it to those buttons", () => {
    render(<MediaCard linkable media={MOVIE} onShowDetails={() => {}} />);
    const link = container.querySelector("a")!;
    const clicks = vi.fn();
    link.addEventListener("click", clicks);
    const more = container.querySelector<HTMLElement>(".media-more-button")!;

    expect(pressEnter(more)).toBe(false);
    expect(clicks).not.toHaveBeenCalled();
  });

  it("does not offer a card that cannot be linked as a focus candidate", () => {
    render(<MediaCard linkable media={{ ...MOVIE, year: 2999 }} />);
    expect(container.querySelector('[tabindex="0"]')).toBeNull();
  });
});

describe("MediaCard as a navigation cell", () => {
  function cell(): HTMLElement {
    const el = container.querySelector<HTMLElement>('[data-nav-grid="1"]');
    if (!el) throw new Error("card is not marked as a navigation cell");
    return el;
  }

  it("declares one column around both of its candidates", () => {
    render(<MediaCard linkable media={MOVIE} onShowDetails={() => {}} />);
    const candidates = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );

    expect(candidates).toHaveLength(2);
    expect(candidates.every((el) => cell().contains(el))).toBe(true);
  });

  it("marks the cell on a card that cannot be linked too", () => {
    render(<MediaCard linkable media={{ ...MOVIE, year: 2999 }} />);
    expect(cell().querySelectorAll(FOCUSABLE_SELECTOR)).toHaveLength(1);
  });
});

describe("MediaBookmarkButton", () => {
  it("is a control of its own", () => {
    render(<MediaBookmarkButton media={MOVIE} />);
    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button!.matches(FOCUSABLE_SELECTOR)).toBe(true);
  });

  it("stays out of the way where it only appears on hover", () => {
    render(<MediaBookmarkButton media={MOVIE} focusable={false} />);
    expect(container.querySelectorAll(FOCUSABLE_SELECTOR)).toHaveLength(0);
  });
});

describe("WatchedMediaCard", () => {
  it("adds no focus stop of its own around the card", () => {
    render(<WatchedMediaCard media={MOVIE} onShowDetails={() => {}} />);
    const candidates = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );

    expect(candidates).toHaveLength(2);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.matches(FOCUSABLE_SELECTOR)).toBe(false);
    expect(wrapper.getAttribute("role")).toBeNull();
  });
});
