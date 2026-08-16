import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { BrandPill } from "@/components/layout/BrandPill";
import { Player } from "@/components/player";
import { SkipSegmentButton } from "@/components/player/atoms/SkipSegmentButton";
import { ThumbsFeedback } from "@/components/player/atoms/ThumbsFeedback";
import { WatchPartyStatus } from "@/components/player/atoms/WatchPartyStatus";
import { useShouldShowControls } from "@/components/player/hooks/useShouldShowControls";
import { useAutoSync } from "@/components/player/hooks/useAutoSync";
import {
  SegmentData,
  useSkipTime,
} from "@/components/player/hooks/useSkipTime";
import { PauseOverlay } from "@/components/player/overlays/PauseOverlay";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PlayerMeta, playerStatus } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";
import { useWatchPartyStore } from "@/stores/watchParty";

import { ScrapingPartInterruptButton} from "./ScrapingPart";

export interface PlayerPartProps {
  children?: ReactNode;
  backUrl: string;
  onLoad?: () => void;
  onMetaChange?: (meta: PlayerMeta) => void;
}

export function PlayerPart(props: PlayerPartProps) {
  const { showTargets, showTouchTargets } = useShouldShowControls();
  const status = usePlayerStore((s) => s.status);
  const { isMobile } = useIsMobile();
  const manualSourceSelection = usePreferencesStore(
    (s) => s.manualSourceSelection,
  );
  const isLoading = usePlayerStore((s) => s.mediaPlaying.isLoading);
  const { isHost, enabled } = useWatchPartyStore();
  const { t } = useTranslation();
  const meta = usePlayerStore((s) => s.meta);

  const inControl = !enabled || isHost;


  useAutoSync();

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isPWA = window.matchMedia("(display-mode: standalone)").matches;

  const [isShifting, setIsShifting] = useState(false);
  const [isHoldingFullscreen, setIsHoldingFullscreen] = useState(false);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setIsShifting(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setIsShifting(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleTouchStart = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
    }
    holdTimeoutRef.current = setTimeout(() => {
      setIsHoldingFullscreen(true);
    }, 100);
  };

  const handleTouchEnd = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
    }
    holdTimeoutRef.current = setTimeout(() => {
      setIsHoldingFullscreen(false);
    }, 1000);
  };

  // State for thumbs feedback
  const [thumbsFeedbackData, setThumbsFeedbackData] = useState<{
    segment: SegmentData;
    skipTime: number;
  } | null>(null);

  const segments = useSkipTime();

  const handleSkipTriggered = useCallback(
    (segment: SegmentData, skipTime: number) => {
      setThumbsFeedbackData({ segment, skipTime });
    },
    [],
  );

  const handleThumbsFeedback = useCallback(() => {
    setThumbsFeedbackData(null);
  }, []);

  return (
    <Player.Container onLoad={props.onLoad} showingControls={showTargets}>
      {props.children}
      <PauseOverlay />
      <Player.BlackOverlay
        show={showTargets && status === playerStatus.PLAYING}
      />
      <Player.EpisodesRouter onChange={props.onMetaChange} />
      <Player.SettingsRouter />
      <Player.SubtitleView controlsShown={showTargets} />

      {status === playerStatus.PLAYING ? (
        <Player.CenterControls>
          <Player.LoadingSpinner />
          <Player.AutoPlayStart />
          <Player.CastingNotification />
        </Player.CenterControls>
      ) : null}

      <Player.CenterMobileControls
        className="text-white"
        show={showTouchTargets && status === playerStatus.PLAYING}
      >
        <Player.SkipBackward iconSizeClass="text-3xl" inControl={inControl} />
        <Player.Pause
          iconSizeClass="text-5xl"
          className={isLoading ? "opacity-0" : "opacity-100"}
        />
        <Player.SkipForward iconSizeClass="text-3xl" inControl={inControl} />
      </Player.CenterMobileControls>

      <div
        className={`absolute right-4 z-50 transition-all duration-300 ease-in-out ${
          showTargets ? "top-16" : "top-1"
        }`}
      >
        <WatchPartyStatus />
      </div>

      <Player.TopControls show={showTargets}>
        <div className="grid grid-cols-[1fr,auto] xl:grid-cols-3 items-center">
          <div className="flex space-x-3 items-center">
            <Player.BackLink url={props.backUrl} />
            <span className="text mx-3 text-type-secondary">/</span>
            <Player.Title />

            {isMobile && meta?.type === "show" && (
              <span className="text-type-secondary text-sm whitespace-nowrap flex-shrink-0">
                {t("media.episodeDisplay", {
                  season: meta?.season?.number,
                  episode: meta?.episode?.number,
                })}
              </span>
            )}

            <Player.InfoButton />

            <Player.BookmarkButton />
          </div>
          <div className="text-center hidden xl:flex justify-center items-center">
            <Player.EpisodeTitle />
          </div>
          <div className="hidden lg:flex items-center justify-end">
            <BrandPill />
          </div>
          <div className="flex lg:hidden items-center justify-end">
            {status === playerStatus.PLAYING ? (
              <>
                <Player.Airplay />
                <Player.Chromecast />
              </>
            ) : null}
          </div>
        </div>
      </Player.TopControls>

      <Player.BottomControls show={showTargets}>
        {/*status !== playerStatus.PLAYING && !manualSourceSelection && <Tips />*/}
        <div className="flex items-center justify-center space-x-3 h-full">
          {status === playerStatus.SCRAPING ? (
            <ScrapingPartInterruptButton />
          ) : null}
          {status === playerStatus.PLAYING ? (
            <>
              {isMobile ? <Player.Time short /> : null}
              <Player.ProgressBar />
            </>
          ) : null}
        </div>
        <div
          data-nav-first
          className="hidden lg:flex justify-between"
          dir="ltr"
        >
          <Player.LeftSideControls>
            {status === playerStatus.PLAYING ? (
              <>
                <Player.Pause />
                <Player.SkipBackward inControl={inControl} />
                <Player.SkipForward inControl={inControl} />
                <Player.Volume />
                <Player.Time />
              </>
            ) : null}
          </Player.LeftSideControls>
          <div className="flex items-center space-x-3">
            <Player.Episodes inControl={inControl} />
            <Player.SkipEpisodeButton
              inControl={inControl}
              onChange={props.onMetaChange}
            />
            {status === playerStatus.PLAYING ? (
              <>
                <Player.Pip />
                <Player.Airplay />
                <Player.Chromecast />
              </>
            ) : null}
            {status === playerStatus.PLAYBACK_ERROR ||
            status === playerStatus.PLAYING ? (
              <Player.Captions />
            ) : null}
            <Player.Settings />
            {isShifting || isHoldingFullscreen ? (
              <Player.Widescreen />
            ) : (
              <Player.Fullscreen />
            )}
          </div>
        </div>
        <div className="grid grid-cols-[2.5rem,1fr,2.5rem] gap-3 lg:hidden">
          <div />
          <div className="flex justify-center space-x-3">
            {/* Disable PiP for iOS PWA */}
            {!(isPWA && isIOS) && status === playerStatus.PLAYING && (
              <Player.Pip />
            )}
            <Player.Episodes inControl={inControl} />
            {status === playerStatus.PLAYING ? (
              <div className="hidden ssm:block">
                <Player.Captions />
              </div>
            ) : null}
            <Player.Settings />
          </div>
          <div>
            {status === playerStatus.PLAYING && (
              <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="select-none touch-none"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {isHoldingFullscreen ? (
                  <Player.Widescreen />
                ) : (
                  <Player.Fullscreen />
                )}
              </div>
            )}
          </div>
        </div>
      </Player.BottomControls>

      <Player.VolumeChangedPopout />
      <Player.SubtitleDelayPopout />
      <Player.SpeedChangedPopout />
      <Player.TIDBSubmissionSuccessPopout />
      <Player.UnreleasedEpisodeOverlay />

      <Player.NextEpisodeButton
        controlsShowing={showTargets}
        onChange={props.onMetaChange}
        inControl={inControl}
      />

      <SkipSegmentButton
        controlsShowing={showTargets}
        segments={segments}
        inControl={inControl}
        onChangeMeta={props.onMetaChange}
        onSkipTriggered={handleSkipTriggered}
      />

      <ThumbsFeedback
        controlsShowing={showTargets}
        feedbackData={thumbsFeedbackData}
        onAction={handleThumbsFeedback}
      />
    </Player.Container>
  );
}
