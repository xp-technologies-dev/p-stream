import React, { useRef } from "react";

import { MediaCard } from "@/components/media/MediaCard";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { DiscoverMedia } from "@/pages/discover/types/discover";
import { MediaItem } from "@/utils/media/mediaTypes";

import { CarouselNavButtons } from "./CarouselNavButtons";
import { usePersonalRecommendations } from "../hooks/usePersonalRecommendations";

interface PersonalRecommendationsCarouselProps {
  isTVShow: boolean;
  carouselRefs: React.MutableRefObject<{
    [key: string]: HTMLDivElement | null;
  }>;
  onShowDetails?: (media: MediaItem) => void;
  /** Overrides the default "For You" heading. */
  title?: string;
  enabled?: boolean;
}

function getPosterUrl(posterPath: string): string {
  if (!posterPath) return "/placeholder.png";
  if (posterPath.startsWith("http")) return posterPath;
  return `https://image.tmdb.org/t/p/w342${posterPath}`;
}

function discoverMediaToCardMedia(
  item: DiscoverMedia,
  isTVShow: boolean,
): MediaItem {
  return {
    id: item.id.toString(),
    title: item.title || item.name || "",
    poster: getPosterUrl(item.poster_path),
    type: isTVShow ? "show" : "movie",
    year: isTVShow
      ? item.first_air_date
        ? parseInt(item.first_air_date.split("-")[0]!, 10)
        : undefined
      : item.release_date
        ? parseInt(item.release_date.split("-")[0]!, 10)
        : undefined,
  };
}

export function PersonalRecommendationsCarousel({
  isTVShow,
  carouselRefs,
  onShowDetails,
  title,
  enabled = true,
}: PersonalRecommendationsCarouselProps) {
  const { isMobile } = useIsMobile();
  const isScrollingRef = useRef(false);
  const browser = !!window.chrome;

  const { media, isLoading, sectionTitle, hasRecommendations } =
    usePersonalRecommendations({ isTVShow, enabled });

  const categorySlug = `for-you-${isTVShow ? "tv" : "movie"}`;

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

  if (!hasRecommendations) return null;

  return (
    <div>
      <div className="flex items-center justify-between ml-2 md:ml-8 mt-2">
        <div className="flex flex-col pl-2 lg:pl-[68px]">
          <h2 className="text-2xl cursor-default font-bold text-white md:text-2xl pl-0 text-balance">
            {title ?? sectionTitle}
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
            ? Array.from({ length: 10 }, (_, i) => `for-you-skeleton-${i}`).map(
                (skeletonId) => (
                  <div
                    key={skeletonId}
                    className="relative mt-4 group cursor-default user-select-none rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto"
                  >
                    <MediaCard
                      media={{
                        id: skeletonId,
                        title: "",
                        poster: "",
                        type: isTVShow ? "show" : "movie",
                      }}
                      forceSkeleton
                    />
                  </div>
                ),
              )
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
                    media={discoverMediaToCardMedia(item, isTVShow)}
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
