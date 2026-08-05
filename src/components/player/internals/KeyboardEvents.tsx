import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getMetaFromId } from "@/backend/metadata/getmeta";
import { MWMediaType } from "@/backend/metadata/types/mw";
import { useCaptions } from "@/components/player/hooks/useCaptions";
import { usePlayerMeta } from "@/components/player/hooks/usePlayerMeta";
import { useVolume } from "@/components/player/hooks/useVolume";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";
import { useProgressStore } from "@/stores/progress";
import { useSubtitleStore } from "@/stores/subtitles";
import { useEmpheralVolumeStore } from "@/stores/volume";
import { useWatchPartyStore } from "@/stores/watchParty";
import {
  DEFAULT_KEYBOARD_SHORTCUTS,
  LOCKED_SHORTCUTS,
  ShortcutId,
  matchesShortcut,
} from "@/utils/browser/keyboardShortcuts";

export function KeyboardEvents() {
  const router = useOverlayRouter("");
  const display = usePlayerStore((s) => s.display);
  const mediaProgress = usePlayerStore((s) => s.progress);
  const { isSeeking } = usePlayerStore((s) => s.interface);
  const mediaPlaying = usePlayerStore((s) => s.mediaPlaying);
  const time = usePlayerStore((s) => s.progress.time);
  const duration = usePlayerStore((s) => s.progress.duration);
  const { setVolume, toggleMute } = useVolume();
  const isInWatchParty = useWatchPartyStore((s) => s.enabled);
  const meta = usePlayerStore((s) => s.meta);
  const { setDirectMeta } = usePlayerMeta();
  const setShouldStartFromBeginning = usePlayerStore(
    (s) => s.setShouldStartFromBeginning,
  );
  const updateItem = useProgressStore((s) => s.updateItem);
  const sourceId = usePlayerStore((s) => s.sourceId);
  const setLastSuccessfulSource = usePreferencesStore(
    (s) => s.setLastSuccessfulSource,
  );

  const { toggleLastUsed, selectRandomCaptionFromLastUsedLanguage } =
    useCaptions();
  const setShowVolume = useEmpheralVolumeStore((s) => s.setShowVolume);
  const setDelay = useSubtitleStore((s) => s.setDelay);
  const delay = useSubtitleStore((s) => s.delay);
  const setShowDelayIndicator = useSubtitleStore(
    (s) => s.setShowDelayIndicator,
  );
  const enableHoldToBoost = usePreferencesStore((s) => s.enableHoldToBoost);
  const storedKeyboardShortcuts = usePreferencesStore(
    (s) => s.keyboardShortcuts,
  );
  // Merge defaults with stored shortcuts to ensure new shortcuts are available
  const keyboardShortcuts = useMemo(
    () => ({
      ...DEFAULT_KEYBOARD_SHORTCUTS,
      ...storedKeyboardShortcuts,
    }),
    [storedKeyboardShortcuts],
  );
  const enableNativeSubtitles = usePreferencesStore(
    (s) => s.enableNativeSubtitles,
  );
  const setEnableNativeSubtitles = usePreferencesStore(
    (s) => s.setEnableNativeSubtitles,
  );
  const enableNumberKeySeeking = usePreferencesStore(
    (s) => s.enableNumberKeySeeking,
  );

  const [isRolling, setIsRolling] = useState(false);
  const volumeDebounce = useRef<ReturnType<typeof setTimeout> | undefined>();
  const subtitleDebounce = useRef<ReturnType<typeof setTimeout> | undefined>();

  // Speed boost
  const setSpeedBoosted = usePlayerStore((s) => s.setSpeedBoosted);
  const setShowSpeedIndicator = usePlayerStore((s) => s.setShowSpeedIndicator);
  const speedIndicatorTimeoutRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >();
  const boostTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();
  const isPendingBoostRef = useRef<boolean>(false);
  const previousRateRef = useRef<number>(1);
  const isSpaceHeldRef = useRef<boolean>(false);

  const setCurrentOverlay = useOverlayStack((s) => s.setCurrentOverlay);

  // Episode navigation functions
  const navigateToNextEpisode = useCallback(async () => {
    if (!meta || meta.type !== "show" || !meta.episode) return;

    // Check if we're at the last episode of the current season
    const isLastEpisode =
      meta.episode.number === meta.episodes?.[meta.episodes.length - 1]?.number;

    if (!isLastEpisode) {
      // Navigate to next episode in current season
      const nextEp = meta.episodes?.find(
        (v) => v.number === meta.episode!.number + 1,
      );
      if (nextEp) {
        if (sourceId) {
          setLastSuccessfulSource(sourceId);
        }
        const metaCopy = { ...meta };
        metaCopy.episode = nextEp;
        setShouldStartFromBeginning(true);
        setDirectMeta(metaCopy);
        const defaultProgress = { duration: 0, watched: 0 };
        updateItem({
          meta: metaCopy,
          progress: defaultProgress,
        });
      }
    } else {
      // Navigate to first episode of next season
      if (!meta.tmdbId) return;

      try {
        const data = await getMetaFromId(MWMediaType.SERIES, meta.tmdbId);
        if (data?.meta.type !== MWMediaType.SERIES) return;

        const nextSeason = data.meta.seasons?.find(
          (season) => season.number === (meta.season?.number ?? 0) + 1,
        );

        if (nextSeason) {
          const seasonData = await getMetaFromId(
            MWMediaType.SERIES,
            meta.tmdbId,
            nextSeason.id,
          );

          if (seasonData?.meta.type === MWMediaType.SERIES) {
            const nextSeasonEpisodes = seasonData.meta.seasonData.episodes
              .filter((episode) => {
                // Simple aired check - episodes without air_date are considered aired
                return (
                  !episode.air_date || new Date(episode.air_date) <= new Date()
                );
              })
              .map((episode) => ({
                number: episode.number,
                title: episode.title,
                tmdbId: episode.id,
                air_date: episode.air_date,
              }));

            if (nextSeasonEpisodes.length > 0) {
              const nextEp = nextSeasonEpisodes[0];

              if (sourceId) {
                setLastSuccessfulSource(sourceId);
              }

              const metaCopy = { ...meta };
              metaCopy.episode = nextEp;
              metaCopy.season = {
                number: nextSeason.number,
                title: nextSeason.title,
                tmdbId: nextSeason.id,
              };
              metaCopy.episodes = nextSeasonEpisodes;
              setShouldStartFromBeginning(true);
              setDirectMeta(metaCopy);
              const defaultProgress = { duration: 0, watched: 0 };
              updateItem({
                meta: metaCopy,
                progress: defaultProgress,
              });
            }
          }
        }
      } catch (error) {
        console.error("Failed to load next season:", error);
      }
    }
  }, [
    meta,
    setDirectMeta,
    setShouldStartFromBeginning,
    updateItem,
    sourceId,
    setLastSuccessfulSource,
  ]);

  const navigateToPreviousEpisode = useCallback(async () => {
    if (!meta || meta.type !== "show" || !meta.episode) return;

    // Check if we're at the first episode of the current season
    const isFirstEpisode = meta.episode.number === meta.episodes?.[0]?.number;

    if (!isFirstEpisode) {
      // Navigate to previous episode in current season
      const prevEp = meta.episodes?.find(
        (v) => v.number === meta.episode!.number - 1,
      );
      if (prevEp) {
        if (sourceId) {
          setLastSuccessfulSource(sourceId);
        }
        const metaCopy = { ...meta };
        metaCopy.episode = prevEp;
        setShouldStartFromBeginning(true);
        setDirectMeta(metaCopy);
        const defaultProgress = { duration: 0, watched: 0 };
        updateItem({
          meta: metaCopy,
          progress: defaultProgress,
        });
      }
    } else {
      // Navigate to last episode of previous season
      if (!meta.tmdbId) return;

      try {
        const data = await getMetaFromId(MWMediaType.SERIES, meta.tmdbId);
        if (data?.meta.type !== MWMediaType.SERIES) return;

        const prevSeason = data.meta.seasons?.find(
          (season) => season.number === (meta.season?.number ?? 0) - 1,
        );

        if (prevSeason) {
          const seasonData = await getMetaFromId(
            MWMediaType.SERIES,
            meta.tmdbId,
            prevSeason.id,
          );

          if (seasonData?.meta.type === MWMediaType.SERIES) {
            const prevSeasonEpisodes = seasonData.meta.seasonData.episodes
              .filter((episode) => {
                // Simple aired check - episodes without air_date are considered aired
                return (
                  !episode.air_date || new Date(episode.air_date) <= new Date()
                );
              })
              .map((episode) => ({
                number: episode.number,
                title: episode.title,
                tmdbId: episode.id,
                air_date: episode.air_date,
              }));

            if (prevSeasonEpisodes.length > 0) {
              const prevEp = prevSeasonEpisodes[prevSeasonEpisodes.length - 1];

              if (sourceId) {
                setLastSuccessfulSource(sourceId);
              }

              const metaCopy = { ...meta };
              metaCopy.episode = prevEp;
              metaCopy.season = {
                number: prevSeason.number,
                title: prevSeason.title,
                tmdbId: prevSeason.id,
              };
              metaCopy.episodes = prevSeasonEpisodes;
              setShouldStartFromBeginning(true);
              setDirectMeta(metaCopy);
              const defaultProgress = { duration: 0, watched: 0 };
              updateItem({
                meta: metaCopy,
                progress: defaultProgress,
              });
            }
          }
        }
      } catch (error) {
        console.error("Failed to load previous season:", error);
      }
    }
  }, [
    meta,
    setDirectMeta,
    setShouldStartFromBeginning,
    updateItem,
    sourceId,
    setLastSuccessfulSource,
  ]);

  const dataRef = useRef({
    setShowVolume,
    setVolume,
    toggleMute,
    setIsRolling,
    toggleLastUsed,
    selectRandomCaptionFromLastUsedLanguage,
    display,
    mediaPlaying,
    mediaProgress,
    isSeeking,
    isRolling,
    time,
    duration,
    router,
    setDelay,
    delay,
    setShowDelayIndicator,
    setCurrentOverlay,
    isInWatchParty,
    previousRateRef,
    isSpaceHeldRef,
    setSpeedBoosted,
    setShowSpeedIndicator,
    speedIndicatorTimeoutRef,
    boostTimeoutRef,
    isPendingBoostRef,
    enableHoldToBoost,
    navigateToNextEpisode,
    navigateToPreviousEpisode,
    keyboardShortcuts,
    enableNativeSubtitles,
    setEnableNativeSubtitles,
    enableNumberKeySeeking,
  });

  useEffect(() => {
    dataRef.current = {
      setShowVolume,
      setVolume,
      toggleMute,
      setIsRolling,
      toggleLastUsed,
      selectRandomCaptionFromLastUsedLanguage,
      display,
      mediaPlaying,
      mediaProgress,
      isSeeking,
      isRolling,
      time,
      duration,
      router,
      setDelay,
      delay,
      setShowDelayIndicator,
      setCurrentOverlay,
      isInWatchParty,
      previousRateRef,
      isSpaceHeldRef,
      setSpeedBoosted,
      setShowSpeedIndicator,
      speedIndicatorTimeoutRef,
      boostTimeoutRef,
      isPendingBoostRef,
      enableHoldToBoost,
      navigateToNextEpisode,
      navigateToPreviousEpisode,
      keyboardShortcuts,
      enableNativeSubtitles,
      setEnableNativeSubtitles,
      enableNumberKeySeeking,
    };
  }, [
    setShowVolume,
    setVolume,
    toggleMute,
    setIsRolling,
    toggleLastUsed,
    selectRandomCaptionFromLastUsedLanguage,
    display,
    mediaPlaying,
    mediaProgress,
    isSeeking,
    isRolling,
    time,
    duration,
    router,
    setDelay,
    delay,
    setShowDelayIndicator,
    setCurrentOverlay,
    isInWatchParty,
    setSpeedBoosted,
    setShowSpeedIndicator,
    enableHoldToBoost,
    navigateToNextEpisode,
    navigateToPreviousEpisode,
    keyboardShortcuts,
    enableNativeSubtitles,
    setEnableNativeSubtitles,
    enableNumberKeySeeking,
  ]);

  useEffect(() => {
    const keydownEventHandler = (evt: KeyboardEvent) => {
      if (evt.target && (evt.target as HTMLInputElement).nodeName === "INPUT")
        return;

      const k = evt.key;
      const keyL = evt.key.toLowerCase();

      // Volume (locked shortcuts - ArrowUp/ArrowDown always work)
      if (["ArrowUp", "ArrowDown", "m", "M"].includes(k)) {
        dataRef.current.setShowVolume(true);
        dataRef.current.setCurrentOverlay("volume");

        if (volumeDebounce.current) clearTimeout(volumeDebounce.current);
        volumeDebounce.current = setTimeout(() => {
          dataRef.current.setShowVolume(false);
          dataRef.current.setCurrentOverlay(null);
        }, 3e3);
      }
      if (k === LOCKED_SHORTCUTS.ARROW_UP)
        dataRef.current.setVolume(
          (dataRef.current.mediaPlaying?.volume || 0) + 0.15,
        );
      if (k === LOCKED_SHORTCUTS.ARROW_DOWN)
        dataRef.current.setVolume(
          (dataRef.current.mediaPlaying?.volume || 0) - 0.15,
        );
      // Mute - check customizable shortcut
      if (
        matchesShortcut(evt, dataRef.current.keyboardShortcuts[ShortcutId.MUTE])
      ) {
        dataRef.current.toggleMute();
      }

      // Video playback speed - disabled in watch party (hardcoded, not customizable)
      if ((k === ">" || k === "<") && !dataRef.current.isInWatchParty) {
        const options = [0.25, 0.5, 1, 1.5, 2];
        let idx = options.indexOf(dataRef.current.mediaPlaying?.playbackRate);
        if (idx === -1) idx = options.indexOf(1);
        const nextIdx = idx + (k === ">" ? 1 : -1);
        const next = options[nextIdx];
        if (next) dataRef.current.display?.setPlaybackRate(next);
      }

      // Handle spacebar press for play/pause and hold for 2x speed - disabled in watch party or when hold to boost is disabled
      // Space is locked, always check it
      if (
        k === LOCKED_SHORTCUTS.PLAY_PAUSE_SPACE &&
        !dataRef.current.isInWatchParty &&
        dataRef.current.enableHoldToBoost
      ) {
        // Skip if it's a repeated event
        if (evt.repeat) {
          return;
        }

        // Skip if a button is targeted
        if (
          evt.target &&
          (evt.target as HTMLInputElement).nodeName === "BUTTON"
        ) {
          return;
        }

        // Prevent the default spacebar behavior
        evt.preventDefault();

        // If already paused, play the video and return
        if (dataRef.current.mediaPlaying.isPaused) {
          dataRef.current.display?.play();
          return;
        }

        // If we're already holding space, don't trigger boost again
        if (dataRef.current.isSpaceHeldRef.current) {
          return;
        }

        // Save current rate
        dataRef.current.previousRateRef.current =
          dataRef.current.mediaPlaying.playbackRate;

        // Set pending boost flag
        dataRef.current.isPendingBoostRef.current = true;

        // Add delay before boosting speed
        if (dataRef.current.boostTimeoutRef.current) {
          clearTimeout(dataRef.current.boostTimeoutRef.current);
        }

        dataRef.current.boostTimeoutRef.current = setTimeout(() => {
          // Only apply boost if the key is still held down
          if (dataRef.current.isPendingBoostRef.current) {
            dataRef.current.isSpaceHeldRef.current = true;
            dataRef.current.isPendingBoostRef.current = false;

            // Show speed indicator
            dataRef.current.setSpeedBoosted(true);
            dataRef.current.setShowSpeedIndicator(true);
            dataRef.current.setCurrentOverlay("speed");

            // Clear any existing timeout
            if (dataRef.current.speedIndicatorTimeoutRef.current) {
              clearTimeout(dataRef.current.speedIndicatorTimeoutRef.current);
            }

            dataRef.current.display?.setPlaybackRate(2);
          }
        }, 300); // 300ms delay before boost takes effect
      }

      // Handle spacebar press for simple play/pause when hold to boost is disabled or in watch party mode
      // Space is locked, always check it
      if (
        k === LOCKED_SHORTCUTS.PLAY_PAUSE_SPACE &&
        (!dataRef.current.enableHoldToBoost || dataRef.current.isInWatchParty)
      ) {
        // Skip if it's a repeated event
        if (evt.repeat) {
          return;
        }

        // Skip if a button is targeted
        if (
          evt.target &&
          (evt.target as HTMLInputElement).nodeName === "BUTTON"
        ) {
          return;
        }

        // Prevent the default spacebar behavior
        evt.preventDefault();

        // Simple play/pause toggle
        const action = dataRef.current.mediaPlaying.isPaused ? "play" : "pause";
        dataRef.current.display?.[action]();
      }

      // Video progress - handle skip shortcuts
      // Skip repeated key events to prevent multiple skips
      if (evt.repeat) return;

      // Arrow keys are locked (always 5 seconds) - handle first and return
      if (k === LOCKED_SHORTCUTS.ARROW_RIGHT) {
        evt.preventDefault();
        dataRef.current.display?.setTime(dataRef.current.time + 5);
        return;
      }
      if (k === LOCKED_SHORTCUTS.ARROW_LEFT) {
        evt.preventDefault();
        dataRef.current.display?.setTime(dataRef.current.time - 5);
        return;
      }

      // Skip forward/backward 5 seconds - customizable (skip if set to arrow keys)
      const skipForward5 =
        dataRef.current.keyboardShortcuts[ShortcutId.SKIP_FORWARD_5];
      if (
        skipForward5?.key &&
        skipForward5.key !== LOCKED_SHORTCUTS.ARROW_RIGHT &&
        matchesShortcut(evt, skipForward5)
      ) {
        evt.preventDefault();
        dataRef.current.display?.setTime(dataRef.current.time + 5);
        return;
      }
      const skipBackward5 =
        dataRef.current.keyboardShortcuts[ShortcutId.SKIP_BACKWARD_5];
      if (
        skipBackward5?.key &&
        skipBackward5.key !== LOCKED_SHORTCUTS.ARROW_LEFT &&
        matchesShortcut(evt, skipBackward5)
      ) {
        evt.preventDefault();
        dataRef.current.display?.setTime(dataRef.current.time - 5);
        return;
      }

      // Skip forward/backward 10 seconds - customizable
      if (
        matchesShortcut(
          evt,
          dataRef.current.keyboardShortcuts[ShortcutId.SKIP_FORWARD_10],
        )
      ) {
        evt.preventDefault();
        dataRef.current.display?.setTime(dataRef.current.time + 10);
        return;
      }
      if (
        matchesShortcut(
          evt,
          dataRef.current.keyboardShortcuts[ShortcutId.SKIP_BACKWARD_10],
        )
      ) {
        evt.preventDefault();
        dataRef.current.display?.setTime(dataRef.current.time - 10);
        return;
      }

      // Skip forward/backward 1 second - customizable
      if (
        matchesShortcut(
          evt,
          dataRef.current.keyboardShortcuts[ShortcutId.SKIP_FORWARD_1],
        )
      ) {
        evt.preventDefault();
        dataRef.current.display?.setTime(dataRef.current.time + 1);
        return;
      }
      if (
        matchesShortcut(
          evt,
          dataRef.current.keyboardShortcuts[ShortcutId.SKIP_BACKWARD_1],
        )
      ) {
        evt.preventDefault();
        dataRef.current.display?.setTime(dataRef.current.time - 1);
        return;
      }

      // Skip to percentage with number keys (0-9) - locked, always use number keys
      // Number keys are reserved for progress skipping, so handle them before customizable shortcuts
      if (
        dataRef.current.enableNumberKeySeeking &&
        /^[0-9]$/.test(k) &&
        dataRef.current.duration > 0 &&
        !evt.ctrlKey &&
        !evt.metaKey &&
        !evt.shiftKey &&
        !evt.altKey
      ) {
        evt.preventDefault();
        if (k === "0") {
          dataRef.current.display?.setTime(0);
        } else if (k === "9") {
          const targetTime = (dataRef.current.duration * 90) / 100;
          dataRef.current.display?.setTime(targetTime);
        } else {
          // 1-8 for 10%-80%
          const percentage = parseInt(k, 10) * 10;
          const targetTime = (dataRef.current.duration * percentage) / 100;
          dataRef.current.display?.setTime(targetTime);
        }
        return;
      }

      // Utils - Fullscreen is customizable
      if (
        matchesShortcut(
          evt,
          dataRef.current.keyboardShortcuts[ShortcutId.TOGGLE_FULLSCREEN],
        )
      ) {
        dataRef.current.display?.toggleFullscreen();
      }

      // K key for play/pause - locked shortcut
      if (
        keyL === LOCKED_SHORTCUTS.PLAY_PAUSE_K.toLowerCase() &&
        !dataRef.current.isSpaceHeldRef.current
      ) {
        if (
          evt.target &&
          (evt.target as HTMLInputElement).nodeName === "BUTTON"
        ) {
          return;
        }

        const action = dataRef.current.mediaPlaying.isPaused ? "play" : "pause";
        dataRef.current.display?.[action]();
      }
      // Escape is locked
      if (k === LOCKED_SHORTCUTS.ESCAPE) dataRef.current.router.close();

      // Episode navigation (shows only) - customizable
      if (
        matchesShortcut(
          evt,
          dataRef.current.keyboardShortcuts[ShortcutId.NEXT_EPISODE],
        )
      ) {
        dataRef.current.navigateToNextEpisode();
      }
      if (
        matchesShortcut(
          evt,
          dataRef.current.keyboardShortcuts[ShortcutId.PREVIOUS_EPISODE],
        )
      ) {
        dataRef.current.navigateToPreviousEpisode();
      }

      // Captions - customizable
      if (
        matchesShortcut(
          evt,
          dataRef.current.keyboardShortcuts[ShortcutId.TOGGLE_CAPTIONS],
        )
      ) {
        dataRef.current.toggleLastUsed().catch(() => {}); // ignore errors
      }
      // Random caption selection - customizable
      if (
        matchesShortcut(
          evt,
          dataRef.current.keyboardShortcuts[ShortcutId.RANDOM_CAPTION],
        )
      ) {
        dataRef.current
          .selectRandomCaptionFromLastUsedLanguage()
          .catch(() => {}); // ignore errors
      }

      // Barrel roll - customizable
      if (
        matchesShortcut(
          evt,
          dataRef.current.keyboardShortcuts[ShortcutId.BARREL_ROLL],
        )
      ) {
        if (dataRef.current.isRolling || evt.ctrlKey || evt.metaKey) return;

        dataRef.current.setIsRolling(true);
        document.querySelector(".popout-location")?.classList.add("roll");
        document.body.setAttribute("data-no-scroll", "true");

        setTimeout(() => {
          document.querySelector(".popout-location")?.classList.remove("roll");
          document.body.removeAttribute("data-no-scroll");
          dataRef.current.setIsRolling(false);
        }, 1e3);
      }

      // Subtitle sync - customizable
      if (
        matchesShortcut(
          evt,
          dataRef.current.keyboardShortcuts[ShortcutId.SYNC_SUBTITLES_EARLIER],
        )
      ) {
        dataRef.current.setDelay(dataRef.current.delay - 0.5);
        dataRef.current.setShowDelayIndicator(true);
        dataRef.current.setCurrentOverlay("subtitle");

        if (subtitleDebounce.current) clearTimeout(subtitleDebounce.current);
        subtitleDebounce.current = setTimeout(() => {
          dataRef.current.setShowDelayIndicator(false);
          dataRef.current.setCurrentOverlay(null);
        }, 3000);
      }
      if (
        matchesShortcut(
          evt,
          dataRef.current.keyboardShortcuts[ShortcutId.SYNC_SUBTITLES_LATER],
        )
      ) {
        dataRef.current.setDelay(dataRef.current.delay + 0.5);
        dataRef.current.setShowDelayIndicator(true);
        dataRef.current.setCurrentOverlay("subtitle");

        if (subtitleDebounce.current) clearTimeout(subtitleDebounce.current);
        subtitleDebounce.current = setTimeout(() => {
          dataRef.current.setShowDelayIndicator(false);
          dataRef.current.setCurrentOverlay(null);
        }, 3000);
      }

      // Toggle native subtitles - customizable
      const toggleNativeSubtitles =
        dataRef.current.keyboardShortcuts[ShortcutId.TOGGLE_NATIVE_SUBTITLES];
      if (
        toggleNativeSubtitles?.key &&
        matchesShortcut(evt, toggleNativeSubtitles)
      ) {
        evt.preventDefault();
        evt.stopPropagation();
        dataRef.current.setEnableNativeSubtitles(
          !dataRef.current.enableNativeSubtitles,
        );
      }
    };

    const keyupEventHandler = (evt: KeyboardEvent) => {
      const k = evt.key;

      // Handle spacebar release - only handle speed boost logic when not in watch party and hold to boost is enabled
      if (
        k === " " &&
        !dataRef.current.isInWatchParty &&
        dataRef.current.enableHoldToBoost
      ) {
        // If we haven't applied the boost yet but were about to, cancel it
        if (dataRef.current.isPendingBoostRef.current) {
          dataRef.current.isPendingBoostRef.current = false;
          if (dataRef.current.boostTimeoutRef.current) {
            clearTimeout(dataRef.current.boostTimeoutRef.current);
          }

          // The space key was released quickly, so trigger play/pause
          const action = dataRef.current.mediaPlaying.isPaused
            ? "play"
            : "pause";
          dataRef.current.display?.[action]();
        } else if (dataRef.current.isSpaceHeldRef.current) {
          // We were in boost mode, restore previous rate
          dataRef.current.display?.setPlaybackRate(
            dataRef.current.previousRateRef.current,
          );
          dataRef.current.isSpaceHeldRef.current = false;

          // Update UI state
          dataRef.current.setSpeedBoosted(false);

          // Set a timeout to hide the speed indicator
          if (dataRef.current.speedIndicatorTimeoutRef.current) {
            clearTimeout(dataRef.current.speedIndicatorTimeoutRef.current);
          }

          dataRef.current.speedIndicatorTimeoutRef.current = setTimeout(() => {
            dataRef.current.setShowSpeedIndicator(false);
            dataRef.current.setCurrentOverlay(null);
          }, 1500);
        }
      }
    };

    window.addEventListener("keydown", keydownEventHandler);
    window.addEventListener("keyup", keyupEventHandler);

    return () => {
      window.removeEventListener("keydown", keydownEventHandler);
      window.removeEventListener("keyup", keyupEventHandler);
    };
  }, []);

  return null;
}
