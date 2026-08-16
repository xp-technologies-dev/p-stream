import { ofetch } from "ofetch";

import { getAuthHeaders } from "@/backend/accounts/auth";
import { AccountWithToken } from "@/stores/auth";
import { PreferencesStore } from "@/stores/preferences";
import { KeyboardShortcuts } from "@/utils/browser/keyboardShortcuts";

export interface CustomThemeSettings {
  primary?: string;
  secondary?: string;
  tertiary?: string;
  activeTheme?: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  savedCustomThemes?: {
    id: string;
    name: string;
    primary: string;
    secondary: string;
    tertiary: string;
  }[];
  hiddenDefaultThemes?: string[];
}

export interface SettingsInput {
  applicationLanguage?: string;
  applicationTheme?: string | null;
  defaultSubtitleLanguage?: string;
  proxyUrls?: string[] | null;
  febboxKey?: string | null;
  debridToken?: string | null;
  debridService?: string;
  tidbKey?: string | null;
  wyzieKey?: string | null;
  enableThumbnails?: boolean;
  enableAutoplay?: boolean;
  enableSkipCredits?: boolean;
  enableAutoSkipSegments?: boolean;
  enableDiscover?: boolean;
  enableFeatured?: boolean;
  enableDetailsModal?: boolean;
  enableImageLogos?: boolean;
  enableCarouselView?: boolean;
  enableMinimalCards?: boolean;
  forceCompactEpisodeView?: boolean;
  sourceOrder?: string[] | null;
  enableSourceOrder?: boolean;
  lastSuccessfulSource?: string | null;
  enableLastSuccessfulSource?: boolean;
  embedOrder?: string[] | null;
  enableEmbedOrder?: boolean;
  proxyTmdb?: boolean;
  enableLowPerformanceMode?: boolean;
  enableNativeSubtitles?: boolean;
  enableHoldToBoost?: boolean;
  homeSectionOrder?: string[] | null;
  manualSourceSelection?: boolean;
  preferredMinimumResolution?: "none" | "720" | "1080" | "4k";
  enableDoubleClickToSeek?: boolean;
  enableAutoResumeOnPlaybackError?: boolean;
  enablePauseOverlay?: boolean;
  enableNumberKeySeeking?: boolean;
  keyboardShortcuts?: KeyboardShortcuts;
  customTheme?: CustomThemeSettings;
  bookmarkRowsToShow?: number;
  watchingRowsToShow?: number;
  enableGamepadControls?: boolean;
  gamepadMapping?: Record<string, string>;
  spatialNavigation?: "on" | "off";
}

export interface SettingsResponse {
  applicationTheme?: string | null;
  applicationLanguage?: string | null;
  defaultSubtitleLanguage?: string | null;
  proxyUrls?: string[] | null;
  febboxKey?: string | null;
  debridToken?: string | null;
  debridService?: string;
  tidbKey?: string | null;
  wyzieKey?: string | null;
  enableThumbnails?: boolean;
  enableAutoplay?: boolean;
  enableSkipCredits?: boolean;
  enableAutoSkipSegments?: boolean;
  enableDiscover?: boolean;
  enableFeatured?: boolean;
  enableDetailsModal?: boolean;
  enableImageLogos?: boolean;
  enableCarouselView?: boolean;
  enableMinimalCards?: boolean;
  forceCompactEpisodeView?: boolean;
  sourceOrder?: string[] | null;
  enableSourceOrder?: boolean;
  lastSuccessfulSource?: string | null;
  enableLastSuccessfulSource?: boolean;
  embedOrder?: string[] | null;
  enableEmbedOrder?: boolean;
  proxyTmdb?: boolean;
  enableLowPerformanceMode?: boolean;
  enableNativeSubtitles?: boolean;
  enableHoldToBoost?: boolean;
  homeSectionOrder?: string[] | null;
  manualSourceSelection?: boolean;
  preferredMinimumResolution?: "none" | "720" | "1080" | "4k";
  enableDoubleClickToSeek?: boolean;
  enableAutoResumeOnPlaybackError?: boolean;
  enablePauseOverlay?: boolean;
  enableNumberKeySeeking?: boolean;
  keyboardShortcuts?: KeyboardShortcuts;
  customTheme?: CustomThemeSettings;
  bookmarkRowsToShow?: number;
  watchingRowsToShow?: number;
  enableGamepadControls?: boolean;
  gamepadMapping?: Record<string, string>;
  spatialNavigation?: "on" | "off";
}

export function updateSettings(
  url: string,
  account: AccountWithToken,
  settings: SettingsInput,
) {
  return ofetch<SettingsResponse>(`/users/${account.userId}/settings`, {
    method: "PUT",
    body: settings,
    baseURL: url,
    headers: getAuthHeaders(account.token),
  });
}

export function getSettings(url: string, account: AccountWithToken) {
  return ofetch<SettingsResponse>(`/users/${account.userId}/settings`, {
    method: "GET",
    baseURL: url,
    headers: getAuthHeaders(account.token),
  });
}

export interface SettingsImportExtras {
  applicationLanguage?: string;
  applicationTheme?: string | null;
  defaultSubtitleLanguage?: string;
}

// Single source of truth for turning local preferences into a full settings
// import payload -- used by both account creation and account migration so
// the two flows can't drift out of sync with each other again.
export function buildFullSettingsInput(
  preferences: PreferencesStore,
  extras: SettingsImportExtras,
): SettingsInput {
  return {
    ...extras,
    proxyUrls: undefined,
    febboxKey: preferences.febboxKey,
    debridToken: preferences.debridToken,
    debridService: preferences.debridService,
    tidbKey: preferences.tidbKey,
    wyzieKey: preferences.wyzieKey,
    enableThumbnails: preferences.enableThumbnails,
    enableAutoplay: preferences.enableAutoplay,
    enableSkipCredits: preferences.enableSkipCredits,
    enableAutoSkipSegments: preferences.enableAutoSkipSegments,
    enableDiscover: preferences.enableDiscover,
    enableFeatured: preferences.enableFeatured,
    enableDetailsModal: preferences.enableDetailsModal,
    enableImageLogos: preferences.enableImageLogos,
    enableCarouselView: preferences.enableCarouselView,
    enableMinimalCards: preferences.enableMinimalCards,
    forceCompactEpisodeView: preferences.forceCompactEpisodeView,
    sourceOrder:
      preferences.sourceOrder.length > 0 ? preferences.sourceOrder : undefined,
    enableSourceOrder: preferences.enableSourceOrder,
    lastSuccessfulSource: preferences.lastSuccessfulSource,
    enableLastSuccessfulSource: preferences.enableLastSuccessfulSource,
    embedOrder:
      preferences.embedOrder.length > 0 ? preferences.embedOrder : undefined,
    enableEmbedOrder: preferences.enableEmbedOrder,
    proxyTmdb: preferences.proxyTmdb,
    enableLowPerformanceMode: preferences.enableLowPerformanceMode,
    enableNativeSubtitles: preferences.enableNativeSubtitles,
    enableHoldToBoost: preferences.enableHoldToBoost,
    homeSectionOrder:
      preferences.homeSectionOrder.length > 0
        ? preferences.homeSectionOrder
        : undefined,
    manualSourceSelection: preferences.manualSourceSelection,
    preferredMinimumResolution: preferences.preferredMinimumResolution,
    enableDoubleClickToSeek: preferences.enableDoubleClickToSeek,
    enableAutoResumeOnPlaybackError: preferences.enableAutoResumeOnPlaybackError,
    enablePauseOverlay: preferences.enablePauseOverlay,
    enableNumberKeySeeking: preferences.enableNumberKeySeeking,
    keyboardShortcuts: preferences.keyboardShortcuts,
    bookmarkRowsToShow: preferences.bookmarkRowsToShow,
    watchingRowsToShow: preferences.watchingRowsToShow,
    enableGamepadControls: preferences.enableGamepadControls,
    gamepadMapping: preferences.gamepadMapping,
    spatialNavigation: preferences.spatialNavigation,
  };
}
