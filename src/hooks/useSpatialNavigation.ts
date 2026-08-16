import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

import { useGamepadSeen } from "@/hooks/useGamepad";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { usePreferencesStore } from "@/stores/preferences";
import { isTvBrowser } from "@/utils/browser/tvBrowser";
import { handleActivationKeydown } from "@/utils/navigation/activation";
import {
  isBackKey,
  resolveBack,
  snapshotBackContext,
  BackContext,
} from "@/utils/navigation/back";
import { rememberDescendant } from "@/utils/navigation/containers";
import { handleDropdownKeydown } from "@/utils/navigation/dropdown";
import {
  handleNavigationKeydown,
  isNavSkipped,
} from "@/utils/navigation/engine";
import {
  focusEntryPoint,
  needsEntryPoint,
} from "@/utils/navigation/entryPoint";
import {
  FocusOrigin,
  recoverFocus,
  rememberFocus,
} from "@/utils/navigation/recovery";

const ENTRY_DEADLINE_MS = 500;

function focusedOrigin(): FocusOrigin | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return null;
  if (needsEntryPoint() || isNavSkipped(active)) return null;
  return rememberFocus(active);
}

export function useNavigationEnabled(): boolean {
  const preference = usePreferencesStore((s) => s.spatialNavigation);
  const gamepadSeen = useGamepadSeen();

  return preference === "on" || gamepadSeen || isTvBrowser();
}

export function useSpatialNavigation() {
  const enabled = useNavigationEnabled();
  const location = useLocation();
  const getTopModal = useOverlayStack((s) => s.getTopModal);

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) return;
    const isEnabled = () => enabledRef.current;

    const onWindowKeyDown = (event: KeyboardEvent) => {
      handleNavigationKeydown(event, isEnabled);
    };

    let backContext: BackContext = snapshotBackContext(false);
    const onCaptureKeyDown = (event: KeyboardEvent) => {
      if (handleDropdownKeydown(event, isEnabled)) return;
      if (isBackKey(event)) {
        backContext = snapshotBackContext(getTopModal() !== null);
      }
    };

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (handleActivationKeydown(event, isEnabled)) return;
      if (!isBackKey(event)) return;
      if (!isEnabled()) return;

      if (event.target instanceof Element && isNavSkipped(event.target)) return;

      if (resolveBack(event, backContext) === "history") {
        window.history.back();
      }
    };

    window.addEventListener("keydown", onWindowKeyDown);
    document.addEventListener("keydown", onCaptureKeyDown, true);
    document.addEventListener("keydown", onDocumentKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
      document.removeEventListener("keydown", onCaptureKeyDown, true);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, [enabled, getTopModal]);

  useEffect(() => {
    if (!enabled) return;
    let current: FocusOrigin | null = focusedOrigin();
    // The origin whose survival the next frame has to judge.
    let pending: FocusOrigin | null = null;
    let frame: number | null = null;

    const check = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        const origin = pending;
        pending = null;
        if (origin === null) return;
        if (!needsEntryPoint()) return;
        recoverFocus(origin);
      });
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      const usable = target instanceof HTMLElement && !isNavSkipped(target);
      current = usable ? rememberFocus(target as HTMLElement) : null;
    };

    const onFocusOut = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (isNavSkipped(target)) return;

      pending = rememberFocus(target);
      check();
    };

    const observer = new MutationObserver(() => {
      if (current === null || current.el.isConnected) return;
      pending = current;
      current = null;
      check();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      observer.disconnect();
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement) rememberDescendant(target);
    };

    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const deadline = Date.now() + ENTRY_DEADLINE_MS;
    let frame: number | null = null;

    const attempt = () => {
      frame = null;
      if (!needsEntryPoint()) return;
      if (focusEntryPoint()) return;
      if (Date.now() >= deadline) return;
      frame = requestAnimationFrame(attempt);
    };

    frame = requestAnimationFrame(attempt);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [enabled, location.pathname]);
}
