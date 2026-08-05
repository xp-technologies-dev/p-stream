import { RunOutput } from "@p-stream/providers";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useAsync } from "react-use";

import { getProviders } from "@/backend/providers/providers";
import { DetailedMeta } from "@/backend/metadata/getmeta";
import { usePlayer } from "@/components/player/hooks/usePlayer";
import { usePlayerMeta } from "@/components/player/hooks/usePlayerMeta";
import { convertProviderCaption } from "@/components/player/utils/captions";
import { convertRunoutputToSource } from "@/components/player/utils/convertRunoutputToSource";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { ScrapingItems, ScrapingSegment } from "@/hooks/useProviderScrape";
import { useQueryParam } from "@/hooks/useQueryParams";
import { useRybbitWatchingEvent } from "@/hooks/useRybbitWatchingEvent";
import { MetaPart } from "@/pages/parts/player/MetaPart";
import { PlaybackErrorPart } from "@/pages/parts/player/PlaybackErrorPart";
import { PlayerPart } from "@/pages/parts/player/PlayerPart";
import { ResumePart } from "@/pages/parts/player/ResumePart";
import { ScrapeErrorPart } from "@/pages/parts/player/ScrapeErrorPart";
import { ScrapingPart } from "@/pages/parts/player/ScrapingPart";
import { SourceSelectPart } from "@/pages/parts/player/SourceSelectPart";
import { useLastNonPlayerLink } from "@/stores/history";
import { PlayerMeta, playerStatus } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";
import { getProgressPercentage, useProgressStore } from "@/stores/progress";
import { needsOnboarding } from "@/utils/hosting/onboarding";
import { parseTimestamp } from "@/utils/format/timestamp";

import { BlurEllipsis } from "./layouts/SubPageLayout";

export function RealPlayerView() {
  const navigate = useNavigate();
  const params = useParams<{
    media: string;
    episode?: string;
    season?: string;
  }>();
  const [errorData, setErrorData] = useState<{
    sources: Record<string, ScrapingSegment>;
    sourceOrder: ScrapingItems[];
  } | null>(null);
  const [resumeFromSourceId, setResumeFromSourceId] = useState<string | null>(
    null,
  );
  const storeResumeFromSourceId = usePlayerStore((s) => s.resumeFromSourceId);
  const setResumeFromSourceIdInStore = usePlayerStore(
    (s) => s.setResumeFromSourceId,
  );
  useRybbitWatchingEvent();
  const [startAtParam] = useQueryParam("t");
  const {
    status,
    playMedia,
    reset,
    setScrapeNotFound,
    shouldStartFromBeginning,
    setShouldStartFromBeginning,
    setStatus,
  } = usePlayer();
  const sourceId = usePlayerStore((s) => s.sourceId);
  const { setPlayerMeta, scrapeMedia } = usePlayerMeta();
  const backUrl = useLastNonPlayerLink();
  const manualSourceSelection = usePreferencesStore(
    (s) => s.manualSourceSelection,
  );
  const setLastSuccessfulSource = usePreferencesStore(
    (s) => s.setLastSuccessfulSource,
  );
  const router = useOverlayRouter("settings");
  const openedWatchPartyRef = useRef<boolean>(false);
  const autoResumeCount = useRef(0);
  const progressItems = useProgressStore((s) => s.items);

  // Reset last successful source when leaving the player
  useEffect(() => {
    return () => {
      setLastSuccessfulSource(null);
    };
  }, [setLastSuccessfulSource]);

  // Reset resume from source ID when leaving the player
  useEffect(() => {
    return () => {
      setResumeFromSourceId(null);
      setResumeFromSourceIdInStore(null);
    };
  }, [setResumeFromSourceIdInStore]);

  const paramsData = JSON.stringify({
    media: params.media,
    season: params.season,
    episode: params.episode,
  });
  useEffect(() => {
    reset();
    openedWatchPartyRef.current = false;
    autoResumeCount.current = 0;
    return () => {
      reset();
    };
  }, [paramsData, reset]);

  // Auto-open watch party menu if URL contains watchparty parameter
  useEffect(() => {
    if (openedWatchPartyRef.current) return;

    if (status === playerStatus.PLAYING) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has("watchparty")) {
        setTimeout(() => {
          router.navigate("/watchparty");
          openedWatchPartyRef.current = true;
        }, 1000);
      }
    }
  }, [status, router]);

  const metaChange = useCallback(
    (meta: PlayerMeta) => {
      if (meta?.type === "show")
        navigate(
          `/media/${params.media}/${meta.season?.tmdbId}/${meta.episode?.tmdbId}`,
        );
      else navigate(`/media/${params.media}`);
    },
    [navigate, params],
  );

  // Check if episode is more than 80% watched
  const shouldShowResumeScreen = useCallback(
    (meta: PlayerMeta) => {
      if (!meta?.tmdbId) return false;

      const item = progressItems[meta.tmdbId];
      if (!item) return false;

      if (meta.type === "movie") {
        if (!item.progress) return false;
        const percentage = getProgressPercentage(
          item.progress.watched,
          item.progress.duration,
        );
        return percentage > 80;
      }

      if (meta.type === "show" && meta.episode?.tmdbId) {
        const episode = item.episodes?.[meta.episode.tmdbId];
        if (!episode) return false;
        const percentage = getProgressPercentage(
          episode.progress.watched,
          episode.progress.duration,
        );
        return percentage > 80;
      }

      return false;
    },
    [progressItems],
  );

  const handleMetaReceived = useCallback(
    (detailedMeta: DetailedMeta, episodeId?: string) => {
      const playerMeta = setPlayerMeta(detailedMeta, episodeId);
      if (playerMeta && shouldShowResumeScreen(playerMeta)) {
        setStatus(playerStatus.RESUME);
      }
    },
    [shouldShowResumeScreen, setStatus, setPlayerMeta],
  );

  const handleResume = useCallback(() => {
    setStatus(playerStatus.SCRAPING);
  }, [setStatus]);

  const handleRestart = useCallback(() => {
    setShouldStartFromBeginning(true);
    setStatus(playerStatus.SCRAPING);
  }, [setShouldStartFromBeginning, setStatus]);

  const handleResumeScraping = useCallback(
    (startFromSourceId: string) => {
      autoResumeCount.current += 1;
      setResumeFromSourceId(startFromSourceId);
      setResumeFromSourceIdInStore(startFromSourceId);
      setTimeout(() => {
        setStatus(playerStatus.SCRAPING);
      }, 0);
    },
    [setStatus, setResumeFromSourceIdInStore],
  );

  // Sync store value to local state when it changes (e.g., from settings)
  // or when status changes to SCRAPING
  useEffect(() => {
    if (storeResumeFromSourceId && status === playerStatus.SCRAPING) {
      if (
        !resumeFromSourceId ||
        resumeFromSourceId !== storeResumeFromSourceId
      ) {
        setResumeFromSourceId(storeResumeFromSourceId);
      }
    }
  }, [storeResumeFromSourceId, resumeFromSourceId, status]);

  const playAfterScrape = useCallback(
    (out: RunOutput | null) => {
      if (!out) return;

      autoResumeCount.current = 0;

      let startAt: number | undefined;
      if (startAtParam) startAt = parseTimestamp(startAtParam) ?? undefined;

      playMedia(
        convertRunoutputToSource(out),
        convertProviderCaption(out.stream.captions),
        out.sourceId,
        shouldStartFromBeginning ? 0 : startAt,
      );
      setShouldStartFromBeginning(false);
    },
    [
      playMedia,
      startAtParam,
      shouldStartFromBeginning,
      setShouldStartFromBeginning,
    ],
  );

  return (
    <PlayerPart backUrl={backUrl} onMetaChange={metaChange}>
      {status !== playerStatus.PLAYING ? <BlurEllipsis /> : null}
      {status === playerStatus.IDLE ? (
        <MetaPart onGetMeta={handleMetaReceived} />
      ) : null}
      {status === playerStatus.RESUME ? (
        <ResumePart
          onResume={handleResume}
          onRestart={handleRestart}
          onMetaChange={metaChange}
        />
      ) : null}
      {status === playerStatus.SCRAPING && scrapeMedia ? (
        manualSourceSelection ? (
          <SourceSelectPart media={scrapeMedia} />
        ) : (
          <ScrapingPart
            key={`scraping-${resumeFromSourceId || storeResumeFromSourceId || "default"}`}
            media={scrapeMedia}
            startFromSourceId={
              resumeFromSourceId || storeResumeFromSourceId || undefined
            }
            onResult={(sources, sourceOrder) => {
              setErrorData({
                sourceOrder,
                sources,
              });
              setScrapeNotFound();
              // Clear resume state after scraping
              setResumeFromSourceId(null);
              setResumeFromSourceIdInStore(null);
            }}
            onGetStream={playAfterScrape}
          />
        )
      ) : null}
      {status === playerStatus.SCRAPE_NOT_FOUND && errorData ? (
        <ScrapeErrorPart data={errorData} />
      ) : null}
      {status === playerStatus.PLAYBACK_ERROR ? (
        <PlaybackErrorPart
          onResume={handleResumeScraping}
          currentSourceId={sourceId}
          autoResumeExhausted={autoResumeCount.current >= getProviders().listSources().length}
        />
      ) : null}
    </PlayerPart>
  );
}

export function PlayerView() {
  const loc = useLocation();
  const { loading, error, value } = useAsync(() => {
    return needsOnboarding();
  });

  if (error) throw new Error("Failed to detect onboarding");
  if (loading) return null;
  if (value)
    return (
      <Navigate
        replace
        to={{
          pathname: "/onboarding",
          search: `redirect=${encodeURIComponent(loc.pathname)}`,
        }}
      />
    );
  return <RealPlayerView />;
}

export default PlayerView;
