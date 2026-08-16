import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { Dropdown } from "@/components/form/Dropdown";
import { Icon, Icons } from "@/components/Icon";
import { Modal, ModalCard, useModal } from "@/components/overlays/Modal";
import { Heading2 } from "@/components/utils/Text";
import {
  ALL_GAMEPAD_ACTIONS,
  DEFAULT_GAMEPAD_MAPPING,
  GAMEPAD_ACTION_LABELS,
  GAMEPAD_BUTTON_LABELS,
  GamepadMapping,
} from "@/hooks/useGamepad";
import { usePreferencesStore } from "@/stores/preferences";

interface GamepadControlsModalProps {
  id: string;
}

type ControllerType = "xbox" | "ps";

function ButtonBadge({
  label,
  hasConflict,
}: {
  label: string;
  hasConflict?: boolean;
}) {
  return (
    <kbd
      className={`
        inline-flex items-center justify-center min-w-[2.5rem] h-8 px-2 text-sm font-mono rounded border shadow-sm
        ${hasConflict ? "border-red-500 bg-red-900/20 text-red-300" : "border-gray-600 bg-gray-800 text-gray-200"}
      `}
    >
      {label}
    </kbd>
  );
}

export function GamepadControlsModal({ id }: GamepadControlsModalProps) {
  const { t } = useTranslation();
  const modal = useModal(id);
  const gamepadMapping = usePreferencesStore((s) => s.gamepadMapping);
  const setGamepadMapping = usePreferencesStore((s) => s.setGamepadMapping);

  const currentMapping: GamepadMapping = useMemo(
    () => ({
      ...DEFAULT_GAMEPAD_MAPPING,
      ...gamepadMapping,
    }),
    [gamepadMapping],
  );

  const [editingMapping, setEditingMapping] =
    useState<GamepadMapping>(currentMapping);
  const [controllerType, setControllerType] = useState<ControllerType>("xbox");

  const actionOptions = ALL_GAMEPAD_ACTIONS.map((action) => ({
    id: action,
    name: GAMEPAD_ACTION_LABELS[action] || action,
  }));

  const handleSave = useCallback(() => {
    setGamepadMapping(editingMapping as unknown as Record<string, string>);
    modal.hide();
  }, [editingMapping, setGamepadMapping, modal]);

  const handleCancel = useCallback(() => {
    setEditingMapping(currentMapping);
    modal.hide();
  }, [currentMapping, modal]);

  const handleResetAll = useCallback(() => {
    setEditingMapping(DEFAULT_GAMEPAD_MAPPING);
  }, []);

  const buttonGroups = [
    {
      title: "D-Pad",
      buttons: [
        "dpadUp",
        "dpadDown",
        "dpadLeft",
        "dpadRight",
      ] as (keyof GamepadMapping)[],
    },
    {
      title: "Face Buttons",
      buttons: [
        "actionSouth",
        "actionEast",
        "actionWest",
        "actionNorth",
      ] as (keyof GamepadMapping)[],
    },
    {
      title: "Bumpers & Triggers",
      buttons: [
        "leftBumper",
        "rightBumper",
        "leftTrigger",
        "rightTrigger",
      ] as (keyof GamepadMapping)[],
    },
    {
      title: "System",
      buttons: ["start", "select"] as (keyof GamepadMapping)[],
    },
  ];

  // Check for duplicate actions
  const actionCounts: Record<string, number> = {};
  Object.values(editingMapping).forEach((action) => {
    actionCounts[action] = (actionCounts[action] || 0) + 1;
  });

  return (
    <Modal id={id}>
      <ModalCard className="!max-w-2xl">
        <div className="space-y-6">
          <div className="text-center">
            <Heading2 className="!mt-0 !mb-2">
              {t("settings.preferences.gamepadControls", "Controller Controls")}
            </Heading2>
            <p className="text-type-secondary text-sm">
              {t(
                "settings.preferences.gamepadControlsDescription",
                "Configure your Xbox or PlayStation controller button mappings",
              )}
            </p>
            <p className="text-type-secondary text-sm mt-2">
              {t(
                "settings.preferences.gamepadControlsNavigationNote",
                "The D-pad moves focus around the app and Confirm activates whatever is focused. Inside the player the D-pad drives playback instead, so assign a spare button to Confirm if you want to reach the player's controls with the stick.",
              )}
            </p>
          </div>

          {/* Controller type toggle */}
          <div className="flex justify-center gap-3">
            <Button
              theme={controllerType === "xbox" ? "purple" : "secondary"}
              onClick={() => setControllerType("xbox")}
              className="px-4 py-2"
            >
              Xbox
            </Button>
            <Button
              theme={controllerType === "ps" ? "purple" : "secondary"}
              onClick={() => setControllerType("ps")}
              className="px-4 py-2"
            >
              PlayStation
            </Button>
          </div>

          <div className="flex justify-end">
            <Button theme="secondary" onClick={handleResetAll}>
              <Icon icon={Icons.RELOAD} className="mr-2" />
              {t(
                "global.keyboardShortcuts.resetAllToDefault",
                "Reset All to Default",
              )}
            </Button>
          </div>

          <div className="space-y-6 max-h-[60vh] overflow-y-auto">
            {buttonGroups.map((group) => (
              <div key={group.title} className="space-y-3">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.buttons.map((btnKey) => {
                    const currentAction = editingMapping[btnKey];
                    const hasDuplicate = (actionCounts[currentAction] || 0) > 1;
                    const label = GAMEPAD_BUTTON_LABELS[btnKey];

                    return (
                      <div
                        key={btnKey}
                        className="flex items-center justify-between py-1"
                      >
                        <div className="flex items-center gap-3">
                          <ButtonBadge
                            label={
                              controllerType === "xbox" ? label.xbox : label.ps
                            }
                            hasConflict={hasDuplicate}
                          />
                        </div>
                        <div className="flex-1 ml-4">
                          <Dropdown
                            selectedItem={
                              actionOptions.find(
                                (opt) => opt.id === currentAction,
                              ) || actionOptions[0]
                            }
                            setSelectedItem={(item) =>
                              setEditingMapping((prev) => ({
                                ...prev,
                                [btnKey]: item.id,
                              }))
                            }
                            options={actionOptions}
                            className="w-full !my-0"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <Button theme="secondary" onClick={handleCancel}>
              {t("global.keyboardShortcuts.cancel", "Cancel")}
            </Button>
            <Button theme="purple" onClick={handleSave}>
              {t("global.keyboardShortcuts.saveChanges", "Save Changes")}
            </Button>
          </div>
        </div>
      </ModalCard>
    </Modal>
  );
}
