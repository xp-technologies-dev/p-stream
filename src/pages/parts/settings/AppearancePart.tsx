import classNames from "classnames";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { Toggle } from "@/components/buttons/Toggle";
import { SortableList } from "@/components/form/SortableList";
import { Icon, Icons } from "@/components/Icon";
import { CustomThemeModal } from "@/components/overlays/CustomThemeModal";
import { EditGroupOrderModal } from "@/components/overlays/EditGroupOrderModal";
import { useModal } from "@/components/overlays/Modal";
import { Heading1 } from "@/components/utils/Text";
import { useBackendUrl } from "@/hooks/auth/useBackendUrl";
import { useAuthStore } from "@/stores/auth";
import { useBookmarkStore } from "@/stores/bookmarks";
import { useGroupOrderStore } from "@/stores/groupOrder";
import { SavedCustomTheme } from "@/stores/theme";

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: Icons;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Icon icon={icon} className="text-base text-type-secondary" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-type-secondary">
          {title}
        </h3>
      </div>
      <div className="rounded-xl bg-dropdown-background/30 ring-1 ring-white/5 divide-y divide-white/5">
        {children}
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  enabled,
  onChange,
  disabled,
  notice,
  indent,
}: {
  title: string;
  description?: ReactNode;
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  notice?: ReactNode;
  indent?: boolean;
}) {
  return (
    <div
      onClick={() => !disabled && onChange(!enabled)}
      className={classNames(
        "px-4 py-3 select-none flex items-start gap-4 transition-colors",
        indent && "pl-8",
        disabled
          ? "cursor-not-allowed opacity-50 pointer-events-none"
          : "cursor-pointer hover:bg-white/[0.03]",
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold leading-snug">{title}</p>
        {description ? (
          <p className="text-sm text-type-secondary mt-1 leading-snug">
            {description}
          </p>
        ) : null}
        {notice ? (
          <div className="mt-1.5 flex items-start gap-2 text-xs text-type-secondary">
            <Icon icon={Icons.CIRCLE_EXCLAMATION} className="mt-0.5 shrink-0" />
            <span>{notice}</span>
          </div>
        ) : null}
      </div>
      <div className="shrink-0 pt-0.5">
        <Toggle enabled={enabled} />
      </div>
    </div>
  );
}

const availableThemes = [
  {
    id: "default",
    selector: "theme-default",
    key: "settings.appearance.themes.default",
  },
  {
    id: "classic",
    selector: "theme-classic",
    key: "settings.appearance.themes.classic",
  },
  {
    id: "blue",
    selector: "theme-blue",
    key: "settings.appearance.themes.blue",
  },
  {
    id: "teal",
    selector: "theme-teal",
    key: "settings.appearance.themes.teal",
  },
  {
    id: "red",
    selector: "theme-red",
    key: "settings.appearance.themes.red",
  },
  {
    id: "gray",
    selector: "theme-gray",
    key: "settings.appearance.themes.gray",
  },
  {
    id: "green",
    selector: "theme-green",
    key: "settings.appearance.themes.green",
  },
  {
    id: "forest",
    selector: "theme-forest",
    key: "settings.appearance.themes.forest",
  },
  {
    id: "autumn",
    selector: "theme-autumn",
    key: "settings.appearance.themes.autumn",
  },
  {
    id: "frost",
    selector: "theme-frost",
    key: "settings.appearance.themes.frost",
  },
  {
    id: "mocha",
    selector: "theme-mocha",
    key: "settings.appearance.themes.mocha",
  },
  {
    id: "pink",
    selector: "theme-pink",
    key: "settings.appearance.themes.pink",
  },
  {
    id: "noir",
    selector: "theme-noir",
    key: "settings.appearance.themes.noir",
  },
  {
    id: "ember",
    selector: "theme-ember",
    key: "settings.appearance.themes.ember",
  },
  {
    id: "acid",
    selector: "theme-acid",
    key: "settings.appearance.themes.acid",
  },
  {
    id: "spark",
    selector: "theme-spark",
    key: "settings.appearance.themes.spark",
  },
  {
    id: "cobalt",
    selector: "theme-cobalt",
    key: "settings.appearance.themes.cobalt",
  },
  {
    id: "grape",
    selector: "theme-grape",
    key: "settings.appearance.themes.grape",
  },
  {
    id: "spiderman",
    selector: "theme-spiderman",
    key: "settings.appearance.themes.spiderman",
  },
  {
    id: "wolverine",
    selector: "theme-wolverine",
    key: "settings.appearance.themes.wolverine",
  },
  {
    id: "hulk",
    selector: "theme-hulk",
    key: "settings.appearance.themes.hulk",
  },
  {
    id: "popsicle",
    selector: "theme-popsicle",
    key: "settings.appearance.themes.popsicle",
  },
  {
    id: "christmas",
    selector: "theme-christmas",
    key: "settings.appearance.themes.christmas",
  },
];

function ThemePreview(props: {
  selector?: string;
  active?: boolean;
  inUse?: boolean;
  name: string;
  onClick?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      data-nav-grid="1"
      className={classNames(props.selector, "cursor-pointer group tabbable")}
      onClick={props.onClick}
    >
      {/* Little card thing */}
      <div
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.repeat) return;
          e.preventDefault();
          e.currentTarget.click();
        }}
        className={classNames(
          "tabbable scroll-mt-32 w-full h-32 relative rounded-lg border bg-gradient-to-br from-themePreview-primary/20 to-themePreview-secondary/10 bg-clip-content transition-colors duration-150",
          props.active
            ? "border-themePreview-primary"
            : "border-transparent group-hover:border-white/20",
        )}
      >
        {/* Dots */}
        <div className="absolute top-2 left-2">
          <div className="h-5 w-5 bg-themePreview-primary rounded-full" />
          <div className="h-5 w-5 bg-themePreview-secondary rounded-full -mt-2" />
        </div>
        {/* Active check */}
        <Icon
          icon={Icons.CHECKMARK}
          className={classNames(
            "absolute top-3 right-3 text-xs text-white transition-opacity duration-150",
            props.active ? "opacity-100" : "opacity-0",
          )}
        />
        {/* Mini movie-web. So Kawaiiiii! */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3/5 h-4/5 rounded-t-lg -mb-px bg-background-main overflow-hidden">
          <div className="relative w-full h-full">
            {/* Background color */}
            <div className="bg-themePreview-primary/50 w-[130%] h-10 absolute left-1/2 -top-5 blur-xl transform -translate-x-1/2 rounded-[100%]" />
            {/* Navbar */}
            <div className="p-2 flex justify-between items-center">
              <div className="flex space-x-1">
                <div className="bg-themePreview-ghost bg-opacity-10 w-4 h-2 rounded-full" />
                <div className="bg-themePreview-ghost bg-opacity-10 w-2 h-2 rounded-full" />
                <div className="bg-themePreview-ghost bg-opacity-10 w-2 h-2 rounded-full" />
              </div>
              <div className="bg-themePreview-ghost bg-opacity-10 w-2 h-2 rounded-full" />
            </div>
            {/* Hero */}
            <div className="mt-1 flex items-center flex-col gap-1">
              {/* Title and subtitle */}
              <div className="bg-themePreview-ghost bg-opacity-20 w-8 h-0.5 rounded-full" />
              <div className="bg-themePreview-ghost bg-opacity-20 w-6 h-0.5 rounded-full" />
              {/* Search bar */}
              <div className="bg-themePreview-ghost bg-opacity-10 w-16 h-2 mt-1 rounded-full" />
            </div>
            {/* Media grid */}
            <div className="mt-5 px-3">
              {/* Title */}
              <div className="flex gap-1 items-center">
                <div className="bg-themePreview-ghost bg-opacity-20 w-2 h-2 rounded-full" />
                <div className="bg-themePreview-ghost bg-opacity-20 w-8 h-0.5 rounded-full" />
              </div>
              {/* Blocks */}
              <div className="flex w-full gap-1 mt-1">
                <div className="bg-themePreview-ghost bg-opacity-10 w-full h-20 rounded" />
                <div className="bg-themePreview-ghost bg-opacity-10 w-full h-20 rounded" />
                <div className="bg-themePreview-ghost bg-opacity-10 w-full h-20 rounded" />
                <div className="bg-themePreview-ghost bg-opacity-10 w-full h-20 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 flex justify-between items-center">
        <span className="font-medium text-white">{props.name}</span>
        <div className="flex gap-2">
          {props.onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                props.onEdit?.();
              }}
              className="text-white/50 hover:text-white/90 transition-colors"
            >
              <Icon icon={Icons.EDIT} />
            </button>
          )}
          {props.onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                props.onDelete?.();
              }}
              className="text-white/50 hover:text-white/90 transition-colors"
            >
              <Icon icon={Icons.X} />
            </button>
          )}
        </div>
        <span
          className={classNames(
            "inline-block px-3 py-1 leading-tight text-sm transition-opacity duration-150 rounded-full bg-pill-activeBackground text-white/85",
            props.inUse ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          {t("settings.appearance.activeTheme")}
        </span>
      </div>
    </div>
  );
}

export function AppearancePart(props: {
  active: string;
  inUse: string;
  setTheme: (theme: string) => void;

  enableDiscover: boolean;
  setEnableDiscover: (v: boolean) => void;

  enableFeatured: boolean;
  setEnableFeatured: (v: boolean) => void;

  enableDetailsModal: boolean;
  setEnableDetailsModal: (v: boolean) => void;

  enableImageLogos: boolean;
  setEnableImageLogos: (v: boolean) => void;

  enablePauseOverlay: boolean;
  setEnablePauseOverlay: (v: boolean) => void;

  enableCarouselView: boolean;
  setEnableCarouselView: (v: boolean) => void;

  enableMinimalCards: boolean;
  setEnableMinimalCards: (v: boolean) => void;

  forceCompactEpisodeView: boolean;
  setForceCompactEpisodeView: (v: boolean) => void;

  homeSectionOrder: string[];
  setHomeSectionOrder: (v: string[]) => void;

  enableLowPerformanceMode: boolean;

  savedCustomThemes: SavedCustomTheme[];
  setSavedCustomThemes: (v: SavedCustomTheme[]) => void;
  hiddenDefaultThemes: string[];
  setHiddenDefaultThemes: (v: string[]) => void;
}) {
  const { t } = useTranslation();

  const customThemeModal = useModal("create-custom-theme");
  const [editingTheme, setEditingTheme] = useState<any>(null);

  const carouselRef = useRef<HTMLDivElement>(null);
  const activeThemeRef = useRef<HTMLDivElement>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);

  // Group order modal
  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const setGroupOrder = useGroupOrderStore((s) => s.setGroupOrder);
  const editGroupOrderModal = useModal("bookmark-edit-order-settings");
  const backendUrl = useBackendUrl();
  const account = useAuthStore((s) => s.account);

  // Check if there are groups
  const hasGroups = useMemo(() => {
    const groups = new Set<string>();

    Object.values(bookmarks).forEach((bookmark) => {
      if (Array.isArray(bookmark.group)) {
        bookmark.group.forEach((group) => groups.add(group));
      }
    });

    groups.add("bookmarks");

    return groups.size > 1;
  }, [bookmarks]);

  const {
    enableLowPerformanceMode,
    setEnableDiscover,
    setEnableFeatured,
    setEnableDetailsModal,
    setEnableImageLogos,
    setEnablePauseOverlay,
    setForceCompactEpisodeView,
  } = props;

  // Apply low performance mode restrictions
  useEffect(() => {
    if (enableLowPerformanceMode) {
      setEnableDiscover(false);
      setEnableFeatured(false);
      setEnableDetailsModal(false);
      setEnableImageLogos(false);
      setEnablePauseOverlay(false);
      setForceCompactEpisodeView(true);
    }
  }, [
    enableLowPerformanceMode,
    setEnableDiscover,
    setEnableFeatured,
    setEnableDetailsModal,
    setEnableImageLogos,
    setEnablePauseOverlay,
    setForceCompactEpisodeView,
  ]);

  const checkScrollPosition = () => {
    const container = carouselRef.current;
    if (!container) return;

    setIsAtTop(container.scrollTop <= 0);
    setIsAtBottom(
      Math.abs(
        container.scrollHeight - container.scrollTop - container.clientHeight,
      ) < 2,
    );
  };

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    container.addEventListener("scroll", checkScrollPosition);
    checkScrollPosition(); // Check initial position

    return () => container.removeEventListener("scroll", checkScrollPosition);
  }, []);

  useEffect(() => {
    if (activeThemeRef.current && carouselRef.current) {
      const element = activeThemeRef.current;
      const container = carouselRef.current;

      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Center the element in the container
      container.scrollTop =
        elementRect.top +
        container.scrollTop -
        containerRect.top -
        (containerRect.height - elementRect.height) / 2;

      checkScrollPosition(); // Update masks after scrolling
    }
  }, [props.active]);

  const handleEditGroupOrder = () => {
    editGroupOrderModal.show();
  };

  const handleCancelGroupOrder = () => {
    editGroupOrderModal.hide();
  };

  const handleSaveGroupOrder = (newOrder: string[]) => {
    setGroupOrder(newOrder);
    editGroupOrderModal.hide();

    // Save to backend
    if (backendUrl && account) {
      useGroupOrderStore
        .getState()
        .saveGroupOrderToBackend(backendUrl, account);
    }
  };

  return (
    <div className="space-y-12">
      <Heading1 border>{t("settings.appearance.title")}</Heading1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* First Column - Preferences */}
        <div className="space-y-8">
          <Section title="Home Page" icon={Icons.LAYOUT}>
            <ToggleRow
              title={t("settings.appearance.options.discoverLabel")}
              description={t("settings.appearance.options.discoverDescription")}
              enabled={props.enableDiscover}
              onChange={(v) => {
                props.setEnableDiscover(v);
                if (!v) props.setEnableFeatured(false);
              }}
              disabled={props.enableLowPerformanceMode}
            />
            {props.enableDiscover && !props.enableLowPerformanceMode && (
              <ToggleRow
                indent
                title={t("settings.appearance.options.featuredLabel")}
                description={t(
                  "settings.appearance.options.featuredDescription",
                )}
                enabled={props.enableFeatured}
                onChange={(v) => props.setEnableFeatured(v)}
              />
            )}
            <ToggleRow
              title={t("settings.appearance.options.modalLabel")}
              description={t("settings.appearance.options.modalDescription")}
              enabled={props.enableDetailsModal}
              onChange={(v) => props.setEnableDetailsModal(v)}
              disabled={props.enableLowPerformanceMode}
            />
            <ToggleRow
              title={t("settings.appearance.options.logosLabel")}
              description={t("settings.appearance.options.logosDescription")}
              notice={t("settings.appearance.options.logosNotice")}
              enabled={props.enableImageLogos}
              onChange={(v) => props.setEnableImageLogos(v)}
              disabled={props.enableLowPerformanceMode}
            />
            <ToggleRow
              title={t("settings.appearance.options.carouselViewLabel")}
              description={t(
                "settings.appearance.options.carouselViewDescription",
              )}
              enabled={props.enableCarouselView}
              onChange={(v) => props.setEnableCarouselView(v)}
            />
            <ToggleRow
              title={t("settings.appearance.options.minimalCardsLabel")}
              description={t(
                "settings.appearance.options.minimalCardsDescription",
              )}
              enabled={props.enableMinimalCards}
              onChange={(v) => props.setEnableMinimalCards(v)}
            />
            <div className="px-4 py-3 space-y-2">
              <p className="text-white font-semibold leading-snug">
                {t("settings.appearance.options.homeSectionOrder")}
              </p>
              <p className="text-sm text-type-secondary leading-snug">
                {t("settings.appearance.options.homeSectionOrderDescription")}
              </p>
              <div className="pt-2">
                <SortableList
                  items={props.homeSectionOrder.map((section) => ({
                    id: section,
                    name: t(`settings.appearance.sections.${section}`),
                  }))}
                  setItems={(items) => {
                    const newOrder = items.map((item) => item.id);
                    props.setHomeSectionOrder(newOrder);
                  }}
                />
              </div>
              {hasGroups && (
                <div className="pt-2">
                  <Button theme="secondary" onClick={handleEditGroupOrder}>
                    {t("settings.appearance.options.homeSectionOrderGroups")}
                  </Button>
                </div>
              )}
            </div>
          </Section>

          <Section title="Player UI" icon={Icons.CLAPPER_BOARD}>
            <ToggleRow
              title={t("settings.appearance.options.pauseOverlayLabel")}
              enabled={props.enablePauseOverlay}
              onChange={(v) => props.setEnablePauseOverlay(v)}
              disabled={props.enableLowPerformanceMode}
            />
            <ToggleRow
              title={t(
                "settings.appearance.options.forceCompactEpisodeViewLabel",
              )}
              description={t(
                "settings.appearance.options.forceCompactEpisodeViewDescription",
              )}
              enabled={props.forceCompactEpisodeView}
              onChange={(v) => props.setForceCompactEpisodeView(v)}
              disabled={props.enableLowPerformanceMode}
            />
          </Section>
        </div>

        {/* Second Column - Themes */}
        <div className="space-y-8">
          <div
            ref={carouselRef}
            className={classNames(
              "grid grid-cols-2 gap-4 max-w-[600px] max-h-[36rem] md:max-h-[64rem] overflow-y-auto",
              "vertical-carousel-container",
              {
                "hide-top-gradient": isAtTop,
                "hide-bottom-gradient": isAtBottom,
              },
            )}
          >
            {availableThemes
              .filter((v) => !props.hiddenDefaultThemes.includes(v.id))
              .map((v) => (
                <div
                  key={v.id}
                  ref={props.active === v.id ? activeThemeRef : null}
                >
                  <ThemePreview
                    selector={v.selector}
                    active={props.active === v.id}
                    inUse={props.inUse === v.id}
                    name={t(v.key)}
                    onClick={() => props.setTheme(v.id)}
                    onDelete={
                      v.id !== "default"
                        ? () => {
                            props.setHiddenDefaultThemes([
                              ...props.hiddenDefaultThemes,
                              v.id,
                            ]);
                            if (props.active === v.id) {
                              props.setTheme("default");
                            }
                          }
                        : undefined
                    }
                  />
                </div>
              ))}
            {props.savedCustomThemes.map((v) => (
              <div
                key={v.id}
                ref={props.active === v.id ? activeThemeRef : null}
              >
                <div className={`theme-${v.id}`}>
                  {/* Need to ensure dynamic class injected from ThemeStore works here too */}
                  <ThemePreview
                    selector={`theme-${v.id}`}
                    active={props.active === v.id}
                    inUse={props.inUse === v.id}
                    name={v.name}
                    onClick={() => props.setTheme(v.id)}
                    onEdit={() => {
                      setEditingTheme(v);
                      customThemeModal.show();
                    }}
                    onDelete={() => {
                      props.setSavedCustomThemes(
                        props.savedCustomThemes.filter(
                          (themeItem) => themeItem.id !== v.id,
                        ),
                      );
                      if (props.active === v.id) {
                        props.setTheme("default");
                      }
                    }}
                  />
                </div>
              </div>
            ))}

            <div
              className={classNames(
                "group flex flex-col justify-center items-center h-32 relative rounded-lg border border-dashed transition-colors duration-150 p-4 text-center",
                props.savedCustomThemes.length >= 30
                  ? "border-opacity-10 border-white/20 opacity-50 cursor-not-allowed"
                  : "cursor-pointer border-white/20 hover:border-white/50",
              )}
              onClick={() => {
                if (props.savedCustomThemes.length >= 30) return;
                setEditingTheme(null);
                customThemeModal.show();
              }}
            >
              <Icon
                icon={Icons.PLUS}
                className={classNames(
                  "text-4xl transition-colors",
                  props.savedCustomThemes.length >= 30
                    ? "text-white/20"
                    : "text-white/50 group-hover:text-white",
                )}
              />
              <div className="flex flex-col items-center mt-2">
                <span
                  className={classNames(
                    "font-medium transition-colors text-sm sm:text-base leading-tight",
                    props.savedCustomThemes.length >= 30
                      ? "text-white/50"
                      : "text-white/70 group-hover:text-white",
                  )}
                >
                  {t(
                    "settings.appearance.themeOptions.createCustom",
                    "Create Custom Theme",
                  )}
                </span>
                {props.savedCustomThemes.length >= 30 && (
                  <span className="text-xs text-semantic-rose-c100 font-bold mt-1">
                    {t(
                      "settings.appearance.themeOptions.themeLimitReached",
                      "Theme limit reached (30 max)",
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              theme="secondary"
              onClick={() => {
                props.setHiddenDefaultThemes([]);
                props.setSavedCustomThemes([]);
                props.setTheme("default");
              }}
              className="flex items-center gap-2"
            >
              <Icon icon={Icons.ARROW_LEFT} />
              {t(
                "settings.appearance.themeOptions.resetToDefault",
                "Reset to Default",
              )}
            </Button>
          </div>
        </div>
      </div>

      <EditGroupOrderModal
        id={editGroupOrderModal.id}
        isShown={editGroupOrderModal.isShown}
        onCancel={handleCancelGroupOrder}
        onSave={handleSaveGroupOrder}
      />

      <CustomThemeModal
        id={customThemeModal.id}
        isShown={customThemeModal.isShown}
        onHide={customThemeModal.hide}
        themeToEdit={editingTheme}
        onSave={(newTheme) => {
          const existing = props.savedCustomThemes.findIndex(
            (themeItem) => themeItem.id === newTheme.id,
          );
          const copy = [...props.savedCustomThemes];
          if (existing !== -1) copy[existing] = newTheme;
          else copy.push(newTheme);
          props.setSavedCustomThemes(copy);
          props.setTheme(newTheme.id);
        }}
      />
    </div>
  );
}
