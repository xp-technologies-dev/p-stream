import { RefObject, useEffect, useRef } from "react";

import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { useNavigationEnabled } from "@/hooks/useSpatialNavigation";
import { usePlayerStore } from "@/stores/player/store";
import { ownsKeyboardInput } from "@/utils/browser/keyboardTarget";
import { directionForKey, focusCandidate } from "@/utils/navigation/engine";
import { resolveEntryPoint } from "@/utils/navigation/entryPoint";
import {
  canEnterWidgetMode,
  canEnterWidgetModeByArrow,
  isWidgetArrowEntry,
  isWidgetEntryKey,
  isWidgetExitKey,
  WIDGET_IDLE_MS,
} from "@/utils/navigation/playerMode";

const ENTRY_DEADLINE_MS = 500;

export function usePlayerWidgetMode(
  containerEl: RefObject<HTMLElement | null>,
): boolean {
  const enabled = useNavigationEnabled();
  const widgetMode = usePlayerStore((s) => s.interface.widgetMode);
  const setWidgetMode = usePlayerStore((s) => s.setWidgetMode);
  const hasOpenOverlay = usePlayerStore((s) => s.interface.hasOpenOverlay);
  const router = useOverlayRouter("");

  const popoutOpen = router.isRouterActive || hasOpenOverlay;
  const active = enabled && widgetMode;

  const stateRef = useRef({ active, popoutOpen, router });
  stateRef.current = { active, popoutOpen, router };

  useEffect(() => {
    if (!enabled) return;

    const onKeyDownCapture = (event: KeyboardEvent) => {
      const state = stateRef.current;

      if (!state.active) {
        if (isWidgetEntryKey(event)) {
          if (ownsKeyboardInput(event.target)) return;
          if (!canEnterWidgetMode()) return;
          event.preventDefault();
          setWidgetMode(true);
          return;
        }

        if (!isWidgetArrowEntry(event)) return;
        const direction = directionForKey(event) ?? undefined;
        if (
          !canEnterWidgetModeByArrow(
            event.target,
            containerEl.current,
            direction,
          )
        ) {
          return;
        }
        event.preventDefault();
        setWidgetMode(true);
        return;
      }

      if (!isWidgetExitKey(event)) return;

      event.preventDefault();
      if (state.router.isRouterActive) {
        state.router.close();
        return;
      }
      if (state.popoutOpen) return;
      setWidgetMode(false);
    };

    document.addEventListener("keydown", onKeyDownCapture, true);
    return () =>
      document.removeEventListener("keydown", onKeyDownCapture, true);
  }, [enabled, setWidgetMode, containerEl]);

  useEffect(() => {
    if (!active) return;
    const deadline = Date.now() + ENTRY_DEADLINE_MS;
    let frame: number | null = null;

    const attempt = () => {
      frame = null;
      const root = containerEl.current;
      if (root !== null) {
        const target = resolveEntryPoint(root);
        if (target !== null && focusCandidate(target)) return;
      }
      if (Date.now() >= deadline) return;
      frame = requestAnimationFrame(attempt);
    };

    attempt();
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [active, containerEl]);

  useEffect(() => {
    if (active) return;
    const el = document.activeElement;
    if (el instanceof HTMLElement && containerEl.current?.contains(el)) {
      el.blur();
    }
  }, [active, containerEl]);

  useEffect(() => {
    if (!active || popoutOpen) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const arm = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setWidgetMode(false), WIDGET_IDLE_MS);
    };

    arm();
    document.addEventListener("keydown", arm);
    return () => {
      document.removeEventListener("keydown", arm);
      if (timer) clearTimeout(timer);
    };
  }, [active, popoutOpen, setWidgetMode]);

  useEffect(() => {
    return () => setWidgetMode(false);
  }, [setWidgetMode]);

  return active;
}
