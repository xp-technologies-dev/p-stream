import { useEffect, useRef, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { To, useNavigate } from "react-router-dom";

import { WideContainer } from "@/components/layout/WideContainer";
import { useDebounce } from "@/hooks/useDebounce";
import { useRandomTranslation } from "@/hooks/useRandomTranslation";
import { useSearchQuery } from "@/hooks/useSearchQuery";
import { FeaturedCarousel } from "@/pages/discover/components/FeaturedCarousel";
import type { FeaturedMedia } from "@/pages/discover/components/FeaturedCarousel";
import DiscoverContent from "@/pages/discover/discoverContent";
import { HomeLayout } from "@/pages/layouts/HomeLayout";
import { BookmarksCarousel } from "@/pages/parts/home/BookmarksCarousel";
import { BookmarksGrid } from "@/pages/parts/home/BookmarksGrid";
import { GenreChips } from "@/pages/parts/home/GenreChips";
import { HeroPart } from "@/pages/parts/home/HeroPart";
import { HomeSearchRow } from "@/pages/parts/home/HomeSearchRow";
import { WatchingCarousel } from "@/pages/parts/home/WatchingCarousel";
import { WatchingGrid } from "@/pages/parts/home/WatchingGrid";
import { SearchListPart } from "@/pages/parts/search/SearchListPart";
import { SearchLoadingPart } from "@/pages/parts/search/SearchLoadingPart";
import { conf } from "@/setup/config";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { usePreferencesStore } from "@/stores/preferences";
import { MediaItem } from "@/utils/media/mediaTypes";

import { Button } from "./About";
import { AdsPart } from "./parts/home/AdsPart";
import { AppsNotice } from "./parts/home/AppsNotice";
import { HomeAd } from "./parts/home/HomeAd";
import { SupportBar } from "./parts/home/SupportBar";
import { ZliveNotice } from "./parts/home/ZliveNotice";

function useSearch(search: string) {
  const [searching, setSearching] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const debouncedSearch = useDebounce<string>(search, 500);
  useEffect(() => {
    setSearching(search !== "");
    setLoading(search !== "");
    if (search !== "") {
      window.scrollTo(0, 0);
    }
  }, [search]);
  useEffect(() => {
    setLoading(false);
  }, [debouncedSearch]);

  return {
    loading,
    searching,
  };
}

// What the sigma?

export function HomePage() {
  const { t } = useTranslation();
  const { t: randomT } = useRandomTranslation();
  const emptyText = randomT(`home.search.empty`);
  const navigate = useNavigate();
  const [showBg, setShowBg] = useState<boolean>(false);
  const searchParams = useSearchQuery();
  const [search] = searchParams;
  const s = useSearch(search);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showWatching, setShowWatching] = useState(false);
  // Real width check (not a CSS breakpoint) so exactly one <HomeAd> instance
  // ever mounts -- rendering two copies toggled by CSS visibility both hits
  // the ad script's dedupe-by-id guard, so whichever one mounts first can
  // "win" the real script even while sitting in a display:none container,
  // leaving the visible copy permanently empty.
  const [hasWideMargins, setHasWideMargins] = useState(false);
  useEffect(() => {
    function onResize() {
      setHasWideMargins(window.innerWidth >= 1536);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const { showModal } = useOverlayStack();
  const enableDiscover = usePreferencesStore((state) => state.enableDiscover);
  const enableFeatured = usePreferencesStore((state) => state.enableFeatured);
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const enableCarouselView = usePreferencesStore(
    (state) => state.enableCarouselView,
  );
  const enableLowPerformanceMode = usePreferencesStore(
    (state) => state.enableLowPerformanceMode,
  );
  const homeSectionOrder = usePreferencesStore(
    (state) => state.homeSectionOrder,
  );

  const [carouselContainerRef] = useAutoAnimate<HTMLDivElement>();
  const [listContainerRef] = useAutoAnimate<HTMLDivElement>();

  const handleClick = (path: To) => {
    window.scrollTo(0, 0);
    navigate(path);
  };

  const handleShowDetails = async (media: MediaItem | FeaturedMedia) => {
    showModal("details", {
      id: Number(media.id),
      type: media.type === "movie" ? "movie" : "show",
    });
  };

  const renderHomeSections = () => {
    const sections = homeSectionOrder.map((section) => {
      switch (section) {
        case "watching":
          return enableCarouselView ? (
            <WatchingCarousel
              key="watching"
              carouselRefs={carouselRefs}
              onShowDetails={handleShowDetails}
            />
          ) : (
            <WatchingGrid
              key="watching"
              onItemsChange={setShowWatching}
              onShowDetails={handleShowDetails}
            />
          );
        case "bookmarks":
          return enableCarouselView ? (
            <BookmarksCarousel
              key="bookmarks"
              carouselRefs={carouselRefs}
              onShowDetails={handleShowDetails}
            />
          ) : (
            <BookmarksGrid
              key="bookmarks"
              onItemsChange={setShowBookmarks}
              onShowDetails={handleShowDetails}
            />
          );
        default:
          return null;
      }
    });

    if (enableCarouselView) {
      return (
        <WideContainer ultraWide classNames="!px-3 md:!px-9">
          <div ref={carouselContainerRef} className="flex flex-col gap-8">
            {sections}
          </div>
        </WideContainer>
      );
    }
    return (
      <WideContainer>
        <div ref={listContainerRef} className="flex flex-col gap-8">{sections}</div>
      </WideContainer>
    );
  };

  return (
    <HomeLayout
      showBg={showBg}
      navCenter={
        enableFeatured ? (
          <HomeSearchRow searchParams={searchParams} isInFeatured />
        ) : undefined
      }
    >
      {!search && <ZliveNotice />}
      {!search && <AppsNotice />}
      <div className="relative mb-2">
        {hasWideMargins && (
          // Scoped to this hero container (not the viewport), so it scrolls
          // away with the hero instead of chasing the page down like
          // position:fixed would.
          <div className="absolute right-6 top-2 z-10">
            <HomeAd slot="secondary" />
          </div>
        )}
        <Helmet>
          <style type="text/css">{`
            html, body {
              scrollbar-gutter: stable;
            }
          `}</style>
          <title>{t("global.name")}</title>
        </Helmet>
        {enableFeatured ? (
          <>
            <FeaturedCarousel
              onShowDetails={handleShowDetails}
              searching={s.searching}
              shorter
            />
            {(!search || search.length === 0) && (
              <div className="mt-4 px-8">
                <GenreChips />
              </div>
            )}
          </>
        ) : (
          <HeroPart
            searchParams={searchParams}
            setIsSticky={setShowBg}
            showTitle
          />
        )}

        {conf().SHOW_SUPPORT_BAR ? <SupportBar /> : null}

        {conf().SHOW_AD ? <AdsPart /> : null}
      </div>

      {!search && (
        <div className="w-full flex justify-center px-4 my-6">
          <HomeAd />
        </div>
      )}

      {/* Search */}
      {search && (
        <WideContainer>
          {s.loading ? (
            <SearchLoadingPart />
          ) : (
            s.searching && (
              <SearchListPart
                searchQuery={search}
                onShowDetails={handleShowDetails}
              />
            )
          )}
        </WideContainer>
      )}

      {/* User Content */}
      {!search && (
        <div>
          {renderHomeSections()}
          {!hasWideMargins && (
            <div className="w-full flex justify-center my-6 px-4">
              <HomeAd slot="secondary" />
            </div>
          )}
        </div>
      )}

      {/* Under user content */}
      <WideContainer ultraWide classNames="!px-3 md:!px-9">
        {/* Empty text */}
        {!(showBookmarks || showWatching) &&
        (!enableDiscover || enableLowPerformanceMode) ? (
          <div className="flex flex-col translate-y-[-30px] items-center justify-center pt-20">
            <p className="text-[18.5px] pb-3">{emptyText}</p>
          </div>
        ) : null}

        {/* Discover Spacing */}
        {enableDiscover &&
          (enableFeatured ? (
            <div className="pb-4" />
          ) : showBookmarks || showWatching ? (
            <div className="pb-10" />
          ) : (
            <div className="pb-20" />
          ))}
        {/* there... perfect. */}

        {/* Discover section or discover button */}
        {enableDiscover && !search && !enableLowPerformanceMode ? (
          <DiscoverContent />
        ) : (
          <div className="flex flex-col justify-center items-center h-40 space-y-4">
            <div className="flex flex-col items-center justify-center">
              {!search && !enableLowPerformanceMode && (
                <Button
                  className="px-py p-[0.35em] mt-3 rounded-xl text-type-dimmed box-content text-[18px] bg-largeCard-background justify-center items-center"
                  onClick={() => handleClick("/discover")}
                >
                  {t("home.search.discover")}
                </Button>
              )}
            </div>
          </div>
        )}
      </WideContainer>
    </HomeLayout>
  );
}
