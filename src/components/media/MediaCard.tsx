// I'm sorry this is so confusing 😭

import classNames from "classnames";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { mediaItemToId } from "@/backend/metadata/tmdb";
import { DotList } from "@/components/text/DotList";
import {
  ContextMenu,
  ContextMenuDivider,
  ContextMenuItem,
} from "@/components/utils/ContextMenu";
import { Flare } from "@/components/utils/Flare";
import { useSearchQuery } from "@/hooks/useSearchQuery";
import { useBookmarkStore } from "@/stores/bookmarks";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { PlayerMeta } from "@/stores/player/slices/source";
import { usePreferencesStore } from "@/stores/preferences";
import {
  createGroupString,
  parseGroupString,
} from "@/utils/media/bookmarkModifications";
import { MediaItem } from "@/utils/media/mediaTypes";

import { MediaBookmarkButton } from "./MediaBookmark";
import { IconPatch } from "../buttons/IconPatch";
import { Icon, Icons } from "../Icon";

// Simple Intersection Observer Hook
function useIntersectionObserver(options: IntersectionObserverInit = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef<Element | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        ...options,
        rootMargin: options.rootMargin || "300px",
      },
    );

    const currentTarget = targetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [options]);

  return { targetRef, isIntersecting };
}

// Skeleton Component
export function MediaCardSkeleton() {
  const enableMinimalCards = usePreferencesStore((s) => s.enableMinimalCards);

  return (
    <Flare.Base className="group -m-[0.705em] rounded-xl bg-background-main transition-colors duration-300">
      <Flare.Light
        flareSize={300}
        cssColorVar="--colors-mediaCard-hoverAccent"
        backgroundClass="bg-mediaCard-hoverBackground duration-100"
        className="rounded-xl bg-background-main group-hover:opacity-100"
      />
      <Flare.Child className="pointer-events-auto relative mb-2 p-[0.4em] transition-transform duration-300 opacity-60">
        <div className="animate-pulse">
          {/* Poster skeleton - matches MediaCard poster dimensions exactly */}
          <div
            className={classNames(
              "relative pb-[150%] w-full overflow-hidden rounded-xl bg-mediaCard-hoverBackground",
              enableMinimalCards ? "" : "mb-4",
            )}
          />

          {!enableMinimalCards && (
            <>
              {/* Title skeleton - matches MediaCard title dimensions */}
              <div className="mb-1">
                <div className="h-4 bg-mediaCard-hoverBackground rounded w-full mb-1" />
                <div className="h-4 bg-mediaCard-hoverBackground rounded w-3/4 mb-1" />
                <div className="h-4 bg-mediaCard-hoverBackground rounded w-1/2" />
              </div>

              {/* Dot list skeleton - matches MediaCard dot list */}
              <div className="flex items-center gap-1">
                <div className="h-3 bg-mediaCard-hoverBackground rounded w-12" />
                <div className="h-1 w-1 bg-mediaCard-hoverBackground rounded-full" />
                <div className="h-3 bg-mediaCard-hoverBackground rounded w-8" />
              </div>
            </>
          )}
        </div>
      </Flare.Child>
    </Flare.Base>
  );
}

export interface MediaCardProps {
  media: MediaItem;
  linkable?: boolean;
  series?: {
    episode: number;
    season?: number;
    episodeId: string;
    seasonId: string;
  };
  percentage?: number;
  closable?: boolean;
  onClose?: () => void;
  onShowDetails?: (media: MediaItem) => void;
  forceSkeleton?: boolean;
  editable?: boolean;
  onEdit?: (e?: React.MouseEvent) => void;
}

function checkReleased(media: MediaItem): boolean {
  const isReleasedYear = Boolean(
    media.year && media.year <= new Date().getFullYear(),
  );
  const isReleasedDate = Boolean(
    media.release_date && media.release_date <= new Date(),
  );

  // If the media has a release date, use that, otherwise use the year
  const isReleased = media.release_date ? isReleasedDate : isReleasedYear;

  return isReleased;
}

function MediaCardContent({
  media,
  linkable,
  series,
  percentage,
  closable,
  onClose,
  onShowDetails,
  forceSkeleton,
  editable,
  onEdit,
}: MediaCardProps) {
  const { t } = useTranslation();
  const percentageString = `${Math.round(percentage ?? 0).toFixed(0)}%`;

  const isReleased = useCallback(() => checkReleased(media), [media]);

  const canLink = linkable && !closable && isReleased();

  const dotListContent = [t(`media.types.${media.type}`)];

  const [searchQuery] = useSearchQuery();
  const enableMinimalCards = usePreferencesStore((s) => s.enableMinimalCards);

  // Simple intersection observer for lazy loading images
  const { targetRef, isIntersecting } = useIntersectionObserver({
    rootMargin: "300px",
  });

  // Show skeleton if forced or if media hasn't loaded yet (empty title/poster)
  const shouldShowSkeleton = forceSkeleton || (!media.title && !media.poster);

  if (shouldShowSkeleton) {
    return (
      <div ref={targetRef as React.RefObject<HTMLDivElement>}>
        <MediaCardSkeleton />
      </div>
    );
  }

  if (isReleased() && media.year) {
    dotListContent.push(media.year.toFixed());
  }

  if (!isReleased()) {
    dotListContent.push(t("media.unreleased"));
  }

  return (
    <div ref={targetRef as React.RefObject<HTMLDivElement>}>
      <Flare.Base
        className={`group -m-[0.705em] rounded-xl bg-background-main transition-colors duration-300 focus:relative focus:z-10 ${
          canLink ? "hover:bg-mediaCard-hoverBackground tabbable" : ""
        } ${closable ? "jiggle" : ""}`}
        tabIndex={canLink ? 0 : -1}
        onKeyDown={(e) => {
          // Buttons inside the card keep their own Enter.
          if (e.target !== e.currentTarget) return;
          if (e.key !== "Enter" || e.repeat) return;
          e.preventDefault();
          e.currentTarget.click();
        }}
      >
        <Flare.Light
          flareSize={300}
          cssColorVar="--colors-mediaCard-hoverAccent"
          backgroundClass="bg-mediaCard-hoverBackground duration-100"
          className={classNames({
            "rounded-xl bg-background-main group-hover:opacity-100": canLink,
          })}
        />
        <Flare.Child
          className={`pointer-events-auto relative mb-2 p-[0.4em] transition-transform duration-300 ${
            canLink ? "group-hover:scale-95" : "opacity-60"
          }`}
        >
          <div
            className={classNames(
              "relative pb-[150%] w-full overflow-hidden rounded-xl bg-mediaCard-hoverBackground bg-cover bg-center transition-[border-radius] duration-300",
              {
                "group-hover:rounded-lg": canLink,
              },
              enableMinimalCards ? "" : "mb-4",
            )}
            style={{
              backgroundImage: isIntersecting
                ? media.poster
                  ? `url(${media.poster})`
                  : "url(/placeholder.png)"
                : "",
            }}
          >
            {series ? (
              <div
                className={[
                  "absolute right-2 top-2 rounded-md bg-mediaCard-badge px-2 py-1 transition-colors",
                ].join(" ")}
              >
                <p
                  className={[
                    "text-center text-xs font-bold text-mediaCard-badgeText transition-colors",
                    closable ? "" : "group-hover:text-white",
                  ].join(" ")}
                >
                  {t("media.episodeDisplay", {
                    season: series.season || 1,
                    episode: series.episode,
                  })}
                </p>
              </div>
            ) : null}

            {percentage !== undefined ? (
              <>
                <div
                  className={`absolute inset-x-0 -bottom-px pb-1 h-12 bg-gradient-to-t from-mediaCard-shadow to-transparent transition-colors ${
                    canLink ? "group-hover:from-mediaCard-hoverShadow" : ""
                  }`}
                />
                <div
                  className={`absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-mediaCard-shadow to-transparent transition-colors ${
                    canLink ? "group-hover:from-mediaCard-hoverShadow" : ""
                  }`}
                />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <div className="relative h-1 overflow-hidden rounded-full bg-mediaCard-barColor">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-mediaCard-barFillColor"
                      style={{
                        width: percentageString,
                      }}
                    />
                  </div>
                </div>
              </>
            ) : null}

            {!closable && (
              <div
                className="absolute bookmark-button p-2"
                onClick={(e) => e.preventDefault()}
              >
                <MediaBookmarkButton media={media} focusable={false} />
              </div>
            )}

            {searchQuery.length > 0 && !closable ? (
              <div className="absolute p-2" onClick={(e) => e.preventDefault()}>
                <MediaBookmarkButton media={media} focusable={false} />
              </div>
            ) : null}

            <div
              className={`absolute inset-0 flex items-center justify-center bg-mediaCard-badge bg-opacity-80 transition-opacity duration-500 ${
                closable ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <IconPatch
                clickable
                className="text-2xl text-mediaCard-badgeText transition-transform hover:scale-110 duration-500"
                onClick={closable ? () => onClose?.() : undefined}
                icon={Icons.X}
              />
            </div>
          </div>

          {!enableMinimalCards && (
            <>
              <h1 className="mb-1 line-clamp-3 max-h-[4.5rem] text-ellipsis break-words font-bold text-white">
                <span>{media.title}</span>
              </h1>
              <div className="media-info-container justify-content-center flex flex-wrap">
                <DotList className="text-xs" content={dotListContent} />
              </div>

              {!closable && (
                <div className="absolute bottom-0 translate-y-1 right-1">
                  <button
                    className="media-more-button p-2"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onShowDetails?.(media);
                    }}
                  >
                    <Icon
                      className="text-xs font-semibold text-type-secondary"
                      icon={Icons.ELLIPSIS}
                    />
                  </button>
                </div>
              )}
              {editable && closable && (
                <div className="absolute bottom-0 translate-y-1 right-1">
                  <button
                    className="media-more-button p-2"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEdit?.(e);
                    }}
                  >
                    <Icon
                      className="text-xs font-semibold text-type-secondary"
                      icon={Icons.EDIT}
                    />
                  </button>
                </div>
              )}
            </>
          )}
        </Flare.Child>
      </Flare.Base>
    </div>
  );
}

export function MediaCard(props: MediaCardProps) {
  const { media, onShowDetails, forceSkeleton } = props;
  const { showModal } = useOverlayStack();
  const { t } = useTranslation();
  const enableDetailsModal = usePreferencesStore(
    (state) => state.enableDetailsModal,
  );

  const isReleased = useCallback(
    () => checkReleased(props.media),
    [props.media],
  );

  const canLink = props.linkable && !props.closable && isReleased();

  let link = canLink
    ? `/media/${encodeURIComponent(mediaItemToId(props.media))}`
    : "#";
  if (canLink && props.series) {
    if (props.series.season === 0 && !props.series.episodeId) {
      link += `/${encodeURIComponent(props.series.seasonId)}`;
    } else {
      link += `/${encodeURIComponent(
        props.series.seasonId,
      )}/${encodeURIComponent(props.series.episodeId)}`;
    }
  }

  const handleShowDetails = useCallback(async () => {
    if (onShowDetails) {
      onShowDetails(media);
      return;
    }

    // Show modal with data through overlayStack
    showModal("details", {
      id: Number(media.id),
      type: media.type === "movie" ? "movie" : "show",
    });
  }, [media, showModal, onShowDetails]);

  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const modifyBookmarks = useBookmarkStore((s) => s.modifyBookmarks);
  const addBookmarkWithGroups = useBookmarkStore(
    (s) => s.addBookmarkWithGroups,
  );

  const isBookmarked = !!bookmarks[media.id];
  const currentGroups = bookmarks[media.id]?.group || [];

  const allGroups = useMemo(() => {
    const groupSet = new Set<string>();
    Object.values(bookmarks).forEach((bookmark) => {
      if (bookmark.group) {
        bookmark.group.forEach((group) => groupSet.add(group));
      }
    });
    return Array.from(groupSet);
  }, [bookmarks]);

  const meta: PlayerMeta | undefined = useMemo(() => {
    return media.year !== undefined
      ? {
          type: media.type,
          title: media.title,
          tmdbId: media.id,
          releaseYear: media.year,
          poster: media.poster,
        }
      : undefined;
  }, [media]);

  const toggleGroup = (groupName: string) => {
    let newGroups = [...currentGroups];
    if (newGroups.includes(groupName)) {
      newGroups = newGroups.filter((g) => g !== groupName);
    } else {
      newGroups.push(groupName);
    }

    if (isBookmarked) {
      modifyBookmarks([media.id], { groups: newGroups });
    } else if (meta) {
      addBookmarkWithGroups(meta, newGroups);
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || allGroups.length >= 30) return;

    const newGroupString = createGroupString("BOOKMARK", newFolderName.trim());
    toggleGroup(newGroupString);
    setIsCreatingFolder(false);
    setNewFolderName("");
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (enableDetailsModal && canLink) {
      e.preventDefault();
      handleShowDetails();
    }
  };

  const handleCardContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCreatingFolder(false);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleEditClick = (e?: React.MouseEvent) => {
    if (e) handleCardContextMenu(e);
  };

  const content = (
    <MediaCardContent
      {...props}
      onEdit={props.onEdit ? handleEditClick : undefined}
      onShowDetails={handleShowDetails}
      forceSkeleton={forceSkeleton}
    />
  );

  const contextMenuEl = contextMenuPos && (
    <ContextMenu
      x={contextMenuPos.x}
      y={contextMenuPos.y}
      onClose={() => setContextMenuPos(null)}
    >
      <div className="px-3 py-1 mb-1 text-xs text-white/50 font-bold uppercase tracking-wider">
        {media.title || "Media"}
      </div>
      <ContextMenuDivider />
      <ContextMenuItem onClick={handleShowDetails}>
        <Icon icon={Icons.CIRCLE_EXCLAMATION} className="text-lg w-5" />
        <span className="flex-1">{t("bookmarks.folders.moreInfo")}</span>
      </ContextMenuItem>
      {props.onEdit && (
        <ContextMenuItem
          onClick={() => {
            setContextMenuPos(null);
            props.onEdit?.();
          }}
        >
          <Icon icon={Icons.EDIT} className="text-lg w-5" />
          <span className="flex-1">{t("bookmarks.folders.editDetails")}</span>
        </ContextMenuItem>
      )}
      <ContextMenuDivider />

      <div className="px-3 py-2 text-xs text-white/50 font-bold uppercase tracking-wider flex justify-between items-center">
        <span>{t("bookmarks.folders.title")}</span>
        <span
          className={allGroups.length >= 30 ? "text-semantic-rose-c100" : ""}
        >
          {allGroups.length} / 30
        </span>
      </div>

      {allGroups.length === 0 && !isCreatingFolder && (
        <div className="px-4 py-2 text-sm text-white/30 italic">
          {t("bookmarks.folders.empty")}
        </div>
      )}

      {allGroups.map((group: string) => {
        const { name } = parseGroupString(group);
        const isInGroup = currentGroups.includes(group);
        return (
          <ContextMenuItem key={group} onClick={() => toggleGroup(group)}>
            <Icon
              icon={isInGroup ? Icons.CHECKMARK : Icons.BOOKMARK}
              className={classNames(
                "text-lg w-5",
                isInGroup ? "text-type-link" : "",
              )}
            />
            <span
              className={classNames(
                "flex-1 truncate",
                isInGroup ? "text-type-link font-medium" : "",
              )}
            >
              {name}
            </span>
          </ContextMenuItem>
        );
      })}

      {!isCreatingFolder ? (
        <ContextMenuItem
          onClick={() => setIsCreatingFolder(true)}
          className="mt-1"
          disabled={allGroups.length >= 30}
        >
          <Icon icon={Icons.PLUS} className="text-lg w-5" />
          <span className="flex-1">{t("bookmarks.folders.createFolder")}</span>
        </ContextMenuItem>
      ) : (
        <div className="px-3 py-2 mt-1 bg-white/5 rounded mx-1">
          <form
            onSubmit={handleCreateFolder}
            className="flex gap-2 items-center"
          >
            <input
              autoFocus
              type="text"
              placeholder={t("bookmarks.folders.folderNamePlaceholder")}
              className="w-full bg-transparent outline-none text-sm text-white placeholder-white/30"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.stopPropagation()}
            />
            <button
              type="submit"
              className="text-type-link hover:text-white transition-colors"
              disabled={!newFolderName.trim()}
            >
              <Icon icon={Icons.CHECKMARK} />
            </button>
          </form>
        </div>
      )}
    </ContextMenu>
  );

  if (!canLink) {
    return (
      <span
        data-nav-grid="1"
        className="relative block"
        onClick={(e) => {
          if (e.defaultPrevented) {
            e.preventDefault();
          }
        }}
        onContextMenu={handleCardContextMenu}
      >
        {content}
        {contextMenuEl}
      </span>
    );
  }

  return (
    <Link
      to={link}
      data-nav-grid="1"
      tabIndex={-1}
      className={classNames(
        "tabbable relative block",
        props.closable ? "hover:cursor-default" : "",
      )}
      onClick={handleCardClick}
      onContextMenu={handleCardContextMenu}
    >
      {content}
      {contextMenuEl}
    </Link>
  );
}
