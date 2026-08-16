import React, { useMemo, useRef } from "react";

import { MediaCard } from "@/components/media/MediaCard";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { DiscoverMedia } from "@/pages/discover/types/discover";
import { MediaItem } from "@/utils/media/mediaTypes";

import { CarouselNavButtons } from "./CarouselNavButtons";
import { usePersonalRecommendations } from "../hooks/usePersonalRecommendations";

const ROW_SIZE = 12;

export type ConfidenceTier = "sure" | "worthALook" | "somethingNew";

interface ForYouConfidenceCarouselProps {
  tier: ConfidenceTier;
  title: string;
  carouselRefs: React.MutableRefObject<{
    [key: string]: HTMLDivElement | null;
  }>;
  onShowDetails?: (media: MediaItem) => void;
  enabled?: boolean;
}

function getPosterUrl(posterPath: string): string {
  if (!posterPath) return "/placeholder.png";
  if (posterPath.startsWith("http")) return posterPath;
  return `https://image.tmdb.org/t/p/w342${posterPath}`;
}

function toCardMedia(item: DiscoverMedia): MediaItem {
  const isTVShow = item.type === "show";
  return {
    id: item.id.toString(),
    title: item.title || item.name || "",
    poster: getPosterUrl(item.poster_path),
    type: item.type ?? "movie",
    year: isTVShow
      ? item.first_air_date
        ? parseInt(item.first_air_date.split("-")[0]!, 10)
        : undefined
      : item.release_date
        ? parseInt(item.release_date.split("-")[0]!, 10)
        : undefined,
  };
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/**
 * A "For You" row bucketed by how strongly a personalized pick actually
 * matches your taste (fetchPersonalRecommendations' scoring), rather than
 * genre/weight — "Sure Bets" (top third by score), "Worth a Look" (middle
 * third), "Something New" (bottom third — still personalized, just the
 * loosest, most exploratory matches). No random-popular fallback here: with
 * no taste profile there's nothing to rank by confidence, so the row is
 * simply empty and renders nothing.
 */
export function ForYouConfidenceCarousel({
  tier,
  title,
  carouselRefs,
  onShowDetails,
  enabled = true,
}: ForYouConfidenceCarouselProps) {
  const { isMobile } = useIsMobile();
  const isScrollingRef = useRef(false);
  const browser = !!window.chrome;

  const { media: personalizedMovies, isLoading: moviesLoading } =
    usePersonalRecommendations({ isTVShow: false, enabled });
  const { media: personalizedShows, isLoading: showsLoading } =
    usePersonalRecommendations({ isTVShow: true, enabled });

  const isLoading = moviesLoading || showsLoading;
  const categorySlug = `for-you-confidence-${tier}`;

  const media = useMemo(() => {
    const ranked = [...personalizedMovies, ...personalizedShows]
      .filter((m) => typeof m.matchScore === "number")
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

    const third = Math.ceil(ranked.length / 3);
    const bucket =
      tier === "sure"
        ? ranked.slice(0, third)
        : tier === "worthALook"
          ? ranked.slice(third, third * 2)
          : ranked.slice(third * 2);

    return shuffle(bucket).slice(0, ROW_SIZE);
  }, [personalizedMovies, personalizedShows, tier]);

  const handleWheel = React.useCallback(
    (e: React.WheelEvent) => {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.stopPropagation();
        e.preventDefault();
      }
      if (browser) {
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 345);
      } else {
        isScrollingRef.current = false;
      }
    },
    [browser],
  );

  if (!isLoading && media.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between ml-2 md:ml-8 mt-2">
        <div className="flex flex-col pl-2 lg:pl-[68px]">
          <h2 className="text-2xl cursor-default font-bold text-white md:text-2xl pl-0 text-balance">
            {title}
          </h2>
        </div>
      </div>
      <div className="relative overflow-hidden carousel-container md:pb-4">
        <div
          id={`carousel-${categorySlug}`}
          data-nav-row
          data-nav-remember
          className="grid grid-flow-col auto-cols-max gap-4 pt-0 overflow-x-scroll scrollbar-none rounded-xl overflow-y-hidden md:pl-8 md:pr-8"
          ref={(el) => {
            carouselRefs.current[categorySlug] = el;
          }}
          onWheel={handleWheel}
        >
          <div className="lg:w-12" />

          {isLoading
            ? Array.from(
                { length: 10 },
                (_, i) => `${categorySlug}-skeleton-${i}`,
              ).map((skeletonId) => (
                <div
                  key={skeletonId}
                  className="relative mt-4 group cursor-default user-select-none rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto"
                >
                  <MediaCard
                    media={{
                      id: skeletonId,
                      title: "",
                      poster: "",
                      type: "movie",
                    }}
                    forceSkeleton
                  />
                </div>
              ))
            : media.map((item) => (
                <div
                  onContextMenu={(e: React.MouseEvent<HTMLDivElement>) =>
                    e.preventDefault()
                  }
                  key={item.id}
                  className="relative mt-4 group cursor-pointer user-select-none rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto"
                >
                  <MediaCard
                    linkable
                    media={toCardMedia(item)}
                    onShowDetails={onShowDetails}
                  />
                </div>
              ))}

          <div className="lg:w-12" />
        </div>

        {!isMobile && (
          <CarouselNavButtons
            categorySlug={categorySlug}
            carouselRefs={carouselRefs}
          />
        )}
      </div>
    </div>
  );
}
