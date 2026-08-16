/* eslint-disable import/no-extraneous-dependencies --
   airbnb's allowed-devDependency globs cover `*.test.js` and `*.test.ts` but
   not `*.test.tsx`, so importing vitest here reads as a stray dependency. */
import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Icons } from "@/components/Icon";
import { Notice, NoticeOrder, NoticeStackHost } from "@/components/NoticeStack";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function render(ui: React.ReactNode) {
  act(() => {
    root.render(ui);
  });
  // The portal target is looked up in an effect, so it lands on the next render.
  act(() => {});
}

function host(): HTMLElement | null {
  return document.getElementById("notice-stack");
}

function stacked(): { title: string | null; order: string }[] {
  return Array.from(host()?.children ?? []).map((el) => ({
    title: el.querySelector("p")?.textContent ?? null,
    order: (el as HTMLElement).style.order,
  }));
}

function notice(props: {
  order: NoticeOrder;
  title: string;
  onDismiss?: () => void;
}) {
  return (
    <Notice
      order={props.order}
      accent="purple"
      icon={Icons.RELOAD}
      title={props.title}
      description="description"
      dismissLabel={`dismiss ${props.title}`}
      onDismiss={props.onDismiss ?? (() => {})}
      action={({ className }) => (
        <button type="button" className={className}>
          action
        </button>
      )}
    />
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("NoticeStack", () => {
  it("renders every notice into the one host", () => {
    render(
      <>
        <NoticeStackHost />
        {notice({ order: NoticeOrder.Update, title: "update" })}
        {notice({ order: NoticeOrder.Apps, title: "apps" })}
      </>,
    );

    expect(stacked()).toEqual([
      { title: "update", order: "0" },
      { title: "apps", order: "2" },
    ]);
  });

  // The column lays them out, so a gap in the middle closes by itself.
  it("keeps the rest of the stack when one is dismissed", () => {
    render(
      <>
        <NoticeStackHost />
        {notice({ order: NoticeOrder.Zlive, title: "zlive" })}
      </>,
    );
    render(<NoticeStackHost />);

    expect(host()).not.toBe(null);
    expect(stacked()).toEqual([]);
  });

  it("plays the exit animation before it reports the dismissal", () => {
    const dismissed = vi.fn();
    render(
      <>
        <NoticeStackHost />
        {notice({
          order: NoticeOrder.Update,
          title: "update",
          onDismiss: dismissed,
        })}
      </>,
    );

    const close = host()!.querySelector<HTMLElement>(
      '[aria-label="dismiss update"]',
    )!;
    act(() => {
      close.click();
    });
    expect(dismissed).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(dismissed).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when there is no host to render into", () => {
    render(notice({ order: NoticeOrder.Update, title: "orphan" }));

    expect(host()).toBe(null);
    expect(container.textContent).toBe("");
  });
});
