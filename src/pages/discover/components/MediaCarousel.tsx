import { Listbox } from "@headlessui/react";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useWindowSize } from "react-use";

import { Dropdown, OptionItem } from "@/components/form/Dropdown";
import { Icon, Icons } from "@/components/Icon";
import { MediaCard } from "@/components/media/MediaCard";
import { Flare } from "@/components/utils/Flare";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  DiscoverContentType,
  MediaType,
  useDiscoverMedia,
  useDiscoverOptions,
} from "@/pages/discover/hooks/useDiscoverMedia";
import { useDiscoverStore } from "@/stores/discover";
import { useProgressStore } from "@/stores/progress";
import { MediaItem } from "@/utils/media/mediaTypes";

import { CarouselNavButtons } from "./CarouselNavButtons";

const SKELETON_COUNT = 10;

interface ContentConfig {
  type: DiscoverContentType;
  fallback?: DiscoverContentType;
}

interface MediaCarouselProps {
  content: ContentConfig;
  isTVShow: boolean;
  carouselRefs: React.MutableRefObject<{
    [key: string]: HTMLDivElement | null;
  }>;
  onShowDetails?: (media: MediaItem) => void;
  moreContent?: boolean;
  moreLink?: string;
  showProviders?: boolean;
  showGenres?: boolean;
  showRecommendations?: boolean;
  enabled?: boolean;
}

function MoreCard({ link }: { link: string }) {
  const { t } = useTranslation();

  return (
    <div className="relative mt-4 group cursor-pointer user-select-none rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto">
      <Link to={link} className="block">
        <Flare.Base className="group -m-[0.705em] hover:scale-95 transition-all rounded-xl bg-background-main duration-300 hover:bg-mediaCard-hoverBackground tabbable">
          <Flare.Light
            flareSize={300}
            cssColorVar="--colors-mediaCard-hoverAccent"
            backgroundClass="bg-mediaCard-hoverBackground duration-100"
            className="rounded-xl bg-background-main group-hover:opacity-100"
          />
          <Flare.Child className="pointer-events-auto relative mb-2 p-[0.4em] transition-transform duration-300">
            <div className="relative pb-[150%] w-full flex items-center justify-center">
              <div className="flex absolute inset-0 flex-col items-center justify-center">
                <Icon
                  icon={Icons.ARROW_RIGHT}
                  className="text-4xl mb-2 transition-transform duration-300"
                />
                <span className="text-sm text-center px-2">
                  {t("discover.carousel.more")}
                </span>
              </div>
            </div>
          </Flare.Child>
        </Flare.Base>
      </Link>
    </div>
  );
}

export function MediaCarousel({
  content,
  isTVShow,
  carouselRefs,
  onShowDetails,
  moreContent,
  moreLink,
  showProviders = false,
  showGenres = false,
  showRecommendations = false,
  enabled = true,
}: MediaCarouselProps) {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowSize();
  const { setLastView } = useDiscoverStore();
  const { isMobile } = useIsMobile();
  const browser = !!window.chrome;

  // State for selected options
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [selectedProviderName, setSelectedProviderName] = useState<string>("");
  const [selectedGenreId, setSelectedGenreId] = useState<string>("");
  const [selectedGenreName, setSelectedGenreName] = useState<string>("");
  const [selectedRecommendationId, setSelectedRecommendationId] =
    useState<string>("");
  const [selectedRecommendationTitle, setSelectedRecommendationTitle] =
    useState<string>("");
  const [selectedGenre, setSelectedGenre] = React.useState<OptionItem | null>(
    null,
  );

  // Get available providers and genres
  const mediaType: MediaType = isTVShow ? "tv" : "movie";
  const { providers, genres } = useDiscoverOptions(mediaType);

  // Get progress items for recommendations
  const progressItems = useProgressStore((state) => state.items);
  const recommendationSources = React.useMemo(
    () =>
      Object.entries(progressItems || {})
        .filter(([_, item]) => item.type === (isTVShow ? "show" : "movie"))
        .map(([id, item]) => ({
          id,
          title: item.title || "",
        })),
    [progressItems, isTVShow],
  );

  const recommendationSourceMap = React.useMemo(
    () => new Map(recommendationSources.map((source) => [source.id, source])),
    [recommendationSources],
  );

  // Handle provider/genre selection
  const handleProviderChange = React.useCallback((id: string, name: string) => {
    setSelectedProviderId(id);
    setSelectedProviderName(name);
  }, []);

  const handleGenreChange = React.useCallback((id: string, name: string) => {
    setSelectedGenreId(id);
    setSelectedGenreName(name);
  }, []);

  // Get related buttons based on type
  const relatedButtons = React.useMemo(() => {
    if (showProviders) {
      return providers.map((p) => ({ id: p.id, name: p.name }));
    }
    if (showGenres) {
      return genres.map((g) => ({ id: g.id.toString(), name: g.name }));
    }
    return undefined;
  }, [showProviders, showGenres, providers, genres]);

  // Set initial provider/genre selection
  useEffect(() => {
    if (showProviders && providers.length > 0 && !selectedProviderId) {
      handleProviderChange(providers[0].id, providers[0].name);
    }
    if (showGenres && genres.length > 0 && !selectedGenreId) {
      handleGenreChange(genres[0].id.toString(), genres[0].name);
    }
  }, [
    showProviders,
    showGenres,
    providers,
    genres,
    selectedProviderId,
    selectedGenreId,
    handleProviderChange,
    handleGenreChange,
  ]);

  // Get the appropriate button click handler
  const onButtonClick = React.useMemo(() => {
    if (showProviders) return handleProviderChange;
    if (showGenres) return handleGenreChange;
    return undefined;
  }, [showProviders, showGenres, handleProviderChange, handleGenreChange]);

  // Split buttons into visible and dropdown based on window width
  const { visibleButtons, dropdownButtons } = React.useMemo(() => {
    if (!relatedButtons) return { visibleButtons: [], dropdownButtons: [] };

    const visible = windowWidth > 850 ? relatedButtons.slice(0, 5) : [];
    const dropdown =
      windowWidth > 850 ? relatedButtons.slice(5) : relatedButtons;

    return { visibleButtons: visible, dropdownButtons: dropdown };
  }, [relatedButtons, windowWidth]);

  // Determine content type and ID based on selection
  const contentType = React.useMemo(() => {
    if (showProviders && selectedProviderId) return "provider";
    if (showGenres && selectedGenreId) return "genre";
    if (showRecommendations && selectedRecommendationId)
      return "recommendations";
    return content.type;
  }, [
    showProviders,
    selectedProviderId,
    showGenres,
    selectedGenreId,
    showRecommendations,
    selectedRecommendationId,
    content.type,
  ]);

  // Fetch media using our hook
  const { media, sectionTitle, actualContentType, error, isLoading } =
    useDiscoverMedia({
      contentType,
      mediaType,
      id: selectedProviderId || selectedGenreId || selectedRecommendationId,
      fallbackType: content.fallback,
      genreName: selectedGenreName,
      providerName: selectedProviderName,
      mediaTitle: selectedRecommendationTitle,
      isCarouselView: true,
      enabled,
    });

  // Hide section if there's an error or no content (after loading is complete)
  const shouldHide = !isLoading && (error || media.length === 0);

  // Find active button
  const activeButton = React.useMemo(() => {
    return relatedButtons?.find(
      (btn) =>
        btn.name === selectedGenre?.name ||
        btn.name === sectionTitle.split(" on ")[1],
    );
  }, [relatedButtons, selectedGenre?.name, sectionTitle]);

  // Convert buttons to dropdown options
  const dropdownOptions: OptionItem[] = React.useMemo(() => {
    return dropdownButtons.map((button) => ({
      id: button.id,
      name: button.name,
    }));
  }, [dropdownButtons]);

  const visibleButtonIdSet = React.useMemo(
    () => new Set(visibleButtons.map((btn) => btn.id)),
    [visibleButtons],
  );

  const selectedRecommendationItem = React.useMemo(() => {
    const selected = recommendationSourceMap.get(selectedRecommendationId);
    if (selected) {
      return {
        id: selectedRecommendationId,
        name: selected.title,
      };
    }

    return {
      id: "",
      name: recommendationSources[0]?.title || "",
    };
  }, [
    recommendationSourceMap,
    selectedRecommendationId,
    recommendationSources,
  ]);

  const recommendationOptions = React.useMemo(
    () =>
      recommendationSources.map((source) => ({
        id: source.id,
        name: source.title,
      })),
    [recommendationSources],
  );

  const activeDropdownLabel = React.useMemo(() => {
    if (activeButton && !visibleButtonIdSet.has(activeButton.id)) {
      return activeButton.name;
    }

    return "...";
  }, [activeButton, visibleButtonIdSet]);

  // Set selected genre if active button is in dropdown
  React.useEffect(() => {
    if (activeButton && !visibleButtonIdSet.has(activeButton.id)) {
      setSelectedGenre({ id: activeButton.id, name: activeButton.name });
    }
  }, [activeButton, visibleButtonIdSet]);

  // Set initial recommendation source
  useEffect(() => {
    if (
      showRecommendations &&
      recommendationSources.length > 0 &&
      !selectedRecommendationId
    ) {
      const randomSource =
        recommendationSources[
          Math.floor(Math.random() * recommendationSources.length)
        ];
      setSelectedRecommendationId(randomSource.id);
      setSelectedRecommendationTitle(randomSource.title);
    }
  }, [showRecommendations, recommendationSources, selectedRecommendationId]);

  const categorySlug = `${sectionTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${isTVShow ? "tv" : "movie"}`;
  const isScrollingRef = useRef(false);

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

  const handleMoreClick = React.useCallback(() => {
    setLastView({
      url: window.location.pathname,
      scrollPosition: window.scrollY,
    });
  }, [setLastView]);

  // Generate more link
  const generatedMoreLink = React.useMemo(() => {
    if (moreLink) return moreLink;

    const baseLink = `/discover/more`;
    if (showProviders && selectedProviderId) {
      return `${baseLink}/provider/${selectedProviderId}/${mediaType}`;
    }
    if (showGenres && selectedGenreId) {
      return `${baseLink}/genre/${selectedGenreId}/${mediaType}`;
    }
    if (showRecommendations && selectedRecommendationId) {
      return `${baseLink}/recommendations/${selectedRecommendationId}/${mediaType}`;
    }
    return `${baseLink}/${actualContentType}/${mediaType}`;
  }, [
    moreLink,
    showProviders,
    selectedProviderId,
    showGenres,
    selectedGenreId,
    showRecommendations,
    selectedRecommendationId,
    mediaType,
    actualContentType,
  ]);

  // Hide the entire section if there's an error or no content
  if (shouldHide) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between ml-2 md:ml-8 mt-2">
        <div className="flex flex-col pl-2 lg:pl-[68px]">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl cursor-default font-bold text-white md:text-2xl pl-0 text-balance">
              {sectionTitle}
            </h2>
            {showRecommendations &&
              recommendationSources &&
              recommendationSources.length > 0 && (
                <div className="relative pr-4">
                  <Dropdown
                    selectedItem={selectedRecommendationItem}
                    setSelectedItem={(item) => {
                      const source = recommendationSourceMap.get(item.id);
                      if (source) {
                        setSelectedRecommendationId(item.id);
                        setSelectedRecommendationTitle(source.title);
                      }
                    }}
                    options={recommendationOptions}
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
                    customMenu={
                      <Listbox.Options static className="py-1">
                        {recommendationSources.map((opt) => (
                          <Listbox.Option
                            className={({ active }) =>
                              `cursor-pointer min-w-60 flex gap-4 items-center relative select-none py-2 px-4 mx-1 rounded-lg ${
                                active
                                  ? "bg-background-secondaryHover text-type-link"
                                  : "text-type-secondary"
                              }`
                            }
                            key={opt.id}
                            value={{ id: opt.id, name: opt.title }}
                          >
                            {({ selected }) => (
                              <>
                                <span
                                  className={`block ${selected ? "font-medium" : "font-normal"}`}
                                >
                                  {opt.title}
                                </span>
                                {selected && (
                                  <Icon
                                    icon={Icons.CHECKMARK}
                                    className="text-xs text-type-link"
                                  />
                                )}
                              </>
                            )}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    }
                  />
                </div>
              )}
          </div>
          {moreContent && (
            <Link
              to={generatedMoreLink}
              onClick={handleMoreClick}
              className="flex items-center hover:text-type-link transition-colors"
            >
              <span className="text-sm">{t("discover.carousel.more")}</span>
              <Icon className="text-sm ml-1" icon={Icons.ARROW_RIGHT} />
            </Link>
          )}
        </div>
        {relatedButtons && relatedButtons.length > 0 && (
          <div className="flex items-center space-x-2 mr-6">
            {visibleButtons?.map((button) => (
              <button
                type="button"
                key={button.id}
                onClick={() => onButtonClick?.(button.id, button.name)}
                className={`px-3 py-1 text-sm rounded-full hover:bg-mediaCard-background transition-colors whitespace-nowrap flex-shrink-0 ${
                  button.id === (selectedProviderId || selectedGenreId)
                    ? "bg-mediaCard-background"
                    : "bg-mediaCard-hoverBackground"
                }`}
              >
                {button.name}
              </button>
            ))}
            {dropdownButtons && dropdownButtons.length > 0 && (
              <div className="relative my-0">
                <Dropdown
                  selectedItem={
                    selectedGenre || {
                      id: "",
                      name: activeDropdownLabel,
                    }
                  }
                  setSelectedItem={(item) => {
                    setSelectedGenre(item);
                    onButtonClick?.(item.id, item.name);
                  }}
                  options={dropdownOptions}
                  customButton={
                    <button
                      type="button"
                      className="px-3 py-1 text-sm bg-mediaCard-hoverBackground rounded-full hover:bg-mediaCard-background transition-colors flex items-center gap-1"
                    >
                      <span>
                        {activeDropdownLabel}
                      </span>
                      <Icon
                        icon={Icons.UP_DOWN_ARROW}
                        className="text-xs text-dropdown-secondary"
                      />
                    </button>
                  }
                  side="right"
                  preventWrap
                />
              </div>
            )}
          </div>
        )}
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

          {media.length > 0
            ? media.map((item) => (
                <div
                  onContextMenu={(e: React.MouseEvent<HTMLDivElement>) =>
                    e.preventDefault()
                  }
                  key={item.id}
                  className="relative mt-4 group cursor-pointer user-select-none rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto"
                >
                  <MediaCard
                    linkable
                    key={item.id}
                    media={{
                      id: item.id.toString(),
                      title: item.title || item.name || "",
                      poster: item.poster_path
                        ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
                        : "/placeholder.png",
                      type: isTVShow ? "show" : "movie",
                      year: isTVShow
                        ? item.first_air_date
                          ? parseInt(item.first_air_date.split("-")[0], 10)
                          : undefined
                        : item.release_date
                          ? parseInt(item.release_date.split("-")[0], 10)
                          : undefined,
                    }}
                    onShowDetails={onShowDetails}
                  />
                </div>
              ))
            : Array(SKELETON_COUNT)
                .fill(null)
                .map((_, index) => (
                  <div
                    key={`skeleton-${categorySlug}-${index}`}
                    className="relative mt-4 group cursor-default user-select-none rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto"
                  >
                    <MediaCard
                      media={{
                        id: `skeleton-${index}`,
                        title: "",
                        poster: "",
                        type: isTVShow ? "show" : "movie",
                      }}
                      forceSkeleton
                    />
                  </div>
                ))}

          {moreContent && generatedMoreLink && (
            <MoreCard link={generatedMoreLink} />
          )}

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
