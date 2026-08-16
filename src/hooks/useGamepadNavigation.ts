import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

import {
  resolveGamepadMapping,
  useGamepadPolling,
  useGamepadSeen,
} from "@/hooks/useGamepad";
import { usePreferencesStore } from "@/stores/preferences";
import { noteKeyModality } from "@/utils/browser/inputModality";
import { dispatchGamepadAction } from "@/utils/navigation/gamepadActions";

type ActionHandler = (action: string) => void;

let playerAction: ActionHandler | null = null;
let transportActive = false;
const subscribers = new Set<() => void>();

function emit() {
  subscribers.forEach((fn) => fn());
}

function subscribeTransport(fn: () => void) {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

function isTransportActive() {
  return transportActive;
}

export function useGamepadPlayerActions(
  onAction: ActionHandler,
  transport: boolean,
) {
  const handlerRef = useRef(onAction);
  handlerRef.current = onAction;

  useEffect(() => {
    playerAction = (action) => handlerRef.current(action);
    return () => {
      playerAction = null;
    };
  }, []);

  useEffect(() => {
    transportActive = transport;
    emit();
    return () => {
      transportActive = false;
      emit();
    };
  }, [transport]);
}

/** Mounts the gamepad adapter. Call once, from `App`. */
export function useGamepadNavigation() {
  const preference = usePreferencesStore((s) => s.enableGamepadControls);
  const saved = usePreferencesStore((s) => s.gamepadMapping);
  const gamepadSeen = useGamepadSeen();

  const enabled = preference || gamepadSeen;
  const transport = useSyncExternalStore(
    subscribeTransport,
    isTransportActive,
    () => false,
  );

  const mapping = useMemo(
    () => resolveGamepadMapping(saved, transport),
    [saved, transport],
  );

  const onAction = useCallback((action: string) => {
    noteKeyModality();

    if (dispatchGamepadAction(action)) return;
    playerAction?.(action);
  }, []);

  const { setMapping } = useGamepadPolling({ onAction, enabled });

  useEffect(() => {
    setMapping(mapping);
  }, [mapping, setMapping]);
}
