import { Listbox } from "@headlessui/react";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { getMediaDetails } from "@/backend/metadata/tmdb";
import { TMDBContentTypes } from "@/backend/metadata/types/tmdb";
import { EditButton } from "@/components/buttons/EditButton";
import { EditButtonWithText } from "@/components/buttons/EditButtonWithText";
import { Dropdown, OptionItem } from "@/components/form/Dropdown";
import { Icon, Icons } from "@/components/Icon";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { WatchedMediaCard } from "@/components/media/WatchedMediaCard";
import { EditBookmarkModal } from "@/components/overlays/EditBookmarkModal";
import { EditGroupModal } from "@/components/overlays/EditGroupModal";
import { useModal } from "@/components/overlays/Modal";
import { UserIcon, UserIcons } from "@/components/UserIcon";
import { Flare } from "@/components/utils/Flare";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CarouselNavButtons } from "@/pages/discover/components/CarouselNavButtons";
import { useBookmarkStore } from "@/stores/bookmarks";
import { useGroupOrderStore } from "@/stores/groupOrder";
import { useProgressStore } from "@/stores/progress";
import { SortOption, sortMediaItems } from "@/utils/media/mediaSorting";
import { MediaItem } from "@/utils/media/mediaTypes";

function parseGroupString(group: string): { icon: UserIcons; name: string } {
  const match = group.match(/^\[([a-zA-Z0-9_]+)\](.*)$/);
  if (match) {
    const iconKey = match[1].toUpperCase() as keyof typeof UserIcons;
    const icon = UserIcons[iconKey] || UserIcons.BOOKMARK;
    const name = match[2].trim();
    return { icon, name };
  }
  return { icon: UserIcons.BOOKMARK, name: group };
}

interface BookmarksCarouselProps {
  carouselRefs: React.MutableRefObject<{
    [key: string]: HTMLDivElement | null;
  }>;
  onShowDetails?: (media: MediaItem) => void;
}

const MAX_ITEMS_PER_SECTION = 20; // Limit items per section

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

function MoreBookmarksCard() {
  const { t } = useTranslation();

  return (
    <div className="relative mt-4 group cursor-pointer rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto">
      <Link to="/bookmarks" className="block">
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
                  {t("home.bookmarks.showAll")}
                </span>
              </div>
            </div>
          </Flare.Child>
        </Flare.Base>
      </Link>
    </div>
  );
}

export function BookmarksCarousel({
  carouselRefs,
  onShowDetails,
}: BookmarksCarouselProps) {
  const { t } = useTranslation();
  const browser = !!window.chrome;
  let isScrolling = false;
  const [editing, setEditing] = useState(() => {
    return localStorage.getItem("__MW::bookmarksEditing") === "true";
  });

  useEffect(() => {
    localStorage.setItem("__MW::bookmarksEditing", editing.toString());
  }, [editing]);

  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const saved = localStorage.getItem("__MW::bookmarksSort");
    return (saved as SortOption) || "date";
  });
  const [runtimeData, setRuntimeData] = useState<Record<string, number>>({});
  const removeBookmark = useBookmarkStore((s) => s.removeBookmark);

  useEffect(() => {
    localStorage.setItem("__MW::bookmarksSort", sortBy);
  }, [sortBy]);

  // Editing modals
  const editBookmarkModal = useModal("bookmark-edit-carousel");
  const editGroupModal = useModal("bookmark-edit-group-carousel");
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(
    null,
  );
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const modifyBookmarks = useBookmarkStore((s) => s.modifyBookmarks);
  const modifyBookmarksByGroup = useBookmarkStore(
    (s) => s.modifyBookmarksByGroup,
  );

  const { isMobile } = useIsMobile();

  const bookmarksLength = useBookmarkStore(
    (state) => Object.keys(state.bookmarks).length,
  );

  const progressItems = useProgressStore((state) => state.items);
  const bookmarks = useBookmarkStore((state) => state.bookmarks);
  const groupOrder = useGroupOrderStore((s) => s.groupOrder);

  useEffect(() => {
    if (sortBy !== "length-asc" && sortBy !== "length-desc") return;
    const ids = Object.keys(bookmarks);
    const missing = ids.filter((id) => !(id in runtimeData));
    if (missing.length === 0) return;

    Promise.all(
      missing.map(async (id) => {
        const type = bookmarks[id].type === "movie" ? TMDBContentTypes.MOVIE : TMDBContentTypes.TV;
        try {
          const data = await getMediaDetails(id, type, false);
          const value = type === TMDBContentTypes.MOVIE
            ? (data as any).runtime ?? 0
            : (data as any).number_of_episodes ?? 0;
          return [id, value] as [string, number];
        } catch {
          return [id, 0] as [string, number];
        }
      }),
    ).then((results) => {
      setRuntimeData((prev) => {
        const next = { ...prev };
        results.forEach(([id, val]) => { next[id] = val; });
        return next;
      });
    });
  }, [sortBy, bookmarks, runtimeData]);

  const items = useMemo(() => {
    const output: MediaItem[] = [];
    Object.entries(bookmarks).forEach((entry) => {
      output.push({
        id: entry[0],
        ...entry[1],
      });
    });
    return sortMediaItems(output, sortBy, bookmarks, progressItems, runtimeData);
  }, [bookmarks, progressItems, sortBy, runtimeData]);

  const { groupedItems, regularItems } = useMemo(() => {
    const grouped: Record<string, MediaItem[]> = {};
    const regular: MediaItem[] = [];

    items.forEach((item) => {
      const bookmark = bookmarks[item.id];
      if (Array.isArray(bookmark?.group)) {
        bookmark.group.forEach((groupName) => {
          if (!grouped[groupName]) {
            grouped[groupName] = [];
          }
          grouped[groupName].push(item);
        });
      } else {
        regular.push(item);
      }
    });

    // Sort items within each group
    Object.keys(grouped).forEach((group) => {
      grouped[group] = sortMediaItems(
        grouped[group],
        sortBy,
        bookmarks,
        progressItems,
        runtimeData,
      );
    });

    // Sort regular items
    const sortedRegular = sortMediaItems(
      regular,
      sortBy,
      bookmarks,
      progressItems,
      runtimeData,
    );

    return { groupedItems: grouped, regularItems: sortedRegular };
  }, [items, bookmarks, progressItems, sortBy, runtimeData]);

  const sortedSections = useMemo(() => {
    const sections: Array<{
      type: "grouped" | "regular";
      group?: string;
      items: MediaItem[];
    }> = [];

    // Create a combined map of all sections (grouped + regular)
    const allSections = new Map<string, MediaItem[]>();

    // Add grouped sections
    Object.entries(groupedItems).forEach(([group, groupItems]) => {
      allSections.set(group, groupItems);
    });

    // Add regular bookmarks as "bookmarks" group
    if (regularItems.length > 0) {
      allSections.set("bookmarks", regularItems);
    }

    // Sort sections based on group order
    if (groupOrder.length === 0) {
      // No order set, use default order
      allSections.forEach((sectionItems, group) => {
        if (group === "bookmarks") {
          sections.push({ type: "regular", items: sectionItems });
        } else {
          sections.push({ type: "grouped", group, items: sectionItems });
        }
      });
    } else {
      // Use the saved order
      const orderMap = new Map(
        groupOrder.map((group, index) => [group, index]),
      );

      Array.from(allSections.entries())
        .sort(([groupA], [groupB]) => {
          const orderA = orderMap.has(groupA)
            ? orderMap.get(groupA)!
            : Number.MAX_SAFE_INTEGER;
          const orderB = orderMap.has(groupB)
            ? orderMap.get(groupB)!
            : Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        })
        .forEach(([group, sectionItems]) => {
          if (group === "bookmarks") {
            sections.push({ type: "regular", items: sectionItems });
          } else {
            sections.push({ type: "grouped", group, items: sectionItems });
          }
        });
    }

    return sections;
  }, [groupedItems, regularItems, groupOrder]);
  // kill me

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

  const handleEditBookmark = (bookmarkId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setEditingBookmarkId(bookmarkId);
    editBookmarkModal.show();
  };

  const handleSaveBookmark = (bookmarkId: string, changes: any) => {
    modifyBookmarks([bookmarkId], changes);
    editBookmarkModal.hide();
    setEditingBookmarkId(null);
  };

  const handleEditGroup = (groupName: string) => {
    setEditingGroupName(groupName);
    editGroupModal.show();
  };

  const handleSaveGroup = (oldGroupName: string, newGroupName: string) => {
    modifyBookmarksByGroup({ oldGroupName, newGroupName });
    editGroupModal.hide();
    setEditingGroupName(null);
  };

  const handleCancelEditBookmark = () => {
    editBookmarkModal.hide();
    setEditingBookmarkId(null);
  };

  const handleCancelEditGroup = () => {
    editGroupModal.hide();
    setEditingGroupName(null);
  };

  const sortOptions: OptionItem[] = [
    { id: "date", name: t("home.bookmarks.sorting.options.date") },
    { id: "title-asc", name: t("home.bookmarks.sorting.options.titleAsc") },
    { id: "title-desc", name: t("home.bookmarks.sorting.options.titleDesc") },
    { id: "year-asc", name: t("home.bookmarks.sorting.options.yearAsc") },
    { id: "year-desc", name: t("home.bookmarks.sorting.options.yearDesc") },
    { id: "length-asc", name: t("home.bookmarks.sorting.options.lengthAsc") },
    { id: "length-desc", name: t("home.bookmarks.sorting.options.lengthDesc") },
  ];

  const selectedSortOption =
    sortOptions.find((opt) => opt.id === sortBy) || sortOptions[0];

  const categorySlug = "bookmarks";
  const SKELETON_COUNT = 10;

  if (bookmarksLength === 0) return null;

  return (
    <>
      {/* Grouped Bookmarks Carousels */}
      {sortedSections.map((section) => {
        if (section.type === "grouped") {
          const { icon, name } = parseGroupString(section.group || "");
          return (
            <div key={section.group}>
              <SectionHeading
                title={name}
                customIcon={
                  <span className="w-6 h-6 flex items-center justify-center">
                    <UserIcon icon={icon} className="w-full h-full" />
                  </span>
                }
                className="ml-4 lg:ml-12 mt-2 -mb-5 lg:pl-[48px]"
              >
                <div className="mr-4 lg:mr-[88px] flex items-center gap-2">
                  {editing && section.group && (
                    <EditButtonWithText
                      editing={editing}
                      onEdit={() => handleEditGroup(section.group!)}
                      id="edit-group-button"
                      text={t("home.bookmarks.groups.editGroup.title")}
                      secondaryText={t(
                        "home.bookmarks.groups.editGroup.cancel",
                      )}
                    />
                  )}
                  <EditButton
                    editing={editing}
                    onEdit={setEditing}
                    id={`edit-button-bookmark-${section.group}`}
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
                      localStorage.setItem("__MW::bookmarksSort", newSort);
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
                  id={`carousel-${section.group}`}
                  data-nav-row
                  data-nav-remember
                  className="grid grid-flow-col auto-cols-max gap-4 pt-0 overflow-x-scroll scrollbar-none rounded-xl overflow-y-hidden md:pl-8 md:pr-8"
                  ref={(el) => {
                    carouselRefs.current[section.group || "bookmarks"] = el;
                  }}
                  onWheel={handleWheel}
                >
                  <div className="lg:w-12" />

                  {section.items
                    .slice(0, MAX_ITEMS_PER_SECTION)
                    .map((media) => (
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
                          onClose={() => removeBookmark(media.id)}
                          editable={editing}
                          onEdit={(e) => handleEditBookmark(media.id, e)}
                        />
                      </div>
                    ))}

                  {section.items.length > MAX_ITEMS_PER_SECTION && (
                    <MoreBookmarksCard />
                  )}

                  <div className="lg:w-12" />
                </div>

                {!isMobile && (
                  <CarouselNavButtons
                    categorySlug={section.group || "bookmarks"}
                    carouselRefs={carouselRefs}
                  />
                )}
              </div>
            </div>
          );
        } // regular items
        return (
          <div key="regular-bookmarks">
            <SectionHeading
              title={t("home.bookmarks.sectionTitle")}
              icon={Icons.BOOKMARK}
              className="ml-4 lg:ml-12 mt-2 -mb-5 lg:pl-[48px]"
            >
              <div className="mr-4 lg:mr-[88px] flex items-center gap-2">
                <EditButton
                  editing={editing}
                  onEdit={setEditing}
                  id="edit-button-bookmark"
                />
              </div>
            </SectionHeading>
            {editing && (
              <div className="mt-4 -mb-4 ml-4 lg:ml-12 lg:pl-[48px]">
                <Dropdown
                  selectedItem={selectedSortOption}
                  setSelectedItem={(item) => setSortBy(item.id as SortOption)}
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

                {section.items.length > 0
                  ? section.items
                      .slice(0, MAX_ITEMS_PER_SECTION)
                      .map((media) => (
                        <div
                          key={media.id}
                          onContextMenu={(
                            e: React.MouseEvent<HTMLDivElement>,
                          ) => e.preventDefault()}
                          className="relative mt-4 group cursor-pointer rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto"
                        >
                          <WatchedMediaCard
                            key={media.id}
                            media={media}
                            onShowDetails={onShowDetails}
                            closable={editing}
                            onClose={() => removeBookmark(media.id)}
                            editable={editing}
                            onEdit={(e) => handleEditBookmark(media.id, e)}
                          />
                        </div>
                      ))
                  : Array.from({ length: SKELETON_COUNT }).map(() => (
                      <MediaCardSkeleton
                        key={`skeleton-${categorySlug}-${Math.random().toString(36).substring(7)}`}
                      />
                    ))}

                {section.items.length > MAX_ITEMS_PER_SECTION && (
                  <MoreBookmarksCard />
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
      })}

      {/* Edit Bookmark Modal */}
      <EditBookmarkModal
        id={editBookmarkModal.id}
        isShown={editBookmarkModal.isShown}
        bookmarkId={editingBookmarkId}
        onCancel={handleCancelEditBookmark}
        onSave={handleSaveBookmark}
      />

      {/* Edit Group Modal */}
      <EditGroupModal
        id={editGroupModal.id}
        isShown={editGroupModal.isShown}
        groupName={editingGroupName}
        onCancel={handleCancelEditGroup}
        onSave={handleSaveGroup}
      />
    </>
  );
}
