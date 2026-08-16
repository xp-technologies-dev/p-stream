import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import {
  DEFAULT_KEYBOARD_SHORTCUTS,
  KeyboardShortcuts,
} from "@/utils/browser/keyboardShortcuts";

export type PreferredMinimumResolution = "none" | "720" | "1080" | "4k";
export type VolumeBoostApplyMode = "current" | "title";

export type SpatialNavigationPreference = "on" | "off";

export interface PreferencesStore {
  enableThumbnails: boolean;
  enableAutoplay: boolean;
  enableSkipCredits: boolean;
  enableAutoSkipSegments: boolean;
  enableDiscover: boolean;
  enableFeatured: boolean;
  enableDetailsModal: boolean;
  enableImageLogos: boolean;
  enableCarouselView: boolean;
  enableMinimalCards: boolean;
  forceCompactEpisodeView: boolean;
  sourceOrder: string[];
  enableSourceOrder: boolean;
  lastSuccessfulSource: string | null;
  enableLastSuccessfulSource: boolean;
  embedOrder: string[];
  enableEmbedOrder: boolean;
  proxyTmdb: boolean;
  febboxKey: string | null;
  febboxUseMp4: boolean;
  debridToken: string | null;
  debridService: string;
  tidbKey: string | null;
  wyzieKey: string | null;
  enableLowPerformanceMode: boolean;
  enableNativeSubtitles: boolean;
  enableAutoSubtitleSync: boolean;
  enableHoldToBoost: boolean;
  homeSectionOrder: string[];
  bookmarkRowsToShow: number;
  watchingRowsToShow: number;
  manualSourceSelection: boolean;
  preferredMinimumResolution: PreferredMinimumResolution;
  enableDoubleClickToSeek: boolean;
  enableAutoResumeOnPlaybackError: boolean;
  enableNumberKeySeeking: boolean;
  enablePauseOverlay: boolean;
  enableGamepadControls: boolean;
  spatialNavigation: SpatialNavigationPreference;
  gamepadMapping: Record<string, string>;
  keyboardShortcuts: KeyboardShortcuts;
  videoBrightness: number;
  videoContrast: number;
  videoSaturation: number;
  videoHueRotate: number;
  volumeBoost: number;
  volumeBoostApplyMode: VolumeBoostApplyMode;
  volumeBoostByTitle: Record<string, number>;

  setEnableThumbnails(v: boolean): void;
  setEnableAutoplay(v: boolean): void;
  setEnableSkipCredits(v: boolean): void;
  setEnableAutoSkipSegments(v: boolean): void;
  setEnableDiscover(v: boolean): void;
  setEnableFeatured(v: boolean): void;
  setEnableDetailsModal(v: boolean): void;
  setEnableImageLogos(v: boolean): void;
  setEnableCarouselView(v: boolean): void;
  setEnableMinimalCards(v: boolean): void;
  setForceCompactEpisodeView(v: boolean): void;
  setSourceOrder(v: string[]): void;
  setEnableSourceOrder(v: boolean): void;
  setLastSuccessfulSource(v: string | null): void;
  setEnableLastSuccessfulSource(v: boolean): void;
  setEmbedOrder(v: string[]): void;
  setEnableEmbedOrder(v: boolean): void;
  setProxyTmdb(v: boolean): void;
  setFebboxKey(v: string | null): void;
  setFebboxUseMp4(v: boolean): void;
  setdebridToken(v: string | null): void;
  setdebridService(v: string): void;
  setTIDBKey(v: string | null): void;
  setWyzieKey(v: string | null): void;
  setEnableLowPerformanceMode(v: boolean): void;
  setEnableNativeSubtitles(v: boolean): void;
  setEnableAutoSubtitleSync(v: boolean): void;
  setEnableHoldToBoost(v: boolean): void;
  setHomeSectionOrder(v: string[]): void;
  setBookmarkRowsToShow(v: number): void;
  setWatchingRowsToShow(v: number): void;
  setManualSourceSelection(v: boolean): void;
  setPreferredMinimumResolution(v: PreferredMinimumResolution): void;
  setEnableDoubleClickToSeek(v: boolean): void;
  setEnableAutoResumeOnPlaybackError(v: boolean): void;
  setEnableNumberKeySeeking(v: boolean): void;
  setEnablePauseOverlay(v: boolean): void;
  setEnableGamepadControls(v: boolean): void;
  setSpatialNavigation(v: SpatialNavigationPreference): void;
  setGamepadMapping(v: Record<string, string>): void;
  setKeyboardShortcuts(v: KeyboardShortcuts): void;
  setVideoBrightness(v: number): void;
  setVideoContrast(v: number): void;
  setVideoSaturation(v: number): void;
  setVideoHueRotate(v: number): void;
  setVolumeBoost(v: number): void;
  setVolumeBoostApplyMode(v: VolumeBoostApplyMode): void;
  setVolumeBoostForTitle(titleKey: string, boost: number): void;
  clearVolumeBoostForTitle(titleKey: string): void;
  applySync(partial: Partial<PreferencesStore>): void;
}

export const usePreferencesStore = create(
  persist(
    immer<PreferencesStore>((set) => ({
      enableThumbnails: false,
      enableAutoplay: true,
      enableSkipCredits: true,
      enableAutoSkipSegments: false,
      enableDiscover: true,
      enableFeatured: false,
      enableDetailsModal: false,
      enableImageLogos: true,
      enableCarouselView: false,
      enableMinimalCards: false,
      forceCompactEpisodeView: false,
      sourceOrder: [],
      enableSourceOrder: false,
      lastSuccessfulSource: null,
      enableLastSuccessfulSource: false,
      embedOrder: [],
      enableEmbedOrder: false,
      proxyTmdb: false,
      febboxKey: null,
      febboxUseMp4: false,
      debridToken: null,
      debridService: "realdebrid",
      tidbKey: null,
      wyzieKey: null,
      enableLowPerformanceMode: false,
      enableNativeSubtitles: false,
      enableAutoSubtitleSync: false,
      enableHoldToBoost: true,
      homeSectionOrder: ["watching"],
      bookmarkRowsToShow: 1,
      watchingRowsToShow: 1,
      manualSourceSelection: false,
      preferredMinimumResolution: "none",
      enableDoubleClickToSeek: false,
      enableAutoResumeOnPlaybackError: true,
      enableNumberKeySeeking: true,
      enablePauseOverlay: false,
      enableGamepadControls: false,
      spatialNavigation: "off",
      gamepadMapping: {},
      keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
      videoBrightness: 100,
      videoContrast: 100,
      videoSaturation: 100,
      videoHueRotate: 0,
      volumeBoost: 100,
      volumeBoostApplyMode: "current",
      volumeBoostByTitle: {},
      setEnableThumbnails(v) {
        set((s) => {
          s.enableThumbnails = v;
        });
      },
      setEnableAutoplay(v) {
        set((s) => {
          s.enableAutoplay = v;
        });
      },
      setEnableSkipCredits(v) {
        set((s) => {
          s.enableSkipCredits = v;
        });
      },
      setEnableAutoSkipSegments(v) {
        set((s) => {
          s.enableAutoSkipSegments = v;
        });
      },
      setEnableDiscover(v) {
        set((s) => {
          s.enableDiscover = v;
        });
      },
      setEnableFeatured(v) {
        set((s) => {
          s.enableFeatured = v;
        });
      },
      setEnableDetailsModal(v) {
        set((s) => {
          s.enableDetailsModal = v;
        });
      },
      setEnableImageLogos(v) {
        set((s) => {
          s.enableImageLogos = v;
        });
      },
      setEnableCarouselView(v) {
        set((s) => {
          s.enableCarouselView = v;
        });
      },
      setEnableMinimalCards(v) {
        set((s) => {
          s.enableMinimalCards = v;
        });
      },
      setForceCompactEpisodeView(v) {
        set((s) => {
          s.forceCompactEpisodeView = v;
        });
      },
      setSourceOrder(v) {
        set((s) => {
          s.sourceOrder = v;
        });
      },
      setEnableSourceOrder(v) {
        set((s) => {
          s.enableSourceOrder = v;
        });
      },
      setLastSuccessfulSource(v) {
        set((s) => {
          s.lastSuccessfulSource = v;
        });
      },
      setEnableLastSuccessfulSource(v) {
        set((s) => {
          s.enableLastSuccessfulSource = v;
        });
      },
      setEmbedOrder(v) {
        set((s) => {
          s.embedOrder = v;
        });
      },
      setEnableEmbedOrder(v) {
        set((s) => {
          s.enableEmbedOrder = v;
        });
      },
      setProxyTmdb(v) {
        set((s) => {
          s.proxyTmdb = v;
        });
      },
      setFebboxKey(v) {
        set((s) => {
          s.febboxKey = v;
        });
      },
      setFebboxUseMp4(v) {
        set((s) => {
          s.febboxUseMp4 = v;
        });
      },
      setdebridToken(v) {
        set((s) => {
          s.debridToken = v;
        });
      },
      setdebridService(v) {
        set((s) => {
          s.debridService = v;
        });
      },
      setTIDBKey(v) {
        set((s) => {
          s.tidbKey = v;
        });
      },
      setWyzieKey(v) {
        set((s) => {
          s.wyzieKey = v;
        });
      },
      setEnableLowPerformanceMode(v) {
        set((s) => {
          s.enableLowPerformanceMode = v;
          // When enabling performance mode, disable bandwidth-heavy features
          if (v) {
            s.enableThumbnails = false;
            s.enableAutoplay = false;
          }
        });
      },
      setEnableNativeSubtitles(v) {
        set((s) => {
          s.enableNativeSubtitles = v;
        });
      },
      setEnableAutoSubtitleSync(v) {
        set((s) => {
          s.enableAutoSubtitleSync = v;
        });
      },
      setEnableHoldToBoost(v) {
        set((s) => {
          s.enableHoldToBoost = v;
        });
      },
      setHomeSectionOrder(v) {
        set((s) => {
          s.homeSectionOrder = v;
        });
      },
      setBookmarkRowsToShow(v) {
        set((s) => {
          s.bookmarkRowsToShow = v;
        });
      },
      setWatchingRowsToShow(v) {
        set((s) => {
          s.watchingRowsToShow = v;
        });
      },
      setManualSourceSelection(v) {
        set((s) => {
          s.manualSourceSelection = v;
        });
      },
      setPreferredMinimumResolution(v) {
        set((s) => {
          s.preferredMinimumResolution = v;
        });
      },
      setEnableDoubleClickToSeek(v) {
        set((s) => {
          s.enableDoubleClickToSeek = v;
        });
      },
      setEnableAutoResumeOnPlaybackError(v) {
        set((s) => {
          s.enableAutoResumeOnPlaybackError = v;
        });
      },
      setEnableNumberKeySeeking(v) {
        set((s) => {
          s.enableNumberKeySeeking = v;
        });
      },
      setEnablePauseOverlay(v) {
        set((s) => {
          s.enablePauseOverlay = v;
        });
      },
      setEnableGamepadControls(v) {
        set((s) => {
          s.enableGamepadControls = v;
        });
      },
      setSpatialNavigation(v) {
        set((s) => {
          s.spatialNavigation = v;
        });
      },
      setGamepadMapping(v) {
        set((s) => {
          s.gamepadMapping = v ?? {};
        });
      },
      setKeyboardShortcuts(v) {
        set((s) => {
          s.keyboardShortcuts = v ?? DEFAULT_KEYBOARD_SHORTCUTS;
        });
      },
      setVideoBrightness(v) {
        set((s) => {
          s.videoBrightness = v;
        });
      },
      setVolumeBoost(v) {
        set((s) => {
          s.volumeBoost = Math.min(600, Math.max(100, v));
        });
      },
      setVolumeBoostApplyMode(v) {
        set((s) => {
          s.volumeBoostApplyMode = v;
        });
      },
      setVolumeBoostForTitle(titleKey, boost) {
        set((s) => {
          s.volumeBoostByTitle[titleKey] = Math.min(600, Math.max(100, boost));
        });
      },
      clearVolumeBoostForTitle(titleKey) {
        set((s) => {
          delete s.volumeBoostByTitle[titleKey];
        });
      },
      setVideoContrast(v) {
        set((s) => {
          s.videoContrast = v;
        });
      },
      setVideoSaturation(v) {
        set((s) => {
          s.videoSaturation = v;
        });
      },
      setVideoHueRotate(v) {
        set((s) => {
          s.videoHueRotate = v;
        });
      },
      applySync(partial) {
        set((s) => {
          Object.assign(s, partial);
          if (partial.keyboardShortcuts !== undefined) {
            s.keyboardShortcuts = partial.keyboardShortcuts ?? DEFAULT_KEYBOARD_SHORTCUTS;
          }
          if (partial.gamepadMapping !== undefined) {
            s.gamepadMapping = partial.gamepadMapping ?? {};
          }
        });
      },
    })),
    {
      name: "__MW::preferences",
      merge: (persisted, current) => {
        const merged = {
          ...current,
          ...(persisted as Partial<PreferencesStore>),
        };
        if (!merged.keyboardShortcuts) {
          merged.keyboardShortcuts = DEFAULT_KEYBOARD_SHORTCUTS;
        }
        if (!merged.gamepadMapping) {
          merged.gamepadMapping = {};
        }
        if (!merged.volumeBoostByTitle) {
          merged.volumeBoostByTitle = {};
        }
        return merged;
      },
    },
  ),
);
