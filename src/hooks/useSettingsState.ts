import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { SubtitleStyling } from "@/stores/subtitles";
import { SavedCustomTheme, usePreviewThemeStore } from "@/stores/theme";

export function useDerived<T>(
  initial: T,
): [T, Dispatch<SetStateAction<T>>, () => void, boolean] {
  const [overwrite, setOverwrite] = useState<T | undefined>(undefined);
  useEffect(() => {
    setOverwrite(undefined);
  }, [initial]);
  const changed = useMemo(
    () =>
      JSON.stringify(overwrite) !== JSON.stringify(initial) &&
      overwrite !== undefined,
    [overwrite, initial],
  );
  const setter = useCallback<Dispatch<SetStateAction<T>>>(
    (inp) => {
      if (!(inp instanceof Function)) setOverwrite(inp);
      else setOverwrite((s) => inp(s !== undefined ? s : initial));
    },
    [initial, setOverwrite],
  );
  const data = overwrite === undefined ? initial : overwrite;

  const reset = useCallback(() => setOverwrite(undefined), [setOverwrite]);

  return [data, setter, reset, changed];
}

interface FieldHandle<T> {
  state: T;
  set: Dispatch<SetStateAction<T>>;
  changed: boolean;
}

function field<T>(
  key: string,
  [state, set, reset, changed]: ReturnType<typeof useDerived<T>>,
  registry: Record<string, FieldHandle<unknown>>,
  resets: (() => void)[],
): FieldHandle<T> {
  const handle = { state, set, changed };
  registry[key] = handle as FieldHandle<unknown>;
  resets.push(reset);
  return handle;
}

// Every setting that syncs 1:1 to the backend's SettingsInput/SettingsResponse
// is registered by name here as it's declared below (via field(key, ...)).
// backendKey only needs to be listed when it differs from the local key
// (theme/appLanguage are the legacy-named exceptions). Settings.tsx's
// dirty-check and PUT body are both generated from SETTINGS_FIELDS, so
// adding a new backend-synced setting is: declare it with useDerived +
// field(...) here, add it to SETTINGS_FIELDS, add the store field/setter,
// and add its UI control -- nothing else to remember.
export const SETTINGS_FIELDS = [
  { key: "theme", backendKey: "applicationTheme" },
  { key: "appLanguage", backendKey: "applicationLanguage" },
  { key: "proxyUrls", backendKey: "proxyUrls" },
  { key: "febboxKey", backendKey: "febboxKey" },
  { key: "debridToken", backendKey: "debridToken" },
  { key: "debridService", backendKey: "debridService" },
  { key: "tidbKey", backendKey: "tidbKey" },
  { key: "wyzieKey", backendKey: "wyzieKey" },
  { key: "enableThumbnails", backendKey: "enableThumbnails" },
  { key: "enableAutoplay", backendKey: "enableAutoplay" },
  { key: "enableSkipCredits", backendKey: "enableSkipCredits" },
  { key: "enableAutoSkipSegments", backendKey: "enableAutoSkipSegments" },
  { key: "enableDiscover", backendKey: "enableDiscover" },
  { key: "enableFeatured", backendKey: "enableFeatured" },
  { key: "enableDetailsModal", backendKey: "enableDetailsModal" },
  { key: "enableImageLogos", backendKey: "enableImageLogos" },
  { key: "sourceOrder", backendKey: "sourceOrder" },
  { key: "enableSourceOrder", backendKey: "enableSourceOrder" },
  { key: "lastSuccessfulSource", backendKey: "lastSuccessfulSource" },
  {
    key: "enableLastSuccessfulSource",
    backendKey: "enableLastSuccessfulSource",
  },
  { key: "proxyTmdb", backendKey: "proxyTmdb" },
  { key: "enableCarouselView", backendKey: "enableCarouselView" },
  { key: "enableMinimalCards", backendKey: "enableMinimalCards" },
  { key: "forceCompactEpisodeView", backendKey: "forceCompactEpisodeView" },
  { key: "enableLowPerformanceMode", backendKey: "enableLowPerformanceMode" },
  { key: "enableNativeSubtitles", backendKey: "enableNativeSubtitles" },
  { key: "enableHoldToBoost", backendKey: "enableHoldToBoost" },
  { key: "homeSectionOrder", backendKey: "homeSectionOrder" },
  { key: "manualSourceSelection", backendKey: "manualSourceSelection" },
  {
    key: "preferredMinimumResolution",
    backendKey: "preferredMinimumResolution",
  },
  { key: "enableDoubleClickToSeek", backendKey: "enableDoubleClickToSeek" },
  {
    key: "enableAutoResumeOnPlaybackError",
    backendKey: "enableAutoResumeOnPlaybackError",
  },
  { key: "enablePauseOverlay", backendKey: "enablePauseOverlay" },
  { key: "bookmarkRowsToShow", backendKey: "bookmarkRowsToShow" },
  { key: "watchingRowsToShow", backendKey: "watchingRowsToShow" },
  { key: "enableGamepadControls", backendKey: "enableGamepadControls" },
  { key: "gamepadMapping", backendKey: "gamepadMapping" },
  { key: "spatialNavigation", backendKey: "spatialNavigation" },
] as const satisfies { key: string; backendKey: string }[];

// Tracked here (for a UI control's dirty/reset behavior) but pushed to the
// backend through their own dedicated call elsewhere, not through
// Settings.tsx's main save button -- kept out of SETTINGS_FIELDS so the main
// save doesn't also send them.
export const SEPARATE_SYNC_FIELDS = ["embedOrder", "enableEmbedOrder"] as const;

type SimpleKey = (typeof SETTINGS_FIELDS)[number]["key"];
type SeparateKey = (typeof SEPARATE_SYNC_FIELDS)[number];

export interface UseSettingsStateInput {
  theme: string | null;
  appLanguage: string;
  subtitleStyling: SubtitleStyling;
  deviceName: string;
  nickname: string;
  proxyUrls: string[] | null;
  backendUrl: string | null;
  febboxKey: string | null;
  debridToken: string | null;
  debridService: string;
  tidbKey: string | null;
  wyzieKey: string | null;
  profile: { colorA: string; colorB: string; icon: string } | undefined;
  enableThumbnails: boolean;
  enableAutoplay: boolean;
  enableSkipCredits: boolean;
  enableAutoSkipSegments: boolean;
  enableDiscover: boolean;
  enableFeatured: boolean;
  enableDetailsModal: boolean;
  sourceOrder: string[];
  enableSourceOrder: boolean;
  lastSuccessfulSource: string | null;
  enableLastSuccessfulSource: boolean;
  embedOrder: string[];
  enableEmbedOrder: boolean;
  proxyTmdb: boolean;
  enableImageLogos: boolean;
  enableCarouselView: boolean;
  enableMinimalCards: boolean;
  forceCompactEpisodeView: boolean;
  enableLowPerformanceMode: boolean;
  enableNativeSubtitles: boolean;
  enableHoldToBoost: boolean;
  homeSectionOrder: string[];
  manualSourceSelection: boolean;
  preferredMinimumResolution: "none" | "720" | "1080" | "4k";
  enableDoubleClickToSeek: boolean;
  enableAutoResumeOnPlaybackError: boolean;
  enablePauseOverlay: boolean;
  customTheme: { primary: string; secondary: string; tertiary: string };
  savedCustomThemes: SavedCustomTheme[];
  hiddenDefaultThemes: string[];
  bookmarkRowsToShow: number;
  watchingRowsToShow: number;
  enableGamepadControls: boolean;
  gamepadMapping: Record<string, string>;
  spatialNavigation: "on" | "off";
}

type SimpleFieldHandles = {
  [K in SimpleKey | SeparateKey]: FieldHandle<
    UseSettingsStateInput[K & keyof UseSettingsStateInput]
  >;
};

export function useSettingsState(input: UseSettingsStateInput) {
  const registry: Record<string, FieldHandle<unknown>> = {};
  const resets: (() => void)[] = [];

  field("theme", useDerived(input.theme), registry, resets);
  field("appLanguage", useDerived(input.appLanguage), registry, resets);
  field("proxyUrls", useDerived(input.proxyUrls), registry, resets);
  field("febboxKey", useDerived(input.febboxKey), registry, resets);
  field("debridToken", useDerived(input.debridToken), registry, resets);
  field("debridService", useDerived(input.debridService), registry, resets);
  field("tidbKey", useDerived(input.tidbKey), registry, resets);
  field("wyzieKey", useDerived(input.wyzieKey), registry, resets);
  field("enableThumbnails", useDerived(input.enableThumbnails), registry, resets);
  field("enableAutoplay", useDerived(input.enableAutoplay), registry, resets);
  field("enableSkipCredits", useDerived(input.enableSkipCredits), registry, resets);
  field("enableAutoSkipSegments", useDerived(input.enableAutoSkipSegments), registry, resets);
  field("enableDiscover", useDerived(input.enableDiscover), registry, resets);
  field("enableFeatured", useDerived(input.enableFeatured), registry, resets);
  field("enableDetailsModal", useDerived(input.enableDetailsModal), registry, resets);
  field("enableImageLogos", useDerived(input.enableImageLogos), registry, resets);
  field("sourceOrder", useDerived(input.sourceOrder), registry, resets);
  field("enableSourceOrder", useDerived(input.enableSourceOrder), registry, resets);
  field("lastSuccessfulSource", useDerived(input.lastSuccessfulSource), registry, resets);
  field("enableLastSuccessfulSource", useDerived(input.enableLastSuccessfulSource), registry, resets);
  field("proxyTmdb", useDerived(input.proxyTmdb), registry, resets);
  field("enableCarouselView", useDerived(input.enableCarouselView), registry, resets);
  field("enableMinimalCards", useDerived(input.enableMinimalCards), registry, resets);
  field("forceCompactEpisodeView", useDerived(input.forceCompactEpisodeView), registry, resets);
  field("enableLowPerformanceMode", useDerived(input.enableLowPerformanceMode), registry, resets);
  field("enableNativeSubtitles", useDerived(input.enableNativeSubtitles), registry, resets);
  field("enableHoldToBoost", useDerived(input.enableHoldToBoost), registry, resets);
  field("homeSectionOrder", useDerived(input.homeSectionOrder), registry, resets);
  field("manualSourceSelection", useDerived(input.manualSourceSelection), registry, resets);
  field("preferredMinimumResolution", useDerived(input.preferredMinimumResolution), registry, resets);
  field("enableDoubleClickToSeek", useDerived(input.enableDoubleClickToSeek), registry, resets);
  field("enableAutoResumeOnPlaybackError", useDerived(input.enableAutoResumeOnPlaybackError), registry, resets);
  field("enablePauseOverlay", useDerived(input.enablePauseOverlay), registry, resets);
  field("bookmarkRowsToShow", useDerived(input.bookmarkRowsToShow), registry, resets);
  field("watchingRowsToShow", useDerived(input.watchingRowsToShow), registry, resets);
  field("enableGamepadControls", useDerived(input.enableGamepadControls), registry, resets);
  field("gamepadMapping", useDerived(input.gamepadMapping), registry, resets);
  field("spatialNavigation", useDerived(input.spatialNavigation), registry, resets);
  field("embedOrder", useDerived(input.embedOrder), registry, resets);
  field("enableEmbedOrder", useDerived(input.enableEmbedOrder), registry, resets);

  const setPreviewTheme = usePreviewThemeStore((s) => s.setPreviewTheme);
  const setPreviewSavedCustomThemes = usePreviewThemeStore(
    (s) => s.setPreviewSavedCustomThemes,
  );
  const resetPreviewTheme = useCallback(() => {
    setPreviewTheme(input.theme);
    setPreviewSavedCustomThemes(null);
  }, [setPreviewTheme, setPreviewSavedCustomThemes, input.theme]);

  const [subStylingState, setSubStyling, resetSubStyling, subStylingChanged] =
    useDerived(input.subtitleStyling);
  const [
    deviceNameState,
    setDeviceNameState,
    resetDeviceName,
    deviceNameChanged,
  ] = useDerived(input.deviceName);
  const [nicknameState, setNicknameState, resetNickname, nicknameChanged] =
    useDerived(input.nickname);
  const [profileState, setProfileState, resetProfile, profileChanged] =
    useDerived(input.profile);
  const [backendUrlState, setBackendUrl, resetBackendUrl, backendUrlChanged] =
    useDerived(input.backendUrl);
  const [
    customThemeState,
    setCustomThemeState,
    resetCustomTheme,
    customThemeChanged,
  ] = useDerived(input.customTheme);
  const [
    savedCustomThemesState,
    setSavedCustomThemesState,
    resetSavedCustomThemes,
    savedCustomThemesChanged,
  ] = useDerived(input.savedCustomThemes);
  const [
    hiddenDefaultThemesState,
    setHiddenDefaultThemesState,
    resetHiddenDefaultThemes,
    hiddenDefaultThemesChanged,
  ] = useDerived(input.hiddenDefaultThemes);

  // We don't overwrite the store immediately anymore, use PreviewThemeStore instead.
  // The actual store updates happen in Settings.tsx on save.

  function reset() {
    resets.forEach((r) => r());
    resetPreviewTheme();
    resetSubStyling();
    resetDeviceName();
    resetNickname();
    resetProfile();
    resetBackendUrl();
    resetCustomTheme();
    resetSavedCustomThemes();
    resetHiddenDefaultThemes();
  }

  const changed =
    Object.values(registry).some((f) => f.changed) ||
    subStylingChanged ||
    deviceNameChanged ||
    nicknameChanged ||
    profileChanged ||
    backendUrlChanged ||
    customThemeChanged ||
    savedCustomThemesChanged ||
    hiddenDefaultThemesChanged;

  return {
    reset,
    changed,
    ...(registry as SimpleFieldHandles),
    subtitleStyling: {
      state: subStylingState,
      set: setSubStyling,
      changed: subStylingChanged,
    },
    deviceName: {
      state: deviceNameState,
      set: setDeviceNameState,
      changed: deviceNameChanged,
    },
    nickname: {
      state: nicknameState,
      set: setNicknameState,
      changed: nicknameChanged,
    },
    profile: {
      state: profileState,
      set: setProfileState,
      changed: profileChanged,
    },
    backendUrl: {
      state: backendUrlState,
      set: setBackendUrl,
      changed: backendUrlChanged,
    },
    customTheme: {
      state: customThemeState,
      set: setCustomThemeState,
      changed: customThemeChanged,
    },
    savedCustomThemes: {
      state: savedCustomThemesState,
      set: (v: SavedCustomTheme[]) => {
        setSavedCustomThemesState(v);
        setPreviewSavedCustomThemes(v);
      },
      changed: savedCustomThemesChanged,
    },
    hiddenDefaultThemes: {
      state: hiddenDefaultThemesState,
      set: setHiddenDefaultThemesState,
      changed: hiddenDefaultThemesChanged,
    },
  };
}
