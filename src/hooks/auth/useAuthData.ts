import { useCallback } from "react";

import { LoginResponse, SessionResponse } from "@/backend/accounts/auth";
import { SettingsResponse } from "@/backend/accounts/settings";
import {
  BookmarkResponse,
  ProgressResponse,
  UserResponse,
  WatchHistoryResponse,
  bookmarkResponsesToEntries,
  progressResponsesToEntries,
  watchHistoryResponsesToEntries,
} from "@/backend/accounts/user";
import { useAuthStore } from "@/stores/auth";
import { useBookmarkStore } from "@/stores/bookmarks";
import { useGroupOrderStore } from "@/stores/groupOrder";
import { useLanguageStore } from "@/stores/language";
import { PreferencesStore, usePreferencesStore } from "@/stores/preferences";
import { useProgressStore } from "@/stores/progress";
import { useSubtitleStore } from "@/stores/subtitles";
import { useThemeStore } from "@/stores/theme";
import { useWatchHistoryStore } from "@/stores/watchHistory";

export function useAuthData() {
  const loggedIn = !!useAuthStore((s) => s.account);
  const setAccount = useAuthStore((s) => s.setAccount);
  const removeAccount = useAuthStore((s) => s.removeAccount);
  const setProxySet = useAuthStore((s) => s.setProxySet);
  const clearBookmarks = useBookmarkStore((s) => s.clear);
  const clearProgress = useProgressStore((s) => s.clear);
  const clearWatchHistory = useWatchHistoryStore((s) => s.clear);
  const clearGroupOrder = useGroupOrderStore((s) => s.clear);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setAppLanguage = useLanguageStore((s) => s.setLanguage);
  const importSubtitleLanguage = useSubtitleStore(
    (s) => s.importSubtitleLanguage,
  );
  const setCustomTheme = useThemeStore((s) => s.setCustomTheme);
  const saveCustomTheme = useThemeStore((s) => s.saveCustomTheme);
  const hideDefaultTheme = useThemeStore((s) => s.hideDefaultTheme);
  const setFebboxKey = usePreferencesStore((s) => s.setFebboxKey);
  const applyPreferencesSync = usePreferencesStore((s) => s.applySync);

  const replaceBookmarks = useBookmarkStore((s) => s.replaceBookmarks);
  const replaceItems = useProgressStore((s) => s.replaceItems);
  const replaceWatchHistory = useWatchHistoryStore((s) => s.replaceItems);

  const login = useCallback(
    async (
      loginResponse: LoginResponse,
      user: UserResponse,
      session: SessionResponse,
      seed?: string,
    ) => {
      const account = {
        token: loginResponse.token,
        userId: user.id,
        sessionId: loginResponse.session.id,
        deviceName: session.device,
        profile: user.profile,
        nickname: user.nickname,
        seed,
      };
      setAccount(account);
      return account;
    },
    [setAccount],
  );

  const logout = useCallback(async () => {
    removeAccount();
    clearBookmarks();
    clearProgress();
    clearWatchHistory();
    clearGroupOrder();
    setFebboxKey(null);
  }, [
    removeAccount,
    clearBookmarks,
    clearProgress,
    clearWatchHistory,
    clearGroupOrder,
    setFebboxKey,
  ]);

  const syncData = useCallback(
    async (
      _user: UserResponse,
      _session: SessionResponse,
      progress: ProgressResponse[],
      bookmarks: BookmarkResponse[],
      watchHistory: WatchHistoryResponse[],
      settings: SettingsResponse,
      groupOrder: { groupOrder: string[] },
    ) => {
      replaceBookmarks(bookmarkResponsesToEntries(bookmarks));
      replaceItems(progressResponsesToEntries(progress));
      replaceWatchHistory(watchHistoryResponsesToEntries(watchHistory));

      if (groupOrder?.groupOrder) {
        useGroupOrderStore.getState().setGroupOrder(groupOrder.groupOrder);
      }

      if (settings.applicationLanguage) {
        setAppLanguage(settings.applicationLanguage);
      }

      if (settings.defaultSubtitleLanguage) {
        importSubtitleLanguage(settings.defaultSubtitleLanguage);
      }

      if (settings.applicationTheme) {
        setTheme(settings.applicationTheme);
      }

      if (settings.customTheme) {
        if (settings.customTheme.activeTheme) {
          setCustomTheme(settings.customTheme.activeTheme);
        } else if (
          settings.customTheme.primary &&
          settings.customTheme.secondary &&
          settings.customTheme.tertiary
        ) {
          // Fallback for older theme format
          setCustomTheme({
            primary: settings.customTheme.primary,
            secondary: settings.customTheme.secondary,
            tertiary: settings.customTheme.tertiary,
          });
        }

        if (settings.customTheme.savedCustomThemes) {
          settings.customTheme.savedCustomThemes.forEach((t: any) =>
            saveCustomTheme(t),
          );
        }
        if (settings.customTheme.hiddenDefaultThemes) {
          settings.customTheme.hiddenDefaultThemes.forEach((t: any) =>
            hideDefaultTheme(t),
          );
        }
      }

      if (settings.proxyUrls) {
        setProxySet(settings.proxyUrls);
      }

      const partial: Partial<PreferencesStore> = {};

      if (settings.enableThumbnails !== undefined) partial.enableThumbnails = settings.enableThumbnails;
      if (settings.enableAutoplay !== undefined) partial.enableAutoplay = settings.enableAutoplay;
      if (settings.enableSkipCredits !== undefined) partial.enableSkipCredits = settings.enableSkipCredits;
      if (settings.enableDiscover !== undefined) partial.enableDiscover = settings.enableDiscover;
      if (settings.enableFeatured !== undefined) partial.enableFeatured = settings.enableFeatured;
      if (settings.enableDetailsModal !== undefined) partial.enableDetailsModal = settings.enableDetailsModal;
      if (settings.enableImageLogos !== undefined) partial.enableImageLogos = settings.enableImageLogos;
      if (settings.enableCarouselView !== undefined) partial.enableCarouselView = settings.enableCarouselView;
      if (settings.forceCompactEpisodeView !== undefined) partial.forceCompactEpisodeView = settings.forceCompactEpisodeView;
      if (settings.sourceOrder !== undefined) partial.sourceOrder = settings.sourceOrder ?? [];
      if (settings.enableSourceOrder !== undefined) partial.enableSourceOrder = settings.enableSourceOrder;
      if (settings.lastSuccessfulSource !== undefined) partial.lastSuccessfulSource = settings.lastSuccessfulSource;
      if (settings.enableLastSuccessfulSource !== undefined) partial.enableLastSuccessfulSource = settings.enableLastSuccessfulSource;
      if (settings.embedOrder !== undefined) partial.embedOrder = settings.embedOrder ?? [];
      if (settings.enableEmbedOrder !== undefined) partial.enableEmbedOrder = settings.enableEmbedOrder;
      if (settings.proxyTmdb !== undefined) partial.proxyTmdb = settings.proxyTmdb;
      if (settings.febboxKey !== undefined) partial.febboxKey = settings.febboxKey;
      if (settings.debridToken !== undefined) partial.debridToken = settings.debridToken;
      if (settings.debridService !== undefined) partial.debridService = settings.debridService;
      if (settings.tidbKey !== undefined) partial.tidbKey = settings.tidbKey;
      if (settings.wyzieKey !== undefined) partial.wyzieKey = settings.wyzieKey;
      if (settings.enableLowPerformanceMode !== undefined) partial.enableLowPerformanceMode = settings.enableLowPerformanceMode;
      if (settings.enableNativeSubtitles !== undefined) partial.enableNativeSubtitles = settings.enableNativeSubtitles;
      if (settings.enableHoldToBoost !== undefined) partial.enableHoldToBoost = settings.enableHoldToBoost;
      if (settings.homeSectionOrder !== undefined) partial.homeSectionOrder = settings.homeSectionOrder ?? ["watching", "bookmarks"];
      if (settings.manualSourceSelection !== undefined) partial.manualSourceSelection = settings.manualSourceSelection;
      if (settings.preferredMinimumResolution !== undefined) partial.preferredMinimumResolution = settings.preferredMinimumResolution;
      if (settings.enableDoubleClickToSeek !== undefined) partial.enableDoubleClickToSeek = settings.enableDoubleClickToSeek;
      if (settings.enableAutoResumeOnPlaybackError !== undefined) partial.enableAutoResumeOnPlaybackError = settings.enableAutoResumeOnPlaybackError;
      if (settings.enableNumberKeySeeking !== undefined) partial.enableNumberKeySeeking = settings.enableNumberKeySeeking;
      if (settings.keyboardShortcuts) partial.keyboardShortcuts = settings.keyboardShortcuts;
      if (settings.enableMinimalCards !== undefined) partial.enableMinimalCards = settings.enableMinimalCards;
      if (settings.enableAutoSkipSegments !== undefined) partial.enableAutoSkipSegments = settings.enableAutoSkipSegments;
      if (settings.enablePauseOverlay !== undefined) partial.enablePauseOverlay = settings.enablePauseOverlay;
      if (settings.bookmarkRowsToShow !== undefined) partial.bookmarkRowsToShow = settings.bookmarkRowsToShow;
      if (settings.watchingRowsToShow !== undefined) partial.watchingRowsToShow = settings.watchingRowsToShow;
      if (settings.enableGamepadControls !== undefined) partial.enableGamepadControls = settings.enableGamepadControls;
      if (settings.gamepadMapping) partial.gamepadMapping = settings.gamepadMapping;
      if (settings.spatialNavigation !== undefined) partial.spatialNavigation = settings.spatialNavigation;

      applyPreferencesSync(partial);
    },
    [
      replaceBookmarks,
      replaceItems,
      replaceWatchHistory,
      setAppLanguage,
      importSubtitleLanguage,
      setTheme,
      setCustomTheme,
      saveCustomTheme,
      hideDefaultTheme,
      setProxySet,
      applyPreferencesSync,
    ],
  );

  return {
    loggedIn,
    login,
    logout,
    syncData,
  };
}
