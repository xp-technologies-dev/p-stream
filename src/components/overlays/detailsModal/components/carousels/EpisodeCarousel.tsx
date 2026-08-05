import classNames from "classnames";
import { t } from "i18next";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/buttons/Button";
import { Dropdown } from "@/components/form/Dropdown";
import { Icon, Icons } from "@/components/Icon";
import { Modal, ModalCard, useModal } from "@/components/overlays/Modal";
import { hasAired } from "@/components/player/utils/aired";
import { useBookmarkStore } from "@/stores/bookmarks";
import {
  getProgressPercentage,
  ProgressEpisodeItem,
  useProgressStore,
} from "@/stores/progress";

import { EpisodeCarouselProps } from "../../types";

const EMPTY_ARRAY: string[] = [];

function slugifyTitle(title?: string | null) {
  const slug = (title ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return slug || "untitled";
}

export function EpisodeCarousel({
  episodes,
  showProgress,
  progress,
  selectedSeason,
  onSeasonChange,
  seasons,
  mediaId,
  mediaTitle,
  mediaPosterUrl,
  totalEpisodes,
}: EpisodeCarouselProps) {
  const [SeasonWatched, setSeasonWatched] = useState(false);
  const [expandedEpisodes, setExpandedEpisodes] = useState<{
    [key: number]: boolean;
  }>({});
  const [truncatedEpisodes, setTruncatedEpisodes] = useState<{
    [key: number]: boolean;
  }>({});
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoriteEpisodes, setFavoriteEpisodes] = useState<any[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);
  const activeEpisodeRef = useRef<HTMLAnchorElement>(null);
  const descriptionRefs = useRef<{
    [key: number]: HTMLParagraphElement | null;
  }>({});
  const updateItem = useProgressStore((s) => s.updateItem);
  const confirmModal = useModal("season-watch-confirm");

  const handleScroll = (direction: "left" | "right") => {
    if (!carouselRef.current) return;

    const cardWidth = 256; // w-64 in pixels
    const cardSpacing = 16; // space-x-4 in pixels
    const scrollAmount = (cardWidth + cardSpacing) * 2;

    const newScrollPosition =
      carouselRef.current.scrollLeft +
      (direction === "left" ? -scrollAmount : scrollAmount);

    carouselRef.current.scrollTo({
      left: newScrollPosition,
      behavior: "smooth",
    });
  };

  // Function to generate the episode URL
  const getEpisodeUrl = (episode: any) => {
    // Find the season ID for the current season
    const season = seasons.find((s) => s.season_number === selectedSeason);

    if (!season || !mediaId || !mediaTitle) return "#";

    // Create the URL in the format: /media/tmdb-tv-{showId}-{showName}/{seasonId}/{episodeId}
    return `/media/tmdb-tv-${mediaId}-${slugifyTitle(mediaTitle)}/${season.id}/${episode.id}`;
  };

  useEffect(() => {
    if (carouselRef.current) {
      if (activeEpisodeRef.current) {
        // If there's an active episode, scroll to it
        const containerLeft = carouselRef.current.getBoundingClientRect().left;
        const containerWidth = carouselRef.current.clientWidth;
        const elementLeft =
          activeEpisodeRef.current.getBoundingClientRect().left;
        const elementWidth = activeEpisodeRef.current.clientWidth;

        const scrollPosition =
          elementLeft - containerLeft - containerWidth / 2 + elementWidth / 2;

        carouselRef.current.scrollTo({
          left: carouselRef.current.scrollLeft + scrollPosition,
          behavior: "smooth",
        });
      } else {
        // If no active episode, scroll to the start
        carouselRef.current.scrollTo({
          left: 0,
          behavior: "smooth",
        });
      }
    }
  }, [episodes, showProgress]);

  const toggleWatchStatus = (episodeId: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (mediaId) {
      const episode = episodes.find((ep) => ep.id === episodeId);
      if (episode) {
        const seasonData = seasons.find(
          (s) => s.season_number === selectedSeason,
        );
        if (!seasonData) return;

        // Check if the episode is already watched
        const episodeProgress =
          progress[mediaId.toString()]?.episodes?.[episodeId];
        const percentage = episodeProgress
          ? getProgressPercentage(
              episodeProgress.progress.watched,
              episodeProgress.progress.duration,
            )
          : 0;

        // If watched (>90%), reset to 0%, otherwise set to 100%
        const isWatched = percentage > 90;
        const shouldMarkWatched = !isWatched;

        // Get the poster URL from the mediaPosterUrl prop
        const posterUrl = mediaPosterUrl;

        // Update progress
        updateItem({
          meta: {
            tmdbId: mediaId.toString(),
            title: mediaTitle || "",
            type: "show",
            releaseYear: new Date().getFullYear(),
            poster: posterUrl,
            episode: {
              tmdbId: episodeId.toString(),
              number: episode.episode_number,
              title: episode.name || "",
            },
            season: {
              tmdbId: seasonData.id.toString(),
              number: selectedSeason,
              title: seasonData.name || "",
            },
          },
          progress: {
            watched: shouldMarkWatched ? 60 : 0, // 60 seconds (100%) for watched, 0 for unwatched
            duration: 60,
          },
        });
      }
    }
  };

  const toggleFavoriteEpisode = useBookmarkStore(
    (s) => s.toggleFavoriteEpisode,
  );
  const bookmarks = useBookmarkStore((s) => s.bookmarks);

  const toggleFavoriteStatus = (episodeId: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (mediaId) {
      toggleFavoriteEpisode(mediaId.toString(), episodeId.toString(), {
        title: mediaTitle || "",
        poster: mediaPosterUrl,
        year: new Date().getFullYear(), // We don't have year in this component
      });
    }
  };

  // Toggle whole season watch status
  const toggleSeasonWatchStatus = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    confirmModal.show();
  };

  const handleCancel = () => {
    confirmModal.hide();
  };

  const currentSeasonEpisodes = episodes.filter(
    (ep) => ep.season_number === selectedSeason,
  );

  // Get favorite episodes for this show
  const favoriteEpisodeIds = useBookmarkStore((s) =>
    mediaId
      ? (s.bookmarks[mediaId.toString()]?.favoriteEpisodes ?? EMPTY_ARRAY)
      : EMPTY_ARRAY,
  );

  // Count watched episodes across all seasons, not just the selected one.
  const watchedStats = useMemo(() => {
    if (!mediaId || !totalEpisodes) return { watched: 0, percentage: 0 };

    const showEpisodes: Record<string, ProgressEpisodeItem> =
      progress[mediaId.toString()]?.episodes ?? {};
    let watchedCount = 0;
    Object.values(showEpisodes).forEach((episodeProgress) => {
      const percentage = getProgressPercentage(
        episodeProgress.progress.watched,
        episodeProgress.progress.duration,
      );
      if (percentage > 90) {
        watchedCount += 1;
      }
    });

    // Clamp in case specials push the count past the TMDB total.
    const watched = Math.min(watchedCount, totalEpisodes);
    const percentage = Math.round((watched / totalEpisodes) * 100);

    return { watched, percentage };
  }, [progress, mediaId, totalEpisodes]);

  // Load favorite episodes when favorites is selected
  useEffect(() => {
    if (showFavorites && mediaId && favoriteEpisodeIds.length > 0) {
      const favoriteEpisodesData = episodes.filter((ep) =>
        favoriteEpisodeIds.includes(ep.id.toString()),
      );
      setFavoriteEpisodes(favoriteEpisodesData);
    } else {
      setFavoriteEpisodes([]);
    }
  }, [showFavorites, mediaId, favoriteEpisodeIds, episodes]);

  // Handle season/favorites selection
  const handleSeasonOrFavoritesChange = (item: {
    id: string;
    name: string;
  }) => {
    if (item.id === "favorites") {
      setShowFavorites(true);
      onSeasonChange(-1); // Use -1 to indicate favorites
    } else {
      setShowFavorites(false);
      onSeasonChange(Number(item.id));
    }
  };

  const handleConfirm = (event: React.MouseEvent) => {
    try {
      const episodeWatchedStatus: boolean[] = [];
      currentSeasonEpisodes.forEach((episode: any) => {
        const episodeProgress =
          progress[mediaId?.toString() ?? ""]?.episodes?.[episode.id];
        const percentage = episodeProgress
          ? getProgressPercentage(
              episodeProgress.progress.watched,
              episodeProgress.progress.duration,
            )
          : 0;
        const isAired = hasAired(episode.air_date);
        const isWatched = percentage > 90;
        if (isAired && !isWatched) {
          episodeWatchedStatus.push(isWatched);
        }
      });

      const hasUnwatched = episodeWatchedStatus.length >= 1;

      currentSeasonEpisodes.forEach((episode: any) => {
        const episodeProgress =
          progress[mediaId?.toString() ?? ""]?.episodes?.[episode.id];
        const percentage = episodeProgress
          ? getProgressPercentage(
              episodeProgress.progress.watched,
              episodeProgress.progress.duration,
            )
          : 0;
        const isAired = hasAired(episode.air_date);
        const isWatched = percentage > 90;
        if (hasUnwatched && isAired && !isWatched) {
          toggleWatchStatus(episode.id, event); // Mark unwatched as watched
        } else if (!hasUnwatched && isAired && isWatched) {
          toggleWatchStatus(episode.id, event); // Mark watched as unwatched
        }
      });

      confirmModal.hide();
    } catch (error) {
      console.error("Error in handleConfirm:", error);
      confirmModal.hide();
    }
  };

  const toggleEpisodeExpansion = (
    episodeId: number,
    event: React.MouseEvent,
  ) => {
    event.preventDefault();
    setExpandedEpisodes((prev) => ({
      ...prev,
      [episodeId]: !prev[episodeId],
    }));
  };

  const isTextTruncated = (element: HTMLElement | null) => {
    if (!element) return false;
    return element.scrollHeight > element.clientHeight;
  };

  // Add a new effect to reset states when season changes
  useEffect(() => {
    setExpandedEpisodes({});
    setTruncatedEpisodes({});
  }, [selectedSeason]);

  // Check truncation after render and when expanded state changes
  useEffect(() => {
    const checkTruncation = () => {
      const newTruncatedState: { [key: number]: boolean } = {};
      episodes.forEach((episode) => {
        if (!expandedEpisodes[episode.id]) {
          const element = descriptionRefs.current[episode.id];
          newTruncatedState[episode.id] = isTextTruncated(element);
        }
      });
      setTruncatedEpisodes(newTruncatedState);
    };

    checkTruncation();

    // Wait for the transition to complete
    const timeoutId = setTimeout(checkTruncation, 250);

    // Also check when window is resized
    const handleResize = () => {
      checkTruncation();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [episodes, expandedEpisodes]);

  useEffect(() => {
    const episodeWatchedStatus: boolean[] = [];

    currentSeasonEpisodes.forEach((episode: any) => {
      const episodeProgress =
        progress[mediaId?.toString() ?? ""]?.episodes?.[episode.id];
      const percentage = episodeProgress
        ? getProgressPercentage(
            episodeProgress.progress.watched,
            episodeProgress.progress.duration,
          )
        : 0;
      const isAired = hasAired(episode.air_date);
      const isWatched = percentage > 90;

      if (isAired && !isWatched) {
        episodeWatchedStatus.push(isWatched);
      }
    });

    if (episodeWatchedStatus.length >= 1) {
      setSeasonWatched(true); // If no episodes are watched, we want to mark all as watched
    } else {
      setSeasonWatched(false); // if all episodes are watched, we want to mark all as unwatched
    }
  }, [currentSeasonEpisodes, episodes, mediaId, progress]);

  return (
    <div className="mt-6 md:mt-0">
      {/* Season Selector */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <h4 className="text-lg font-semibold text-white">
            {t("details.episodes")}
          </h4>
          {totalEpisodes && (
            <span className="text-xs md:text-sm text-white/70">
              {t("details.watched", {
                watched: watchedStats.watched,
                total: totalEpisodes,
                percentage: watchedStats.percentage,
              })}
            </span>
          )}
        </div>

        {/* Season Watched Confirmation */}
        <div className="flex items-center justify-between gap-2">
          <Modal id={confirmModal.id}>
            <ModalCard>
              <h3 className="text-lg font-semibold text-white mb-4">
                {SeasonWatched
                  ? t("media.seasonWatched")
                  : t("media.seasonUnwatched")}
              </h3>
              <div className="flex justify-end gap-2">
                <Button theme="secondary" onClick={handleCancel}>
                  {t("actions.cancel")}
                </Button>
                <Button theme="purple" onClick={handleConfirm}>
                  {t("actions.confirm")}
                </Button>
              </div>
            </ModalCard>
          </Modal>
          {!showFavorites && (
            <button
              type="button"
              onClick={(e) => toggleSeasonWatchStatus(e)}
              className="p-1.5 bg-dropdown-background hover:bg-dropdown-hoverBackground transition-colors rounded-full"
              title={t("Mark season as watched")}
            >
              <Icon
                icon={SeasonWatched ? Icons.EYE : Icons.EYE_SLASH}
                className="h-5 w-5 text-white"
              />
            </button>
          )}

          <Dropdown
            options={[
              // Add favorites option if there are favorite episodes
              ...(favoriteEpisodeIds.length > 0
                ? [
                    {
                      id: "favorites",
                      name: `${t("player.menus.episodes.favorites")} (${favoriteEpisodeIds.length})`,
                    },
                  ]
                : []),
              // Add regular seasons
              ...seasons.map((season) => ({
                id: season.season_number.toString(),
                name: `${t("details.season")} ${season.season_number}`,
              })),
            ]}
            selectedItem={{
              id: showFavorites ? "favorites" : selectedSeason.toString(),
              name: showFavorites
                ? `${t("player.menus.episodes.favorites")} (${favoriteEpisodeIds.length})`
                : `${t("details.season")} ${selectedSeason}`,
            }}
            setSelectedItem={handleSeasonOrFavoritesChange}
          />
        </div>
      </div>

      {/* Episodes Carousel */}
      <div className="relative">
        {/* Left scroll button */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 px-4 hidden lg:block">
          <button
            type="button"
            className="p-2 bg-black/80 hover:bg-video-context-hoverColor transition-colors rounded-full border border-video-context-border backdrop-blur-sm"
            onClick={() => handleScroll("left")}
          >
            <Icon icon={Icons.CHEVRON_LEFT} className="text-white/80" />
          </button>
        </div>

        <div
          ref={carouselRef}
          className="flex overflow-x-auto space-x-4 pb-4 pt-2 lg:px-12 scrollbar-hide carousel-container"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* Add padding before the first card */}
          <div className="flex-shrink-0 w-4" />
          {showFavorites && favoriteEpisodes.length === 0 ? (
            <div className="flex-shrink-0 w-full flex justify-center items-center p-8">
              <div className="text-center">
                <p className="text-white/80 mb-2">
                  {t("player.menus.episodes.noFavorites")}
                </p>
                <p className="text-sm text-white/60">
                  {t("player.menus.episodes.favoritesDescription")}
                </p>
              </div>
            </div>
          ) : (
            (showFavorites ? favoriteEpisodes : currentSeasonEpisodes).map(
              (episode) => {
                const isActive =
                  showProgress?.episode?.id === episode.id.toString();
                const episodeProgress =
                  progress[mediaId?.toString() ?? ""]?.episodes?.[episode.id];
                const percentage = episodeProgress
                  ? getProgressPercentage(
                      episodeProgress.progress.watched,
                      episodeProgress.progress.duration,
                    )
                  : 0;
                const isAired = hasAired(episode.air_date);
                const isExpanded = expandedEpisodes[episode.id];
                const isWatched = percentage > 90;
                const isFavorited = mediaId
                  ? (bookmarks[mediaId.toString()]?.favoriteEpisodes?.includes(
                      episode.id.toString(),
                    ) ?? false)
                  : false;

                return (
                  <Link
                    key={episode.id}
                    to={getEpisodeUrl(episode)}
                    ref={isActive ? activeEpisodeRef : null}
                    className={classNames(
                      "flex-shrink-0 transition-all duration-200 relative cursor-pointer hover:scale-95 rounded-lg overflow-hidden",
                      isActive
                        ? "bg-video-context-hoverColor/50 hover:bg-white/5"
                        : "hover:bg-white/5",
                      !isAired ? "opacity-50" : "",
                      isExpanded ? "w-[32rem]" : "w-52 md:w-64",
                      "h-[280px]", // Fixed height for all states
                    )}
                  >
                    {/* Thumbnail */}
                    {!isExpanded && (
                      <div className="relative h-[158px] w-full bg-video-context-hoverColor">
                        {episode.still_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
                            alt={episode.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-black bg-opacity-50">
                            <Icon
                              icon={Icons.FILM}
                              className="text-video-context-type-main opacity-50 text-3xl"
                            />
                          </div>
                        )}

                        {/* Episode Number Badge */}
                        <div className="absolute top-2 left-2 flex items-center space-x-2">
                          <span className="p-0.5 px-2 rounded inline bg-video-context-hoverColor bg-opacity-80 text-video-context-type-main text-sm">
                            {showFavorites
                              ? `S${episode.season_number}E${episode.episode_number}`
                              : `${t("media.episodeShort")}${episode.episode_number}`}
                          </span>
                          {!isAired && (
                            <span className="bg-video-context-hoverColor/50 text-video-context-type-main/80 text-sm px-1 py-0.5 rounded-md">
                              {episode.air_date
                                ? `(${t("details.airs")} - ${new Date(episode.air_date).toLocaleDateString()})`
                                : `(${t("media.unreleased")})`}
                            </span>
                          )}
                        </div>

                        {/* Mark as watched and favorite buttons */}
                        {isAired && (
                          <div className="absolute top-2 right-2 flex gap-1">
                            <button
                              type="button"
                              onClick={(e) =>
                                toggleFavoriteStatus(episode.id, e)
                              }
                              className="p-1.5 bg-black/50 rounded-full hover:bg-black/80 transition-colors"
                              title={t("player.menus.episodes.markAsFavorite")}
                            >
                              <Icon
                                icon={
                                  isFavorited
                                    ? Icons.BOOKMARK
                                    : Icons.BOOKMARK_OUTLINE
                                }
                                className="h-8 w-8 text-white/80"
                              />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => toggleWatchStatus(episode.id, e)}
                              className="p-1.5 bg-black/50 rounded-full hover:bg-black/80 transition-colors"
                              title={
                                isWatched
                                  ? t("player.menus.episodes.markAsUnwatched")
                                  : t("player.menus.episodes.markAsWatched")
                              }
                            >
                              <Icon
                                icon={isWatched ? Icons.EYE_SLASH : Icons.EYE}
                                className="h-4 w-4 text-white/80"
                              />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div
                      className={classNames(
                        "p-3",
                        isExpanded ? "h-full" : "h-[122px]",
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-white line-clamp-1">
                          {episode.name}
                        </h3>
                        {isExpanded && isAired && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={(e) =>
                                toggleFavoriteStatus(episode.id, e)
                              }
                              className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                              title={t("player.menus.episodes.markAsFavorite")}
                            >
                              <Icon
                                icon={
                                  isFavorited
                                    ? Icons.BOOKMARK
                                    : Icons.BOOKMARK_OUTLINE
                                }
                                className="h-8 w-8 text-white/80"
                              />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => toggleWatchStatus(episode.id, e)}
                              className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                              title={
                                isWatched
                                  ? t("player.menus.episodes.markAsUnwatched")
                                  : t("player.menus.episodes.markAsWatched")
                              }
                            >
                              <Icon
                                icon={isWatched ? Icons.EYE_SLASH : Icons.EYE}
                                className="h-4 w-4 text-white/80"
                              />
                            </button>
                          </div>
                        )}
                      </div>
                      {episode.overview && (
                        <div className="relative">
                          <p
                            ref={(el) => {
                              descriptionRefs.current[episode.id] = el;
                            }}
                            className={classNames(
                              "text-sm text-white/80 mt-1.5 transition-all duration-200",
                              !isExpanded
                                ? "line-clamp-2"
                                : "max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent pr-2",
                            )}
                          >
                            {episode.overview}
                          </p>
                          {!isExpanded && truncatedEpisodes[episode.id] && (
                            <button
                              type="button"
                              onClick={(e) =>
                                toggleEpisodeExpansion(episode.id, e)
                              }
                              className="text-sm text-white/60 hover:text-white transition-opacity duration-200 opacity-0 animate-fade-in"
                            >
                              {t("player.menus.episodes.showMore")}
                            </button>
                          )}
                          {isExpanded && (
                            <button
                              type="button"
                              onClick={(e) =>
                                toggleEpisodeExpansion(episode.id, e)
                              }
                              className="mt-2 text-sm text-white/60 hover:text-white transition-opacity duration-200 opacity-0 animate-fade-in"
                            >
                              {t("player.menus.episodes.showLess")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {percentage > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-progress-background/25">
                        <div
                          className="h-full bg-progress-filled"
                          style={{
                            width: `${percentage > 98 ? 100 : percentage}%`,
                          }}
                        />
                      </div>
                    )}
                  </Link>
                );
              },
            )
          )}

          {/* Add padding after the last card */}
          <div className="flex-shrink-0 w-4" />
        </div>

        {/* Right scroll button */}
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 px-4 hidden lg:block">
          <button
            type="button"
            className="p-2 bg-black/80 hover:bg-video-context-hoverColor transition-colors rounded-full border border-video-context-border backdrop-blur-sm"
            onClick={() => handleScroll("right")}
          >
            <Icon icon={Icons.CHEVRON_RIGHT} className="text-white/80" />
          </button>
        </div>
      </div>
    </div>
  );
}
