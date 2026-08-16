import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { getCollectionDetails, getMediaPoster } from "@/backend/metadata/tmdb";
import { IconPatch } from "@/components/buttons/IconPatch";
import { Icon, Icons } from "@/components/Icon";
import { MediaCard } from "@/components/media/MediaCard";
import { UserIcons } from "@/components/UserIcon";
import { Flare } from "@/components/utils/Flare";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CarouselNavButtons } from "@/pages/discover/components/CarouselNavButtons";
import { useBookmarkStore } from "@/stores/bookmarks";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { MediaItem } from "@/utils/media/mediaTypes";

// Simple carousel component for collection overlay
interface SimpleCarouselProps {
  mediaItems: MediaItem[];
  onShowDetails?: (media: MediaItem) => void;
  categorySlug?: string;
}

function SimpleCarousel({
  mediaItems,
  onShowDetails: _onShowDetails,
  categorySlug = "collection",
}: SimpleCarouselProps) {
  const { isMobile } = useIsMobile();
  const carouselRef = useRef<HTMLDivElement>(null);
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({
    [categorySlug]: null,
  });

  useEffect(() => {
    if (carouselRef.current) {
      carouselRefs.current[categorySlug] = carouselRef.current;
    }
  }, [categorySlug]);

  if (mediaItems.length === 0) return null;

  return (
    <div className="relative">
      {/* Carousel Container */}
      <div
        ref={carouselRef}
        data-nav-row
        data-nav-remember
        className="grid grid-flow-col auto-cols-max gap-4 pt-0 overflow-x-scroll scrollbar-none rounded-xl overflow-y-hidden md:pl-8 md:pr-8"
        style={{
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth",
        }}
      >
        <div className="md:w-12" />

        {mediaItems.map((media) => (
          <div
            key={media.id}
            className="relative mt-4 group cursor-pointer user-select-none rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto"
            style={{ scrollSnapAlign: "start" }}
          >
            <MediaCard media={media} linkable onShowDetails={_onShowDetails} />
          </div>
        ))}

        <div className="md:w-12" />
      </div>

      {/* Navigation Buttons */}
      {!isMobile && (
        <CarouselNavButtons
          categorySlug={categorySlug}
          carouselRefs={carouselRefs}
        />
      )}
    </div>
  );
}

interface CollectionMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
  vote_average?: number;
  backdrop_path?: string | null;
}

interface CollectionData {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: CollectionMovie[];
}

interface CollectionOverlayProps {
  collectionId: number;
  collectionName: string;
  onClose: () => void;
  onMovieClick: (movieId: number) => void;
}

export function CollectionOverlay({
  collectionId,
  collectionName,
  onClose,
  onMovieClick: _onMovieClick,
}: CollectionOverlayProps) {
  const { t } = useTranslation();
  const { showModal } = useOverlayStack();
  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const modifyBookmarks = useBookmarkStore((s) => s.modifyBookmarks);
  const addBookmarkWithGroups = useBookmarkStore(
    (s) => s.addBookmarkWithGroups,
  );
  const [collection, setCollection] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"release" | "rating">("release");

  useEffect(() => {
    const fetchCollection = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCollectionDetails(collectionId);
        setCollection(data);
      } catch (err) {
        console.error("Failed to fetch collection:", err);
        setError(t("media.errors.failedToLoad"));
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, [collectionId, t]);

  const sortedMovies = collection?.parts
    ? [...collection.parts].sort((a, b) => {
        if (sortOrder === "release") {
          const dateA = new Date(a.release_date || "").getTime();
          const dateB = new Date(b.release_date || "").getTime();
          return dateA - dateB;
        }

        return (b.vote_average || 0) - (a.vote_average || 0);
      })
    : [];

  const movieToMediaItem = (movie: CollectionMovie): MediaItem => {
    const year = movie.release_date
      ? new Date(movie.release_date).getFullYear()
      : undefined;

    return {
      id: movie.id.toString(),
      title: movie.title,
      poster: getMediaPoster(movie.poster_path) || "/placeholder.png",
      type: "movie",
      year,
      release_date: movie.release_date
        ? new Date(movie.release_date)
        : undefined,
    };
  };

  const handleBookmarkCollection = () => {
    if (!collection?.parts) return;

    // Get all available user icons and select one randomly
    const userIconList = Object.values(UserIcons);
    const randomIcon =
      userIconList[Math.floor(Math.random() * userIconList.length)];

    // Format the group name with the random icon
    const groupName = `[${randomIcon}]${collectionName}`;

    const existingIds: string[] = [];

    collection.parts.forEach((movie) => {
      const year = movie.release_date
        ? new Date(movie.release_date).getFullYear()
        : undefined;

      // Skip movies without a release year
      if (year === undefined) return;

      const movieId = movie.id.toString();

      if (bookmarks[movieId]) {
        existingIds.push(movieId);
        return;
      }

      const meta = {
        tmdbId: movieId,
        type: "movie" as const,
        title: movie.title,
        releaseYear: year,
        poster: getMediaPoster(movie.poster_path) || "/placeholder.png",
      };

      addBookmarkWithGroups(meta, [groupName]);
    });

    if (existingIds.length > 0) {
      modifyBookmarks(existingIds, {
        addGroups: [groupName],
      });
    }
  };

  const handleShowDetails = (media: MediaItem) => {
    // Show details modal and close collection overlay
    showModal("details", {
      id: Number(media.id),
      type: media.type === "movie" ? "movie" : "show",
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 transition-opacity duration-300"
      onClick={onClose}
    >
      <Flare.Base
        className={classNames(
          "group -m-[0.705em] rounded-3xl bg-background-main transition-colors duration-300 focus:relative focus:z-10",
          "w-full mx-4 p-6 bg-mediaCard-hoverBackground bg-opacity-60 backdrop-filter backdrop-blur-lg shadow-lg",
          "max-w-7xl max-h-[90vh]",
        )}
      >
        <div className="transition-transform duration-300 overflow-hidden rounded-3xl">
          <Flare.Light
            flareSize={300}
            cssColorVar="--colors-mediaCard-hoverAccent"
            backgroundClass="bg-mediaCard-hoverBackground duration-100"
            className="rounded-3xl bg-background-main group-hover:opacity-100"
          />
          <Flare.Child className="pointer-events-auto relative transition-transform duration-300">
            <div
              className="relative w-full h-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex-shrink-0 px-0 py-4 sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-lg">
                      {collectionName}
                    </h2>
                    <div className="flex items-center gap-4 flex-wrap">
                      {collection && (
                        <>
                          <p className="text-sm text-white/80">
                            <span className="text-white font-semibold">
                              {collection.parts.length}
                            </span>{" "}
                            {collection.parts.length > 1
                              ? t("details.collection.movies")
                              : t("details.collection.movie")}
                          </p>
                          <button
                            type="button"
                            onClick={handleBookmarkCollection}
                            className="flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
                            title={`Bookmark entire ${collectionName} collection`}
                          >
                            <Icon
                              icon={Icons.BOOKMARK_OUTLINE}
                              className="text-xs"
                            />
                            <span>Bookmark All</span>
                          </button>
                        </>
                      )}
                      {!loading && !error && sortedMovies.length > 1 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/60">
                            {t("details.collection.sortBy")}:
                          </span>
                          <button
                            type="button"
                            onClick={() => setSortOrder("release")}
                            className={classNames(
                              "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                              sortOrder === "release"
                                ? "bg-white/20 text-white"
                                : "bg-white/10 hover:bg-white/20 text-white/70",
                            )}
                          >
                            {t("details.collection.releaseDate")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSortOrder("rating")}
                            className={classNames(
                              "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                              sortOrder === "rating"
                                ? "bg-white/20 text-white"
                                : "bg-white/10 hover:bg-white/20 text-white/70",
                            )}
                          >
                            {t("details.collection.rating")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <IconPatch icon={Icons.X} onClick={onClose} />
                </div>

                {/* Collection Overview */}
                {collection?.overview && (
                  <p className="text-sm text-white/80 mt-4 line-clamp-3 max-w-4xl leading-relaxed">
                    {collection.overview}
                  </p>
                )}
              </div>

              {/* Content */}
              <div className="relative overflow-hidden md:pb-4">
                <div className="overflow-y-auto max-h-[65vh] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40">
                  {loading && (
                    <div className="grid grid-flow-col auto-cols-max gap-4 pt-0 overflow-x-scroll scrollbar-none rounded-xl overflow-y-hidden md:pl-8 md:pr-8">
                      <div className="md:w-12" />
                      {Array(8)
                        .fill(null)
                        .map((_, index) => (
                          <div
                            key={`skeleton-loading-${Math.random().toString(36).substring(2)}`}
                            className="relative mt-4 group cursor-default user-select-none rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto"
                          >
                            <MediaCard
                              media={{
                                id: `skeleton-${index}`,
                                title: "",
                                poster: "",
                                type: "movie",
                              }}
                              forceSkeleton
                            />
                          </div>
                        ))}
                      <div className="md:w-12" />
                    </div>
                  )}

                  {/* Error State */}
                  {error && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="p-4 rounded-full bg-red-500/10 mb-4">
                        <Icon
                          icon={Icons.CIRCLE_EXCLAMATION}
                          className="text-red-400 text-4xl"
                        />
                      </div>
                      <p className="text-red-400 text-lg font-semibold mb-2">
                        {t("media.errors.errorLoading")}
                      </p>
                      <p className="text-white/70 text-sm">{error}</p>
                    </div>
                  )}

                  {!loading && !error && sortedMovies.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="p-4 rounded-full bg-white/10 mb-4">
                        <Icon
                          icon={Icons.FILM}
                          className="text-white/60 text-4xl"
                        />
                      </div>
                      <p className="text-white/70">
                        {t("media.noMoviesInCollection")}
                      </p>
                    </div>
                  )}

                  {!loading && !error && sortedMovies.length > 0 && (
                    <SimpleCarousel
                      mediaItems={sortedMovies.map(movieToMediaItem)}
                      onShowDetails={handleShowDetails}
                      categorySlug="collection"
                    />
                  )}
                </div>
              </div>
            </div>
          </Flare.Child>
        </div>
      </Flare.Base>
    </div>
  );
}
