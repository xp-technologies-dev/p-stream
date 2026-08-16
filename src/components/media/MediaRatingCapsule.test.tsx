/* eslint-disable import/no-extraneous-dependencies --
   airbnb's allowed-devDependency globs cover `*.test.js` and `*.test.ts` but
   not `*.test.tsx`, so importing vitest here reads as a stray dependency. */
import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MediaRatingCapsule } from "@/components/media/MediaRatingCapsule";
import { useRatingsStore } from "@/stores/ratings";
import { FOCUSABLE_SELECTOR } from "@/utils/browser/focusables";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const MEDIA = {
  tmdbId: "603",
  title: "The Matrix",
  type: "movie" as const,
  year: 1999,
};

let container: HTMLDivElement;
let root: Root;

function candidates(): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
}

function titles(): (string | null)[] {
  return candidates().map((el) => el.getAttribute("title"));
}

function click(el: HTMLElement) {
  act(() => {
    el.click();
  });
}

beforeEach(() => {
  useRatingsStore.setState({ ratings: {} });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<MediaRatingCapsule media={MEDIA} />);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  useRatingsStore.setState({ ratings: {} });
});

describe("MediaRatingCapsule", () => {
  it("offers only the trigger while collapsed", () => {
    expect(titles()).toEqual(["Rate"]);
  });

  it("offers the four ratings once opened, and not the trigger", () => {
    click(candidates()[0]);

    expect(titles()).toEqual(["Love it", "Like", "Dislike", "Hate it"]);
  });

  it("moves focus onto the ratings when a keyboard opened it", () => {
    const trigger = candidates()[0];
    act(() => trigger.focus());

    click(trigger);

    expect(document.activeElement?.getAttribute("title")).toBe("Love it");
  });

  it("opens on the rating already given", () => {
    act(() => {
      useRatingsStore.setState({
        ratings: {
          [MEDIA.tmdbId]: {
            rating: "disliked",
            type: "movie",
            title: MEDIA.title,
            ratedAt: 0,
          },
        },
      });
    });
    const trigger = candidates()[0];
    act(() => trigger.focus());

    click(trigger);

    expect(document.activeElement?.getAttribute("title")).toBe("Dislike");
  });

  it("hands focus back to the trigger after rating", () => {
    const trigger = candidates()[0];
    act(() => trigger.focus());
    click(trigger);

    click(document.activeElement as HTMLElement);

    expect(useRatingsStore.getState().ratings[MEDIA.tmdbId].rating).toBe(
      "loved",
    );
    expect(document.activeElement).toBe(trigger);
    expect(titles()).toEqual(["Love it"]);
  });

  it("leaves focus alone when it was never inside", () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    act(() => outside.focus());

    click(candidates()[0]);

    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});
