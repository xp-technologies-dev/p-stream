import { useCallback } from "react";

import { useCaptions } from "@/components/player/hooks/useCaptions";
import { useVolume } from "@/components/player/hooks/useVolume";
import { useGamepadPlayerActions } from "@/hooks/useGamepadNavigation";
import { usePlayerStore } from "@/stores/player/store";

export function GamepadEvents() {
  const display = usePlayerStore((s) => s.display);
  const mediaPlaying = usePlayerStore((s) => s.mediaPlaying);
  const time = usePlayerStore((s) => s.progress.time);
  const duration = usePlayerStore((s) => s.progress.duration);
  const { setVolume, toggleMute } = useVolume();
  const { toggleLastUsed } = useCaptions();
  const widgetMode = usePlayerStore((s) => s.interface.widgetMode);

  const handleAction = useCallback(
    (action: string) => {
      if (!display) return;
      switch (action) {
        case "play-pause":
          if (mediaPlaying.isPaused) display.play();
          else display.pause();
          break;
        case "skip-forward":
          display.setTime(Math.min(time + 10, duration));
          break;
        case "skip-backward":
          display.setTime(Math.max(time - 10, 0));
          break;
        case "skip-forward-30":
          display.setTime(Math.min(time + 30, duration));
          break;
        case "skip-backward-30":
          display.setTime(Math.max(time - 30, 0));
          break;
        case "volume-up":
          setVolume((mediaPlaying?.volume || 0) + 0.1);
          break;
        case "volume-down":
          setVolume((mediaPlaying?.volume || 0) - 0.1);
          break;
        case "mute":
          toggleMute();
          break;
        case "toggle-fullscreen":
          display.toggleFullscreen();
          break;
        case "toggle-captions":
          toggleLastUsed();
          break;
        default:
          break;
      }
    },
    [
      display,
      mediaPlaying,
      time,
      duration,
      setVolume,
      toggleMute,
      toggleLastUsed,
    ],
  );

  useGamepadPlayerActions(handleAction, !widgetMode);

  return null;
}
