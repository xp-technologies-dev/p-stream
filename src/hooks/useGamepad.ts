import { useCallback, useEffect, useRef, useState } from "react";

export function useGamepadSeen(): boolean {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const onConnected = () => setSeen(true);
    window.addEventListener("gamepadconnected", onConnected);
    return () => window.removeEventListener("gamepadconnected", onConnected);
  }, []);

  return seen;
}

export interface GamepadMapping {
  // D-pad
  dpadUp: string;
  dpadDown: string;
  dpadLeft: string;
  dpadRight: string;
  // Face buttons (Xbox: A/B/X/Y, PS: Cross/Circle/Square/Triangle)
  actionSouth: string; // A / Cross - confirm/play-pause
  actionEast: string; // B / Circle - back
  actionWest: string; // X / Square
  actionNorth: string; // Y / Triangle
  // Bumpers/triggers
  leftBumper: string;
  rightBumper: string;
  leftTrigger: string;
  rightTrigger: string;
  // Special
  start: string;
  select: string;
}

export const DEFAULT_GAMEPAD_MAPPING: GamepadMapping = {
  dpadUp: "navigate-up",
  dpadDown: "navigate-down",
  dpadLeft: "navigate-left",
  dpadRight: "navigate-right",
  actionSouth: "confirm",
  actionEast: "back",
  actionWest: "toggle-fullscreen",
  actionNorth: "toggle-captions",
  leftBumper: "skip-backward",
  rightBumper: "skip-forward",
  leftTrigger: "volume-down",
  rightTrigger: "volume-up",
  start: "play-pause",
  select: "mute",
};

export const DEFAULT_PLAYER_GAMEPAD_MAPPING: GamepadMapping = {
  dpadUp: "volume-up",
  dpadDown: "volume-down",
  dpadLeft: "skip-backward",
  dpadRight: "skip-forward",
  actionSouth: "play-pause",
  actionEast: "back",
  actionWest: "toggle-fullscreen",
  actionNorth: "toggle-captions",
  leftBumper: "previous-episode",
  rightBumper: "next-episode",
  leftTrigger: "skip-backward-30",
  rightTrigger: "skip-forward-30",
  start: "play-pause",
  select: "mute",
};

// Standard gamepad button indices
const BUTTON_MAP = {
  ACTION_SOUTH: 0, // A / Cross
  ACTION_EAST: 1, // B / Circle
  ACTION_WEST: 2, // X / Square
  ACTION_NORTH: 3, // Y / Triangle
  LEFT_BUMPER: 4,
  RIGHT_BUMPER: 5,
  LEFT_TRIGGER: 6,
  RIGHT_TRIGGER: 7,
  SELECT: 8,
  START: 9,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
};

interface GamepadCallbacks {
  onAction: (action: string) => void;
  enabled: boolean;
}

export function resolveGamepadMapping(
  saved: Record<string, string>,
  transport: boolean,
): GamepadMapping {
  const keys = Object.keys(DEFAULT_GAMEPAD_MAPPING) as (keyof GamepadMapping)[];
  if (!transport) {
    const general = { ...DEFAULT_GAMEPAD_MAPPING };
    keys.forEach((k) => {
      if (saved[k]) general[k] = saved[k];
    });
    return general;
  }

  const player = { ...DEFAULT_PLAYER_GAMEPAD_MAPPING };
  keys.forEach((k) => {
    if (saved[k] && saved[k] !== DEFAULT_GAMEPAD_MAPPING[k])
      player[k] = saved[k];
  });
  return player;
}

export function useGamepadPolling({ onAction, enabled }: GamepadCallbacks) {
  const prevButtonStates = useRef<Record<number, Record<number, boolean>>>({});
  const animFrameRef = useRef<number | null>(null);
  const onActionRef = useRef(onAction);
  const enabledRef = useRef(enabled);
  const mappingRef = useRef<GamepadMapping>(DEFAULT_GAMEPAD_MAPPING);

  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const setMapping = useCallback((mapping: GamepadMapping) => {
    mappingRef.current = mapping;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const buttonToAction: Record<number, keyof GamepadMapping> = {
      [BUTTON_MAP.ACTION_SOUTH]: "actionSouth",
      [BUTTON_MAP.ACTION_EAST]: "actionEast",
      [BUTTON_MAP.ACTION_WEST]: "actionWest",
      [BUTTON_MAP.ACTION_NORTH]: "actionNorth",
      [BUTTON_MAP.LEFT_BUMPER]: "leftBumper",
      [BUTTON_MAP.RIGHT_BUMPER]: "rightBumper",
      [BUTTON_MAP.LEFT_TRIGGER]: "leftTrigger",
      [BUTTON_MAP.RIGHT_TRIGGER]: "rightTrigger",
      [BUTTON_MAP.SELECT]: "select",
      [BUTTON_MAP.START]: "start",
      [BUTTON_MAP.DPAD_UP]: "dpadUp",
      [BUTTON_MAP.DPAD_DOWN]: "dpadDown",
      [BUTTON_MAP.DPAD_LEFT]: "dpadLeft",
      [BUTTON_MAP.DPAD_RIGHT]: "dpadRight",
    };

    const poll = () => {
      if (!enabledRef.current) return;

      const gamepads = navigator.getGamepads?.();
      if (!gamepads) {
        animFrameRef.current = requestAnimationFrame(poll);
        return;
      }

      const live: Record<number, true> = {};

      for (const gp of gamepads) {
        if (!gp) continue;
        live[gp.index] = true;

        const prev = prevButtonStates.current[gp.index] ?? {};
        prevButtonStates.current[gp.index] = prev;

        for (const [btnIdx, mappingKey] of Object.entries(buttonToAction)) {
          const idx = Number(btnIdx);
          const button = gp.buttons[idx];
          if (!button) continue;

          const isPressed = button.pressed || button.value > 0.5;
          const wasPressed = prev[idx] ?? false;

          // Only fire on button down (not held)
          if (isPressed && !wasPressed) {
            const action = mappingRef.current[mappingKey];
            if (action) {
              onActionRef.current(action);
            }
          }

          prev[idx] = isPressed;
        }
      }

      for (const seen of Object.keys(prevButtonStates.current)) {
        if (!live[Number(seen)]) delete prevButtonStates.current[Number(seen)];
      }

      animFrameRef.current = requestAnimationFrame(poll);
    };

    animFrameRef.current = requestAnimationFrame(poll);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [enabled]);

  return { setMapping };
}

export const GAMEPAD_ACTION_LABELS: Record<string, string> = {
  "navigate-up": "Navigate Up",
  "navigate-down": "Navigate Down",
  "navigate-left": "Navigate Left",
  "navigate-right": "Navigate Right",
  confirm: "Confirm / Select",
  back: "Go Back",
  "play-pause": "Play / Pause",
  "skip-forward": "Skip Forward (+10s)",
  "skip-backward": "Skip Backward (-10s)",
  "skip-forward-30": "Skip Forward (+30s)",
  "skip-backward-30": "Skip Backward (-30s)",
  "volume-up": "Volume Up",
  "volume-down": "Volume Down",
  mute: "Mute / Unmute",
  "toggle-fullscreen": "Toggle Fullscreen",
  "toggle-captions": "Toggle Captions",
  "next-episode": "Next Episode",
  "previous-episode": "Previous Episode",
};

export const GAMEPAD_BUTTON_LABELS: Record<
  keyof GamepadMapping,
  { xbox: string; ps: string }
> = {
  dpadUp: { xbox: "D-Pad ↑", ps: "D-Pad ↑" },
  dpadDown: { xbox: "D-Pad ↓", ps: "D-Pad ↓" },
  dpadLeft: { xbox: "D-Pad ←", ps: "D-Pad ←" },
  dpadRight: { xbox: "D-Pad →", ps: "D-Pad →" },
  actionSouth: { xbox: "A", ps: "✕" },
  actionEast: { xbox: "B", ps: "○" },
  actionWest: { xbox: "X", ps: "□" },
  actionNorth: { xbox: "Y", ps: "△" },
  leftBumper: { xbox: "LB", ps: "L1" },
  rightBumper: { xbox: "RB", ps: "R1" },
  leftTrigger: { xbox: "LT", ps: "L2" },
  rightTrigger: { xbox: "RT", ps: "R2" },
  start: { xbox: "Menu", ps: "Options" },
  select: { xbox: "View", ps: "Share" },
};

export const ALL_GAMEPAD_ACTIONS = Object.keys(GAMEPAD_ACTION_LABELS);
