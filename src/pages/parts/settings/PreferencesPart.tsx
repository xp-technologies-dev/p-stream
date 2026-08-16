import classNames from "classnames";
import { ReactNode, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { getAllProviders, getProviders } from "@/backend/providers/providers";
import { Button } from "@/components/buttons/Button";
import { Toggle } from "@/components/buttons/Toggle";
import { FlagIcon } from "@/components/FlagIcon";
import { Dropdown } from "@/components/form/Dropdown";
import { SortableList } from "@/components/form/SortableList";
import { Icon, Icons } from "@/components/Icon";
import { Heading1 } from "@/components/utils/Text";
import { appLanguageOptions } from "@/setup/i18n";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { usePreferencesStore } from "@/stores/preferences";
import { isAutoplayAllowed } from "@/utils/media/autoplay";
import { getLocaleInfo, sortLangCodes } from "@/utils/locale/language";

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
            <Icon
              icon={Icons.CIRCLE_EXCLAMATION}
              className="mt-0.5 shrink-0"
            />
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

export function PreferencesPart(props: {
  language: string;
  setLanguage: (l: string) => void;
  enableThumbnails: boolean;
  setEnableThumbnails: (v: boolean) => void;
  enableAutoplay: boolean;
  setEnableAutoplay: (v: boolean) => void;
  enableSkipCredits: boolean;
  setEnableSkipCredits: (v: boolean) => void;
  enableAutoSkipSegments: boolean;
  setEnableAutoSkipSegments: (v: boolean) => void;
  sourceOrder: string[];
  setSourceOrder: (v: string[]) => void;
  enableSourceOrder: boolean;
  setenableSourceOrder: (v: boolean) => void;
  enableLastSuccessfulSource: boolean;
  setEnableLastSuccessfulSource: (v: boolean) => void;
  enableLowPerformanceMode: boolean;
  setEnableLowPerformanceMode: (v: boolean) => void;
  enableHoldToBoost: boolean;
  setEnableHoldToBoost: (v: boolean) => void;
  manualSourceSelection: boolean;
  setManualSourceSelection: (v: boolean) => void;
  preferredMinimumResolution: "none" | "720" | "1080" | "4k";
  setPreferredMinimumResolution: (v: "none" | "720" | "1080" | "4k") => void;
  enableDoubleClickToSeek: boolean;
  setEnableDoubleClickToSeek: (v: boolean) => void;
  enableAutoResumeOnPlaybackError: boolean;
  setEnableAutoResumeOnPlaybackError: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { showModal } = useOverlayStack();
  const navigate = useNavigate();
  const [isSourceListExpanded, setIsSourceListExpanded] = useState(false);

  const enableGamepadControls = usePreferencesStore(
    (s) => s.enableGamepadControls,
  );
  const setEnableGamepadControls = usePreferencesStore(
    (s) => s.setEnableGamepadControls,
  );

  const spatialNavigation = usePreferencesStore((s) => s.spatialNavigation);
  const setSpatialNavigation = usePreferencesStore(
    (s) => s.setSpatialNavigation,
  );

  const enableAutoSubtitleSync = usePreferencesStore(
    (s) => s.enableAutoSubtitleSync,
  );
  const setEnableAutoSubtitleSync = usePreferencesStore(
    (s) => s.setEnableAutoSubtitleSync,
  );

  const sorted = sortLangCodes(
    appLanguageOptions.map((item) => item.code),
    props.language,
  );

  const allowAutoplay = isAutoplayAllowed();

  const options = appLanguageOptions
    .sort((a, b) => sorted.indexOf(a.code) - sorted.indexOf(b.code))
    .map((opt) => ({
      id: opt.code,
      name: `${opt.name}${opt.nativeName ? ` — ${opt.nativeName}` : ""}`,
      leftIcon: <FlagIcon langCode={opt.code} />,
    }));

  const selected = options.find(
    (item) => item.id === getLocaleInfo(props.language)?.code,
  );

  const allSources = getAllProviders().listSources();

  const sourceItems = useMemo(() => {
    const currentDeviceSources = getProviders().listSources();
    return props.sourceOrder.map((id) => ({
      id,
      name: allSources.find((s) => s.id === id)?.name || id,
      disabled: !currentDeviceSources.find((s) => s.id === id),
    }));
  }, [props.sourceOrder, allSources]);

  const minimumResolutionOptions = useMemo(
    () => [
      {
        id: "none",
        name: t(
          "settings.preferences.preferredMinimumResolutionNone",
          "No minimum (first working source)",
        ),
      },
      {
        id: "720",
        name: t(
          "settings.preferences.preferredMinimumResolution720",
          "720p",
        ),
      },
      {
        id: "1080",
        name: t(
          "settings.preferences.preferredMinimumResolution1080",
          "1080p",
        ),
      },
      {
        id: "4k",
        name: t(
          "settings.preferences.preferredMinimumResolution4k",
          "4K",
        ),
      },
    ],
    [t],
  );

  const selectedMinimumResolution =
    minimumResolutionOptions.find(
      (item) => item.id === props.preferredMinimumResolution,
    ) ?? minimumResolutionOptions[0];

  return (
    <div className="space-y-10">
      <Heading1 border>{t("settings.preferences.title")}</Heading1>

      <Section title="Language" icon={Icons.TRANSLATE}>
        <div className="px-4 py-3">
          <p className="text-white font-semibold leading-snug">
            {t("settings.preferences.language")}
          </p>
          <p className="text-sm text-type-secondary mt-1 leading-snug max-w-[24rem]">
            {t("settings.preferences.languageDescription")}
          </p>
          <div className="mt-3 max-w-[24rem]">
            <Dropdown
              className="w-full"
              options={options}
              selectedItem={selected || options[0]}
              setSelectedItem={(opt) => props.setLanguage(opt.id)}
            />
          </div>
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <Section title="Playback" icon={Icons.PLAY}>
            <ToggleRow
              title={t("settings.preferences.autoplayLabel")}
              description={t("settings.preferences.autoplayDescription")}
              enabled={props.enableAutoplay && allowAutoplay}
              onChange={(v) => props.setEnableAutoplay(v)}
              disabled={!allowAutoplay || props.enableLowPerformanceMode}
            />
            {props.enableAutoplay &&
              allowAutoplay &&
              !props.enableLowPerformanceMode && (
                <>
                  <ToggleRow
                    indent
                    title={t("settings.preferences.skipCreditsLabel")}
                    description={t("settings.preferences.skipCreditsDescription")}
                    enabled={props.enableSkipCredits}
                    onChange={(v) => props.setEnableSkipCredits(v)}
                  />
                  <ToggleRow
                    indent
                    title={t("settings.preferences.autoSkipSegmentsLabel")}
                    description={t(
                      "settings.preferences.autoSkipSegmentsDescription",
                    )}
                    enabled={props.enableAutoSkipSegments}
                    onChange={(v) => props.setEnableAutoSkipSegments(v)}
                  />
                </>
              )}
            <ToggleRow
              title={t("settings.preferences.lowPerformanceModeLabel")}
              description={t(
                "settings.preferences.lowPerformanceModeDescription",
              )}
              enabled={props.enableLowPerformanceMode}
              onChange={(v) => props.setEnableLowPerformanceMode(v)}
            />
          </Section>

          <Section title="Player Controls" icon={Icons.TACHOMETER}>
            <ToggleRow
              title={t("settings.preferences.holdToBoostLabel")}
              description={t("settings.preferences.holdToBoostDescription")}
              enabled={props.enableHoldToBoost}
              onChange={(v) => props.setEnableHoldToBoost(v)}
            />
            <ToggleRow
              title={t("settings.preferences.doubleClickToSeekLabel")}
              description={t(
                "settings.preferences.doubleClickToSeekDescription",
              )}
              enabled={props.enableDoubleClickToSeek}
              onChange={(v) => props.setEnableDoubleClickToSeek(v)}
            />
            <ToggleRow
              title={t(
                "settings.preferences.spatialNavigationLabel",
                "Navigate with the arrow keys",
              )}
              description={t(
                "settings.preferences.spatialNavigationDescription",
                "Move focus between things on screen with the arrow keys instead of scrolling the page. Turns on by itself on a TV or when a controller is connected.",
              )}
              enabled={spatialNavigation === "on"}
              onChange={(v) => setSpatialNavigation(v ? "on" : "off")}
            />
            <ToggleRow
              title={t(
                "settings.preferences.enableGamepadControls",
                "Enable controller support",
              )}
              description={t(
                "settings.preferences.enableGamepadControlsDescription",
                "Not needed to use a controller — one is picked up as soon as you press a button. Turn this on to set your buttons up in advance.",
              )}
              enabled={enableGamepadControls}
              onChange={(v) => setEnableGamepadControls(v)}
            />
            <div className="px-4 py-3 space-y-2">
              <p className="text-white font-semibold leading-snug">
                {t("settings.preferences.keyboardShortcuts")}
              </p>
              <p className="text-sm text-type-secondary leading-snug">
                {t("settings.preferences.keyboardShortcutsDescription")}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  theme="secondary"
                  onClick={() => showModal("keyboard-commands-edit")}
                >
                  {t("settings.preferences.keyboardShortcutsLabel")}
                </Button>
                <Button
                  theme="secondary"
                  onClick={() => showModal("gamepad-controls-edit")}
                >
                  {t(
                    "settings.preferences.gamepadControlsLabel",
                    "Customize Controller Keybinds",
                  )}
                </Button>
              </div>
            </div>
          </Section>
        </div>

        <div id="source-order" className="space-y-8">
          <Section title="Sources" icon={Icons.WEB}>
            <ToggleRow
              title={t("settings.preferences.manualSourceLabel")}
              description={t("settings.preferences.manualSourceDescription")}
              enabled={props.manualSourceSelection}
              onChange={(v) => props.setManualSourceSelection(v)}
            />
            <div className="px-4 py-3">
              <p className="text-white font-semibold leading-snug">
                {t(
                  "settings.preferences.preferredMinimumResolutionLabel",
                  "Preferred minimum resolution",
                )}
              </p>
              <p className="text-sm text-type-secondary mt-1 leading-snug max-w-[28rem]">
                {t(
                  "settings.preferences.preferredMinimumResolutionDescription",
                  "When auto-selecting sources, keep checking working sources until this quality is met. If unavailable, the best working source is used.",
                )}
              </p>
              <div className="mt-3 max-w-[24rem]">
                <Dropdown
                  className="w-full"
                  options={minimumResolutionOptions}
                  selectedItem={selectedMinimumResolution}
                  setSelectedItem={(opt) =>
                    props.setPreferredMinimumResolution(
                      opt.id as "none" | "720" | "1080" | "4k",
                    )
                  }
                />
              </div>
            </div>
            <ToggleRow
              title={t("settings.preferences.autoResumeOnPlaybackErrorLabel")}
              description={t(
                "settings.preferences.autoResumeOnPlaybackErrorDescription",
              )}
              enabled={props.enableAutoResumeOnPlaybackError}
              onChange={(v) => props.setEnableAutoResumeOnPlaybackError(v)}
            />
            <ToggleRow
              title={t("settings.preferences.lastSuccessfulSourceEnableLabel")}
              description={t(
                "settings.preferences.lastSuccessfulSourceDescription",
              )}
              enabled={props.enableLastSuccessfulSource}
              onChange={(v) => props.setEnableLastSuccessfulSource(v)}
            />
            <ToggleRow
              title={t("settings.preferences.sourceOrderEnableLabel")}
              description={
                <Trans
                  i18nKey="settings.preferences.sourceOrderDescription"
                  components={{
                    bold: (
                      <span
                        className="text-type-link font-bold cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/onboarding/extension");
                        }}
                      />
                    ),
                  }}
                />
              }
              enabled={props.enableSourceOrder}
              onChange={(v) => props.setenableSourceOrder(v)}
            />
            {props.enableSourceOrder && (
              <div className="px-4 py-3 space-y-3">
                <div
                  className={classNames(
                    "overflow-hidden transition-all duration-300",
                    sourceItems.length > 10 && !isSourceListExpanded
                      ? "max-h-[400px]"
                      : "max-h-none",
                  )}
                >
                  <SortableList
                    items={sourceItems}
                    setItems={(items) =>
                      props.setSourceOrder(items.map((item) => item.id))
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {sourceItems.length > 10 && (
                    <Button
                      theme="secondary"
                      onClick={() =>
                        setIsSourceListExpanded(!isSourceListExpanded)
                      }
                    >
                      {isSourceListExpanded
                        ? t("settings.preferences.showLess")
                        : t("settings.preferences.showMore")}
                      <Icon
                        icon={
                          isSourceListExpanded
                            ? Icons.CHEVRON_UP
                            : Icons.CHEVRON_DOWN
                        }
                      />
                    </Button>
                  )}
                  <Button
                    theme="secondary"
                    onClick={() =>
                      props.setSourceOrder(allSources.map((s) => s.id))
                    }
                  >
                    {t("settings.reset")}
                  </Button>
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>

      <Section
        title={t("settings.preferences.experimentalSection")}
        icon={Icons.WAND}
      >
        <ToggleRow
          title={t("settings.preferences.autoSubtitleSyncLabel")}
          description={t("settings.preferences.autoSubtitleSyncDescription")}
          enabled={enableAutoSubtitleSync}
          onChange={(v) => setEnableAutoSubtitleSync(v)}
        />
      </Section>
    </div>
  );
}
