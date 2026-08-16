import { ReactNode, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Icon, Icons } from "@/components/Icon";
import { useBannerSize } from "@/stores/banner";

const HOST_ID = "notice-stack";

const NAVBAR_HEIGHT = 80;
const GAP_BELOW_NAVBAR = 16;

/** Order in the column. Lower sits closer to the navbar. */
export enum NoticeOrder {
  Update = 0,
  Zlive = 1,
  Apps = 2,
}

type NoticeAccent = "purple" | "orange" | "indigo";

const ACCENTS: Record<
  NoticeAccent,
  { glow: string; badge: string; ping: string; action: string }
> = {
  purple: {
    glow: "bg-[radial-gradient(60%_100%_at_0%_0%,rgba(139,92,246,0.18),transparent_70%)]",
    badge: "bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9]",
    ping: "bg-[#8b5cf6]/40",
    action: "bg-[#8b5cf6] hover:bg-[#7c3aed]",
  },
  orange: {
    glow: "bg-[radial-gradient(60%_100%_at_0%_0%,rgba(251,113,36,0.18),transparent_70%)]",
    badge: "bg-gradient-to-br from-[#fb7124] to-[#e0501a]",
    ping: "bg-[#fb7124]/40",
    action: "bg-[#fb7124] hover:bg-[#e0501a]",
  },
  indigo: {
    glow: "bg-[radial-gradient(60%_100%_at_0%_0%,rgba(130,136,254,0.18),transparent_70%)]",
    badge: "bg-gradient-to-br from-[#8288fe] to-[#5a62eb]",
    ping: "bg-[#8288fe]/40",
    action: "bg-[#8288fe] hover:bg-[#5a62eb]",
  },
};

const ACTION_CLASS =
  "relative flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-[background-color,transform] duration-150 ease-spring hover:-translate-y-0.5 active:translate-y-0";

export function NoticeStackHost() {
  const bannerSize = useBannerSize();
  const base = NAVBAR_HEIGHT + GAP_BELOW_NAVBAR;

  return (
    <div
      id={HOST_ID}
      className="pointer-events-none fixed inset-x-0 z-[600] flex flex-col items-center gap-3 px-4"
      style={{
        top: `calc(max(${base}px, env(safe-area-inset-top)) + ${bannerSize}px)`,
      }}
    />
  );
}

export function useDismissibleNotice(storageKey: string, delayMs: number) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "1") return undefined;
    } catch {
      // treat unreadable storage as "never dismissed"
    }
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [storageKey, delayMs]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // a notice that reappears is better than one that crashes
    }
    setVisible(false);
  }, [storageKey]);

  return { visible, dismiss };
}

interface NoticeProps {
  order: NoticeOrder;
  accent: NoticeAccent;
  icon: Icons;
  title: string;
  /** Small uppercase pill after the title. */
  badge?: string;
  description: string;
  /** Rendered with the accent's own styling; `close` runs the exit animation. */
  action: (opts: { className: string; close: () => void }) => ReactNode;
  dismissLabel: string;
  /** Called once the exit animation has played. */
  onDismiss: () => void;
}

export function Notice({
  order,
  accent,
  icon,
  title,
  badge,
  description,
  action,
  dismissLabel,
  onDismiss,
}: NoticeProps) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [entered, setEntered] = useState(false);
  const colours = ACCENTS[accent];

  useEffect(() => {
    setHost(document.getElementById(HOST_ID));
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const close = () => {
    setEntered(false);
    window.setTimeout(onDismiss, 250);
  };

  if (!host) return null;

  return createPortal(
    <div data-nav-obstruct className="pointer-events-none" style={{ order }}>
      <div
        className={[
          "pointer-events-auto group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10",
          "bg-[#12141c]/85 px-4 py-3 pr-2 shadow-soft-lg backdrop-blur-xl ring-1 ring-white/5",
          "transition-[transform,opacity] duration-300 ease-out-quint",
          "max-w-[min(30rem,calc(100vw-2rem))]",
          entered ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0",
        ].join(" ")}
      >
        <div
          className={`pointer-events-none absolute inset-0 ${colours.glow}`}
        />

        <div
          className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-soft-sm ${colours.badge}`}
        >
          <span
            className={`absolute inset-0 rounded-xl animate-ping ${colours.ping}`}
          />
          <Icon icon={icon} className="relative text-lg" />
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold leading-tight text-white">
              {title}
            </p>
            {badge ? (
              <span className="rounded-full bg-white/10 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-white/50">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="text-xs leading-snug text-white/60">{description}</p>
        </div>

        {action({ className: `${ACTION_CLASS} ${colours.action}`, close })}

        <button
          type="button"
          onClick={close}
          aria-label={dismissLabel}
          className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white/45 transition-colors duration-150 hover:bg-white/5 hover:text-white/80"
        >
          <Icon icon={Icons.X} className="text-base" />
        </button>
      </div>
    </div>,
    host,
  );
}
