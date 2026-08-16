import { useCallback, useEffect, useRef } from "react";

import { useOverlayStack } from "@/stores/interface/overlayStack";
import { ownsKeyboardInput } from "@/utils/browser/keyboardTarget";

/**
 * Global keyboard event handler that works across the entire application.
 * Handles Escape key to close modals and other global shortcuts.
 */
export function useGlobalKeyboardEvents() {
  const { getTopModal, hideModal, showModal } = useOverlayStack();
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();
  const isKeyHeldRef = useRef<boolean>(false);

  const showKeyboardCommands = useCallback(() => {
    showModal("keyboard-commands");
  }, [showModal]);

  const hideKeyboardCommands = useCallback(() => {
    hideModal("keyboard-commands");
  }, [hideModal]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && ownsKeyboardInput(event.target)) {
        return;
      }

      // Cancel if command or alt is pressed
      if (event.metaKey || event.altKey) return;

      // Handle backtick (`) key hold for keyboard commands
      if (event.key === "`") {
        // Prevent default browser behavior (console opening in some browsers)
        event.preventDefault();

        if (!isKeyHeldRef.current) {
          isKeyHeldRef.current = true;

          // Show modal after 500ms hold
          holdTimeoutRef.current = setTimeout(() => {
            showKeyboardCommands();
          }, 150);
        }
      }

      // Handle Escape key to close modals
      if (event.key === "Escape") {
        const topModal = getTopModal();
        if (topModal) {
          hideModal(topModal);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "`") {
        // Clear the hold timeout if key is released before modal shows
        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = undefined;
        }

        // Hide modal if it was shown
        if (isKeyHeldRef.current) {
          hideKeyboardCommands();
        }

        isKeyHeldRef.current = false;
      }
    };

    // Add event listeners to document for global coverage
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);

      // Clean up any pending timeouts
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
      }
    };
  }, [getTopModal, hideModal, showKeyboardCommands, hideKeyboardCommands]);
}
