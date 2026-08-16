import classNames from "classnames";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { Icon, Icons } from "@/components/Icon";
import { MediaRating, RateMediaMeta, useRatingsStore } from "@/stores/ratings";

interface MediaRatingCapsuleProps {
  media: RateMediaMeta;
}

const OPTIONS: Array<{
  rating: MediaRating;
  icon: Icons;
  label: string;
  activeClass: string;
}> = [
  {
    rating: "loved",
    icon: Icons.HEART,
    label: "Love it",
    activeClass: "text-red-400",
  },
  {
    rating: "liked",
    icon: Icons.THUMBS_UP,
    label: "Like",
    activeClass: "text-white",
  },
  {
    rating: "disliked",
    icon: Icons.THUMBS_DOWN,
    label: "Dislike",
    activeClass: "text-white",
  },
  {
    rating: "hated",
    icon: Icons.HEART_CRACK,
    label: "Hate it",
    activeClass: "text-red-400",
  },
];

/** Rating button that expands into 4 options, Netflix-style. */
export function MediaRatingCapsule({ media }: MediaRatingCapsuleProps) {
  const rating = useRatingsStore((s) => s.ratings[media.tmdbId]?.rating);
  const toggleRating = useRatingsStore((s) => s.toggleRating);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Measured from the DOM (h-12 isn't a fixed 48px in this app).
  const [expandedWidth, setExpandedWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (rowRef.current) setExpandedWidth(rowRef.current.scrollWidth);
  }, []);

  useEffect(() => {
    if (!expanded) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded]);

  useEffect(() => {
    if (!containerRef.current?.contains(document.activeElement)) return;
    if (!expanded) {
      triggerRef.current?.focus();
      return;
    }
    const index = OPTIONS.findIndex((o) => o.rating === rating);
    optionRefs.current[index === -1 ? 0 : index]?.focus();
  }, [expanded, rating]);

  const rate = useCallback(
    (value: MediaRating) => {
      if (!media.tmdbId) return;
      toggleRating(media, value);
      setExpanded(false);
    },
    [media, toggleRating],
  );

  const current = OPTIONS.find((o) => o.rating === rating);

  return (
    <div
      ref={containerRef}
      className={classNames(
        "relative flex h-12 items-center overflow-hidden focus-within:overflow-visible rounded-full bg-buttons-secondary transition-[width,transform] duration-300 ease-out",
        expanded ? "" : "focus-grow w-12 hover:scale-110",
      )}
      style={expanded ? { width: expandedWidth ?? undefined } : undefined}
    >
      <div ref={rowRef} className="flex h-12 w-max">
        {OPTIONS.map((option, index) => (
          <div key={option.rating} className="flex h-12 items-center">
            {index > 0 && (
              <div
                className={classNames(
                  "h-6 w-px bg-white/20 transition-opacity duration-150",
                  expanded ? "opacity-100 delay-150" : "opacity-0",
                )}
              />
            )}
            <button
              ref={(el) => {
                optionRefs.current[index] = el;
              }}
              type="button"
              title={option.label}
              tabIndex={expanded ? 0 : -1}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                rate(option.rating);
              }}
              className={classNames(
                "focus-grow cursor-pointer rounded-full transition-[opacity,transform] duration-200 ease-out hover:scale-110",
                expanded
                  ? "opacity-100 delay-100"
                  : "pointer-events-none opacity-0",
              )}
            >
              <div
                className={classNames(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors duration-150",
                  rating === option.rating
                    ? option.activeClass
                    : "text-white/70",
                )}
              >
                <Icon icon={option.icon} />
              </div>
            </button>
          </div>
        ))}
      </div>
      <button
        ref={triggerRef}
        type="button"
        tabIndex={expanded ? -1 : undefined}
        title={expanded ? undefined : (current?.label ?? "Rate")}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
        className={classNames(
          "absolute left-0 top-0 z-10 rounded-full transition-opacity duration-150",
          expanded ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        <div
          className={classNames(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pill-background transition-[color,transform] duration-150",
            current ? current.activeClass : "text-white/60 hover:text-white",
          )}
        >
          <Icon icon={current?.icon ?? Icons.THUMBS_UP} />
        </div>
      </button>
    </div>
  );
}
