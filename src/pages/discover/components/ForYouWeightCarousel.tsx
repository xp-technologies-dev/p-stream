import React, { useEffect, useRef, useState } from "react";

import { getMediaByGenres } from "@/backend/metadata/tmdb";
import { TMDBContentTypes } from "@/backend/metadata/types/tmdb";
import { MediaCard } from "@/components/media/MediaCard";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  ContentWeight,
  HEAVY_GENRE_IDS,
  LIGHT_GENRE_IDS,
  MEDIUM_GENRE_IDS,
  classifyContentWeight,
} from "@/pages/discover/lib/personalRecommendations";
import type { DiscoverMedia } from "@/pages/discover/types/discover";
import { MediaItem } from "@/utils/media/mediaTypes";

import { CarouselNavButtons } from "./CarouselNavButtons";
import { usePersonalRecommendations } from "../hooks/usePersonalRecommendations";

const ROW_SIZE = 12;
const PERSONALIZED_SHARE = 0.7;

const WEIGHT_GENRES: Record<ContentWeight, number[]> = {
  light: LIGHT_GENRE_IDS,
  medium: MEDIUM_GENRE_IDS,
  heavy: HEAVY_GENRE_IDS,
};

interface ForYouWeightCarouselProps {
  weight: ContentWeight;
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
 * A "For You" row filtered by content weight (light/medium/heavy, a
 * genre-based intensity heuristic — see classifyContentWeight). 70%
 * personalized picks matching that weight, 30% random-popular within the
 * same weight's genre set for variety. Falls back to 100% random-popular
 * when there's no taste profile at all to draw personalized picks from.
 */
export function ForYouWeightCarousel({
  weight,
  title,
  carouselRefs,
  onShowDetails,
  enabled = true,
}: ForYouWeightCarouselProps) {
  const { isMobile } = useIsMobile();
  const isScrollingRef = useRef(false);
  const browser = !!window.chrome;

  const { media: personalizedMovies, hasRecommendations: hasMovieRecs } =
    usePersonalRecommendations({ isTVShow: false, enabled });
  const { media: personalizedShows, hasRecommendations: hasShowRecs } =
    usePersonalRecommendations({ isTVShow: true, enabled });

  const [media, setMedia] = useState<DiscoverMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const hasProfile = hasMovieRecs || hasShowRecs;
  const genreIds = WEIGHT_GENRES[weight];
  const categorySlug = `for-you-weight-${weight}`;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!enabled) {
        setMedia([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const personalizedPool = shuffle(
        [...personalizedMovies, ...personalizedShows].filter(
          (m) => classifyContentWeight(m.genre_ids) === weight,
        ),
      );
      // No profile at all: skip personalization entirely rather than
      // padding the row with an empty-pool slice.
      const personalizedTarget = hasProfile
        ? Math.round(ROW_SIZE * PERSONALIZED_SHARE)
        : 0;
      const personalizedPicks = personalizedPool.slice(0, personalizedTarget);

      const usedIds = new Set(personalizedPicks.map((m) => m.id));
      const need = ROW_SIZE - personalizedPicks.length;

      const [movieFallback, showFallback] = await Promise.all([
        getMediaByGenres(genreIds, TMDBContentTypes.MOVIE, need).catch(
          () => [],
        ),
        getMediaByGenres(genreIds, TMDBContentTypes.TV, need).catch(() => []),
      ]);

      const fallbackMedia: DiscoverMedia[] = [
        ...movieFallback.map(
          (m): DiscoverMedia => ({
            id: m.id,
            title: (m as { title: string }).title,
            poster_path: m.poster_path,
            backdrop_path: m.backdrop_path,
            overview: m.overview,
            vote_average: m.vote_average,
            vote_count: m.vote_count,
            type: "movie",
            release_date: (m as { release_date?: string }).release_date,
            genre_ids: m.genre_ids,
          }),
        ),
        ...showFallback.map(
          (s): DiscoverMedia => ({
            id: s.id,
            title: (s as { name: string }).name,
            name: (s as { name: string }).name,
            poster_path: s.poster_path,
            backdrop_path: s.backdrop_path,
            overview: s.overview,
            vote_average: s.vote_average,
            vote_count: s.vote_count,
            type: "show",
            first_air_date: (s as { first_air_date?: string })
              .first_air_date,
            genre_ids: s.genre_ids,
          }),
        ),
      ];

      const fallbackPicks = shuffle(fallbackMedia)
        .filter((m) => !usedIds.has(m.id))
        .slice(0, need);

      if (!cancelled) {
        setMedia(shuffle([...personalizedPicks, ...fallbackPicks]));
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, personalizedMovies, personalizedShows, hasProfile, weight]);

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
