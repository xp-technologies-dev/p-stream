import classNames from "classnames";
import FocusTrap from "focus-trap-react";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Transition } from "@/components/utils/Transition";
import {
  useInternalOverlayRouter,
  useRouterAnchorUpdate,
} from "@/hooks/useOverlayRouter";
import { pushScope } from "@/utils/browser/focusScopes";
import { resolveEntryPoint } from "@/utils/navigation/entryPoint";

export interface OverlayProps {
  id: string;
  children?: ReactNode;
  darken?: boolean;
}

export function OverlayDisplay(props: { children: ReactNode }) {
  const router = useInternalOverlayRouter("hello world :)");
  const refRouter = useRef(router);

  // close router on first mount, we dont want persist routes for overlays
  useEffect(() => {
    const r = refRouter.current;
    r.close();
    return () => {
      r.close();
    };
  }, []);
  return <div className="popout-location">{props.children}</div>;
}

export function OverlayPortal(props: {
  children?: ReactNode;
  darken?: boolean;
  show?: boolean;
  close?: () => void;
  durationClass?: string;
  zIndex?: number;
}) {
  const [portalElement, setPortalElement] = useState<Element | null>(null);
  const [isReady, setIsReady] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [wrapper, setWrapperState] = useState<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const close = props.close;
  const zIndex = props.zIndex ?? 999;

  const setWrapper = useCallback((el: HTMLDivElement | null) => {
    wrapperRef.current = el;
    setWrapperState(el);
  }, []);

  const initialFocus = useCallback(() => {
    const el = wrapperRef.current;
    if (el === null) return spacerRef.current ?? false;
    return resolveEntryPoint(el) ?? spacerRef.current ?? false;
  }, []);

  useEffect(() => {
    if (!wrapper) return;
    if (!props.show) {
      wrapper.setAttribute("data-nav-skip", "");
      return;
    }
    wrapper.removeAttribute("data-nav-skip");
    return pushScope(wrapper);
  }, [props.show, wrapper]);

  useEffect(() => {
    const element = ref.current?.closest(".popout-location");
    setPortalElement(element ?? document.body);
  }, []);

  useEffect(() => {
    if (!props.show) {
      setIsReady(false);
      return;
    }
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, [props.show]);

  // Add global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason &&
        typeof event.reason === "object" &&
        "message" in event.reason
      ) {
        const message = event.reason.message;
        if (
          message &&
          typeof message === "string" &&
          message.includes("matches.call")
        ) {
          console.warn(
            "Caught focus-trap matches.call error, preventing crash:",
            event.reason,
          );
          event.preventDefault();
        }
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () =>
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
  }, []);

  return (
    <div ref={ref}>
      {portalElement
        ? createPortal(
            <Transition show={props.show} animation="none">
              <FocusTrap
                active={isReady && !!props.show}
                focusTrapOptions={{
                  allowOutsideClick: true,
                  clickOutsideDeactivates: true,
                  initialFocus,
                  fallbackFocus: () => document.body,
                  returnFocusOnDeactivate: true,
                  escapeDeactivates: false, // Let our keyboard handler manage escape
                  preventScroll: true,
                  // Disable the problematic check that causes the matches.call error
                  checkCanFocusTrap: () => Promise.resolve(),
                }}
              >
                <div
                  ref={setWrapper}
                  className="popout-wrapper fixed overflow-hidden pointer-events-auto inset-0 select-none"
                  style={{ zIndex }}
                >
                  <Transition animation="fade" isChild>
                    <div
                      onClick={close}
                      className={classNames({
                        "absolute inset-0": true,
                        "bg-black opacity-90": props.darken,
                      })}
                    />
                  </Transition>
                  <Transition
                    animation="slide-up"
                    className="absolute inset-0 pointer-events-none"
                    isChild
                    durationClass={props.durationClass ?? "duration-200"}
                  >
                    {/* a tabable index that does nothing - used so focus trap doesn't error when nothing is rendered yet */}
                    <div
                      ref={spacerRef}
                      tabIndex={0}
                      className="focus:ring-0 focus:outline-none opacity-0"
                    />
                    {props.children}
                  </Transition>
                </div>
              </FocusTrap>
            </Transition>,
            portalElement,
          )
        : null}
    </div>
  );
}

export function Overlay(props: OverlayProps) {
  const router = useInternalOverlayRouter(props.id);
  const realClose = router.close;

  // listen for anchor updates
  useRouterAnchorUpdate(props.id);

  const close = useCallback(() => {
    realClose();
  }, [realClose]);

  return (
    <OverlayPortal
      close={close}
      show={router.isOverlayActive()}
      darken={props.darken}
    >
      {props.children}
    </OverlayPortal>
  );
}
