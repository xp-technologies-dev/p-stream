import { Listbox } from "@headlessui/react";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { EditButton } from "@/components/buttons/EditButton";
import { Dropdown, OptionItem } from "@/components/form/Dropdown";
import { Icon, Icons } from "@/components/Icon";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { WatchedMediaCard } from "@/components/media/WatchedMediaCard";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CarouselNavButtons } from "@/pages/discover/components/CarouselNavButtons";
import { useProgressStore } from "@/stores/progress";
import { shouldShowProgress } from "@/stores/progress/utils";
import { SortOption, sortMediaItems } from "@/utils/media/mediaSorting";
import { MediaItem } from "@/utils/media/mediaTypes";

interface WatchingCarouselProps {
  carouselRefs: React.MutableRefObject<{
    [key: string]: HTMLDivElement | null;
  }>;
  onShowDetails?: (media: MediaItem) => void;
}

function MediaCardSkeleton() {
  return (
    <div className="relative mt-4 group cursor-default rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto">
      <div className="animate-pulse">
        <div className="w-full aspect-[2/3] bg-mediaCard-hoverBackground rounded-lg" />
        <div className="mt-2 h-4 bg-mediaCard-hoverBackground rounded w-3/4" />
      </div>
    </div>
  );
}

export function WatchingCarousel({
  carouselRefs,
  onShowDetails,
}: WatchingCarouselProps) {
  const { t } = useTranslation();
  const browser = !!window.chrome;
  let isScrolling = false;
  const [editing, setEditing] = useState(() => {
    return localStorage.getItem("__MW::watchingEditing") === "true";
  });
  
  useEffect(() => {
    localStorage.setItem("__MW::watchingEditing", editing.toString());
  }, [editing]);

  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const saved = localStorage.getItem("__MW::watchingSort");
    return (saved as SortOption) || "date";
  });
  const removeItem = useProgressStore((s) => s.removeItem);

  useEffect(() => {
    localStorage.setItem("__MW::watchingSort", sortBy);
  }, [sortBy]);

  const { isMobile } = useIsMobile();

  const itemsLength = useProgressStore((state) => {
    return Object.entries(state.items).filter(
      (entry) => shouldShowProgress(entry[1]).show,
    ).length;
  });

  const progressItems = useProgressStore((state) => state.items);

  const items = useMemo(() => {
    const output: MediaItem[] = [];
    Object.entries(progressItems)
      .filter((entry) => shouldShowProgress(entry[1]).show)
      .forEach((entry) => {
        output.push({
          id: entry[0],
          ...entry[1],
        });
      });
    return sortMediaItems(output, sortBy, undefined, progressItems);
  }, [progressItems, sortBy]);

  const handleWheel = (e: React.WheelEvent) => {
    if (isScrolling) return;
    isScrolling = true;

    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (browser) {
      setTimeout(() => {
        isScrolling = false;
      }, 345);
    } else {
      isScrolling = false;
    }
  };

  const sortOptions: OptionItem[] = [
    { id: "date", name: t("home.continueWatching.sorting.options.date") },
    {
      id: "title-asc",
      name: t("home.continueWatching.sorting.options.titleAsc"),
    },
    {
      id: "title-desc",
      name: t("home.continueWatching.sorting.options.titleDesc"),
    },
    {
      id: "year-asc",
      name: t("home.continueWatching.sorting.options.yearAsc"),
    },
    {
      id: "year-desc",
      name: t("home.continueWatching.sorting.options.yearDesc"),
    },
  ];

  const selectedSortOption =
    sortOptions.find((opt) => opt.id === sortBy) || sortOptions[0];

  const categorySlug = "continue-watching";
  const SKELETON_COUNT = 10;

  if (itemsLength === 0) return null;

  return (
    <>
      <SectionHeading
        title={t("home.continueWatching.sectionTitle")}
        icon={Icons.CLOCK}
        className="ml-4 lg:ml-12 mt-2 -mb-5 lg:pl-[48px]"
      >
        <div className="mr-4 lg:mr-[88px] flex items-center gap-2">
          <EditButton
            editing={editing}
            onEdit={setEditing}
            id="edit-button-watching"
          />
        </div>
      </SectionHeading>
      {editing && (
        <div className="mt-4 -mb-4 ml-4 lg:ml-12 lg:pl-[48px]">
          <Dropdown
            selectedItem={selectedSortOption}
            setSelectedItem={(item) => {
              const newSort = item.id as SortOption;
              setSortBy(newSort);
              localStorage.setItem("__MW::watchingSort", newSort);
            }}
            options={sortOptions}
            customButton={
              <button
                type="button"
                className="px-2 py-1 text-sm bg-mediaCard-hoverBackground rounded-full hover:bg-mediaCard-background transition-colors flex items-center gap-1"
              >
                <span>{selectedSortOption.name}</span>
                <Icon
                  icon={Icons.UP_DOWN_ARROW}
                  className="text-xs text-dropdown-secondary"
                />
              </button>
            }
            side="left"
            customMenu={
              <Listbox.Options static className="py-1">
                {sortOptions.map((opt) => (
                  <Listbox.Option
                    className={({ active }) =>
                      `cursor-pointer min-w-60 flex gap-4 items-center relative select-none py-2 px-4 mx-1 rounded-lg ${
                        active
                          ? "bg-background-secondaryHover text-type-link"
                          : "text-type-secondary"
                      }`
                    }
                    key={opt.id}
                    value={opt}
                  >
                    {({ selected }) => (
                      <>
                        <span
                          className={`block ${selected ? "font-medium" : "font-normal"}`}
                        >
                          {opt.name}
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

          {items.length > 0
            ? items.map((media) => (
                <div
                  key={media.id}
                  onContextMenu={(e: React.MouseEvent<HTMLDivElement>) =>
                    e.preventDefault()
                  }
                  className="relative mt-4 group cursor-pointer rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto"
                >
                  <WatchedMediaCard
                    key={media.id}
                    media={media}
                    onShowDetails={onShowDetails}
                    closable={editing}
                    onClose={() => removeItem(media.id)}
                  />
                </div>
              ))
            : Array.from({ length: SKELETON_COUNT }).map(() => (
                <MediaCardSkeleton
                  key={`skeleton-${categorySlug}-${Math.random().toString(36).substring(7)}`}
                />
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
    </>
  );
}
