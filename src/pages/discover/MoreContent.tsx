import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import classNames from "classnames";

import { Button } from "@/components/buttons/Button";
import { Dropdown } from "@/components/form/Dropdown";
import { Icon, Icons } from "@/components/Icon";
import { WideContainer } from "@/components/layout/WideContainer";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaGrid } from "@/components/media/MediaGrid";
import { Heading1 } from "@/components/utils/Text";
import {
  DiscoverContentType,
  MediaType,
  useDiscoverMedia,
  useDiscoverOptions,
} from "@/pages/discover/hooks/useDiscoverMedia";
import { SubPageLayout } from "@/pages/layouts/SubPageLayout";
import { useDiscoverStore } from "@/stores/discover";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { useProgressStore } from "@/stores/progress";
import { MediaItem } from "@/utils/media/mediaTypes";

interface MoreContentProps {
  onShowDetails?: (media: MediaItem) => void;
}

export function MoreContent({ onShowDetails }: MoreContentProps) {
  const { mediaType = "movie", contentType, id, category } = useParams();
  const [currentPage, setCurrentPage] = useState(1);
  const currentKey = `${contentType}-${mediaType}-${id}`;
  const [prevKey, setPrevKey] = useState(currentKey);

  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setCurrentPage(1);
  }

  const { providers, genres } = useDiscoverOptions(mediaType as MediaType);

  const selectedProvider = React.useMemo(() => {
    if (contentType === "provider" && id) {
      const p = providers.find((provider) => provider.id === id);
      return p ? { id: p.id, name: p.name } : null;
    }
    return null;
  }, [contentType, id, providers]);

  const selectedGenre = React.useMemo(() => {
    if (contentType === "genre" && id) {
      const g = genres.find((genre) => genre.id.toString() === id);
      return g ? { id: g.id.toString(), name: g.name } : null;
    }
    return null;
  }, [contentType, id, genres]);

  const selectedRecommendationId = contentType === "recommendations" ? id || "" : "";
  const [isContentVisible, setIsContentVisible] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showModal } = useOverlayStack();
  const { lastView } = useDiscoverStore();
  const progressStore = useProgressStore();

  // Get recommendation sources from progress store
  const recommendationSources = Object.entries(progressStore.items || {})
    .filter(
      ([_itemId, item]) =>
        item.type === (mediaType === "tv" ? "show" : "movie"),
    )
    .map(([itemId, item]) => ({
      id: itemId,
      title: item.title || "",
    }));

  // Find selected recommendation source (used in multiple places)
  const selectedRecommendationSource = React.useMemo(
    () => recommendationSources.find((s) => s.id === selectedRecommendationId),
    [recommendationSources, selectedRecommendationId],
  );

  // Determine the actual content type and ID from URL parameters
  const actualContentType = contentType || category?.split("-")[0] || "popular";
  const actualMediaType =
    mediaType || (category?.endsWith("-tv") ? "tv" : "movie");

  // Fetch media using our hook
  const {
    media: mediaItems,
    isLoading,
    hasMore,
    sectionTitle,
  } = useDiscoverMedia({
    contentType: actualContentType as DiscoverContentType,
    mediaType: actualMediaType as MediaType,
    id:
      id ||
      selectedProvider?.id ||
      selectedGenre?.id ||
      selectedRecommendationId,
    page: currentPage,
    genreName: selectedGenre?.name,
    providerName: selectedProvider?.name,
    mediaTitle: selectedRecommendationSource?.title,
    isCarouselView: false,
  });

  // Handle content visibility
  useEffect(() => {
    if (!isLoading || currentPage > 1) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setIsContentVisible(true);
      }, 50);
      return () => clearTimeout(timer);
    }
    setIsContentVisible(false);
  }, [isLoading, mediaItems, currentPage]);

  // Scroll to top when entering the page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [contentType, mediaType, id]);

  const handleBack = () => {
    if (lastView) {
      navigate(lastView.url);
      window.scrollTo(0, lastView.scrollPosition);
    } else {
      navigate(-1);
    }
  };

  const handleShowDetails = async (media: MediaItem) => {
    if (onShowDetails) {
      onShowDetails(media);
      return;
    }
    showModal("discover-details", {
      id: Number(media.id),
      type: media.type === "movie" ? "movie" : "show",
    });
  };

  const handleLoadMore = async () => {
    setCurrentPage((prev) => prev + 1);
  };

  return (
    <SubPageLayout>
      <WideContainer>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center text-white hover:text-gray-300 transition-colors"
            >
              <Icon className="text-xl" icon={Icons.ARROW_LEFT} />
              <span className="ml-2">{t("discover.page.back")}</span>
            </button>
          </div>
          
          <div className="flex items-center justify-between gap-8 pb-4">
            <Heading1 className="text-2xl font-bold text-white">
              {sectionTitle}
            </Heading1>
            {contentType === "recommendations" && (
              <div className="relative">
                <Dropdown
                  selectedItem={
                    selectedRecommendationSource
                      ? {
                          id: selectedRecommendationId,
                          name: selectedRecommendationSource?.title || "",
                        }
                      : { id: "", name: "..." }
                  }
                  setSelectedItem={(item) => navigate(`/discover/more/recommendations/${item.id}/${actualMediaType}`)}
                  options={recommendationSources.map((source) => ({
                    id: source.id,
                    name: source.title,
                  }))}
                  customButton={
                    <button
                      type="button"
                      className="px-2 py-1 text-sm bg-mediaCard-hoverBackground rounded-full hover:bg-mediaCard-background transition-colors flex items-center gap-1"
                    >
                      <span>{t("discover.carousel.change")}</span>
                      <Icon
                        icon={Icons.UP_DOWN_ARROW}
                        className="text-xs text-dropdown-secondary"
                      />
                    </button>
                  }
                  side="right"
                />
              </div>
            )}
          </div>
        </div>

        {(contentType === "provider" || contentType === "genre") && (
          <div
            data-nav-row
            className="flex items-center gap-3 mb-4 overflow-x-auto no-scrollbar py-4 -mx-4 px-4 sm:mx-0 sm:px-0 mask-linear-right"
          >
            {(contentType === "provider" ? providers : genres).map((item: any) => {
              const isSelected = item.id.toString() === (selectedProvider?.id || selectedGenre?.id);
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    if (contentType === "provider") {
                      navigate(`/discover/more/provider/${item.id}/${actualMediaType}`);
                    } else {
                      navigate(`/discover/more/genre/${item.id}/${actualMediaType}`);
                    }
                  }}
                  className={classNames(
                    "px-4 py-2 rounded-full text-sm font-medium tracking-wide whitespace-nowrap transition-all duration-300 ease-out flex-shrink-0 select-none",
                    isSelected
                      ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                      : "bg-search-background/40 backdrop-blur-md text-type-secondary hover:text-white hover:bg-search-hoverBackground/80 border border-white/5 hover:border-white/15 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                  )}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        )}

        {isLoading && currentPage === 1 ? (
          <div className="animate-pulse">
            <MediaGrid>
              {Array(20)
                .fill(null)
                .map((_, i) => (
                  <div
                    key={`loading-skeleton-${i}`}
                    className="relative group cursor-default user-select-none rounded-xl p-2 bg-transparent"
                  >
                    <div className="animate-pulse">
                      <div className="w-full aspect-[2/3] bg-mediaCard-hoverBackground rounded-lg" />
                      <div className="mt-2 h-4 bg-mediaCard-hoverBackground rounded w-3/4" />
                    </div>
                  </div>
                ))}
            </MediaGrid>
          </div>
        ) : (
          <div
            className={`transition-opacity duration-300 ease-in-out ${
              isContentVisible ? "opacity-100" : "opacity-0"
            }`}
          >
          <MediaGrid>
            {mediaItems.map((item) => {
              const isTVShow = Boolean(item.first_air_date);
              const releaseDate = isTVShow
                ? item.first_air_date
                : item.release_date;
              const year = releaseDate
                ? parseInt(releaseDate.split("-")[0], 10)
                : undefined;

              const mediaItem: MediaItem = {
                id: item.id.toString(),
                title: item.title || item.name || "",
                poster: item.poster_path
                  ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
                  : "/placeholder.png",
                type: isTVShow ? "show" : "movie",
                year,
                release_date: releaseDate ? new Date(releaseDate) : undefined,
              };

              return (
                <div
                  key={item.id}
                  style={{ userSelect: "none" }}
                  onContextMenu={(e: React.MouseEvent<HTMLDivElement>) =>
                    e.preventDefault()
                  }
                >
                  <MediaCard
                    media={mediaItem}
                    onShowDetails={handleShowDetails}
                    linkable
                  />
                </div>
              );
            })}
          </MediaGrid>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  theme="purple"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                >
                  {isLoading
                    ? t("discover.page.loading")
                    : t("discover.page.loadMore")}
                </Button>
              </div>
            )}
          </div>
        )}
      </WideContainer>
    </SubPageLayout>
  );
}
