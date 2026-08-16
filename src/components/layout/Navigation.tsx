import classNames from "classnames";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, To, useNavigate } from "react-router-dom";

import { NoUserAvatar, UserAvatar } from "@/components/Avatar";
import { IconPatch } from "@/components/buttons/IconPatch";
import { Icon, Icons } from "@/components/Icon";
import { LinksDropdown } from "@/components/layout/LinksDropdown";
import { useDownloadModal } from "@/components/overlays/downloadModal";
import { useNotifications } from "@/components/overlays/notificationsModal";
import { useTipJar } from "@/components/overlays/tipJarModal";
import { Lightbar } from "@/components/utils/Lightbar";
import { Transition } from "@/components/utils/Transition";
import { useAuth } from "@/hooks/auth/useAuth";
import { BlurEllipsis } from "@/pages/layouts/SubPageLayout";
import { conf } from "@/setup/config";
import { useBannerSize } from "@/stores/banner";
import { usePreferencesStore } from "@/stores/preferences";

import { HomeSectionCustomizer } from "@/pages/parts/home/HomeSectionCustomizer";

import { BrandPill } from "./BrandPill";

function HomeLayoutCustomizerToggle() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Only show on the exact home page path
  if (window.location.pathname !== "/") return null;
  
  return (
    <div className="relative">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center h-10 rounded-full transition-all duration-300 ease-out overflow-hidden ${
          isOpen
            ? "bg-type-link text-white shadow-lg pr-4"
            : "bg-pill-background bg-opacity-50 text-white hover:bg-pill-backgroundHover hover:bg-opacity-100 hover:pr-4 active:scale-105"
        }`}
        title="Edit Layout"
      >
        <div className="flex items-center justify-center w-10 h-10 shrink-0">
          <Icon icon={Icons.LAYOUT} className="text-xl" />
        </div>
        <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 ease-out ${
          isOpen
            ? "max-w-[100px] opacity-100"
            : "max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100"
        }`}>
          Layout
        </span>
      </button>
      <HomeSectionCustomizer 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </div>
  );
}

function MobileMenuLink(props: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
}) {
  const className =
    "w-full text-left tabbable cursor-pointer flex gap-3 items-center mx-2 my-0.5 p-2 rounded font-medium text-dropdown-text hover:text-white transition-colors duration-100";

  if (props.href) {
    return (
      <a
        href={props.href}
        target="_blank"
        rel="noreferrer"
        className={className}
        onClick={props.onClick}
      >
        {props.children}
        {props.badge}
      </a>
    );
  }

  return (
    <button type="button" onClick={props.onClick} className={className}>
      {props.children}
      {props.badge}
    </button>
  );
}

function MobileActionsMenu(props: {
  openDownloadModal: () => void;
  openNotifications: () => void;
  openTipJar: () => void;
  unreadCount: number | string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onWindowClick(evt: MouseEvent) {
      if ((evt.target as HTMLElement).closest(".is-mobile-menu")) return;
      setOpen(false);
    }
    window.addEventListener("click", onWindowClick);
    return () => window.removeEventListener("click", onWindowClick);
  }, []);

  const shouldShowBadge =
    typeof props.unreadCount === "number"
      ? props.unreadCount > 0
      : props.unreadCount === "99+";

  return (
    <div
      className="relative is-mobile-menu lg:hidden"
      onKeyDown={(evt) => {
        if (evt.key !== "Escape" || !open) return;
        evt.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xl text-white tabbable rounded-full backdrop-blur-lg relative block"
        title="Menu"
      >
        <IconPatch icon={Icons.MENU} clickable downsized navigation />
        {shouldShowBadge ? (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] aspect-square flex items-center justify-center">
            {props.unreadCount}
          </span>
        ) : null}
      </button>
      <Transition animation="slide-down" show={open}>
        <div
          data-nav-scope
          className="absolute left-0 top-full mt-3 z-50 w-56 rounded-xl bg-dropdown-altBackground py-2 shadow-lg ring-1 ring-white/10"
        >
          <MobileMenuLink href={conf().DISCORD_LINK}>
            <Icon icon={Icons.DISCORD} className="text-xl" />
            Discord
          </MobileMenuLink>
          <MobileMenuLink
            onClick={() => {
              setOpen(false);
              props.openDownloadModal();
            }}
          >
            <Icon icon={Icons.DOWNLOAD} className="text-xl" />
            Download
          </MobileMenuLink>
          <MobileMenuLink
            onClick={() => {
              setOpen(false);
              props.openNotifications();
            }}
            badge={
              shouldShowBadge ? (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full min-w-[16px] px-1 aspect-square flex items-center justify-center">
                  {props.unreadCount}
                </span>
              ) : null
            }
          >
            <Icon icon={Icons.BELL} className="text-xl" />
            Notifications
          </MobileMenuLink>
          <MobileMenuLink
            onClick={() => {
              setOpen(false);
              props.openTipJar();
            }}
          >
            <Icon icon={Icons.TIP_JAR} className="text-xl" />
            Tip Jar
          </MobileMenuLink>
          <div className="mx-2 mt-1">
            <HomeLayoutCustomizerToggle />
          </div>
        </div>
      </Transition>
    </div>
  );
}

export interface NavigationProps {
  bg?: boolean;
  noLightbar?: boolean;
  doBackground?: boolean;
  clearBackground?: boolean;
  centerSlot?: ReactNode;
}

export function Navigation(props: NavigationProps) {
  const bannerHeight = useBannerSize();
  const navigate = useNavigate();
  const { loggedIn } = useAuth();
  const [scrollPosition, setScrollPosition] = useState(0);
  const { openNotifications, getUnreadCount } = useNotifications();
  const { openTipJar } = useTipJar();
  const { openDownloadModal } = useDownloadModal();

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = (path: To) => {
    window.scrollTo(0, 0);
    navigate(path);
  };


  const getMaskLength = () => {
    
    const maxScroll = 300;
    const minLength = 100;
    const maxLength = 180;
    const scrollFactor = Math.min(scrollPosition, maxScroll) / maxScroll;
    return minLength + (maxLength - minLength) * (1 - scrollFactor);
  };

  const enableLowPerformanceMode = usePreferencesStore(
    (s) => s.enableLowPerformanceMode,
  );

  return (
    <>
      {/* lightbar */}
      {!props.noLightbar ? (
        <div
          className="absolute inset-x-0 top-0 flex h-[88px] items-center justify-center"
          style={{
            top: `${bannerHeight}px`,
          }}
        >
          <div className="absolute inset-x-0 -mt-[22%] flex items-center sm:mt-0">
            <Lightbar noParticles={enableLowPerformanceMode} />
          </div>
        </div>
      ) : null}

      {/* backgrounds - these are seperate because of z-index issues */}
      <div
        className="top-content fixed z-[20] pointer-events-none left-0 right-0 top-0 min-h-[150px]"
        style={{
          top: `${bannerHeight}px`,
        }}
      >
        <div
          className={classNames(
            "fixed left-0 right-0 top-0 flex items-center", // border-b border-utils-divider border-opacity-50
            "transition-[background-color,backdrop-filter] duration-300 ease-in-out",
            props.doBackground
              ? props.clearBackground
                ? "backdrop-blur-md bg-transparent"
                : "bg-background-main"
              : "bg-transparent",
          )}
        >
          {props.doBackground ? (
            <div className="absolute w-full h-full inset-0 overflow-hidden">
              <BlurEllipsis positionClass="absolute" />
            </div>
          ) : null}
          <div className="opacity-0 absolute inset-0 block h-20 pointer-events-auto" />
          <div
            className={classNames(
              "transition-[background-color,backdrop-filter,opacity] duration-300 ease-in-out",
              props.bg ? "opacity-100" : "opacity-0",
              "absolute inset-0 block h-[11rem]",
              props.clearBackground
                ? "backdrop-blur-md bg-transparent"
                : "bg-background-main",
            )}
            style={{
              maskImage: `linear-gradient(
                to bottom,
                rgba(0, 0, 0, 1),
                rgba(0, 0, 0, 1) calc(100% - ${getMaskLength()}px),
                rgba(0, 0, 0, 0) 100%
              )`,
              WebkitMaskImage: `linear-gradient(
                to bottom,
                rgba(0, 0, 0, 1),
                rgba(0, 0, 0, 1) calc(100% - ${getMaskLength()}px),
                rgba(0, 0, 0, 0) 100%
              )`,
            }}
          />
        </div>
      </div>

      {/* content */}
      <div
        className="top-content fixed pointer-events-none left-0 right-0 z-[500] top-0 min-h-[150px]"
        style={{
          top: `${bannerHeight}px`,
        }}
      >
        <div
          data-nav-obstruct
          className={classNames("fixed left-0 right-0 flex items-center")}
        >
          <div
            data-nav-row
            className={classNames(
              "px-7 relative z-[60] flex flex-1 flex-wrap items-center gap-x-3 gap-y-2",
              props.centerSlot ? "py-5 lg:h-20 lg:py-0" : "py-5",
            )}
          >
            <div className="flex shrink-0 items-center space-x-1.5 ssm:space-x-3 pointer-events-auto">
              <Link
                className="block tabbable rounded-full text-xs ssm:text-base"
                to="/"
                onClick={() => window.scrollTo(0, 0)}
              >
                <BrandPill clickable header />
              </Link>
              <div className="hidden lg:flex items-center space-x-1.5 ssm:space-x-3">
                <a
                  href={conf().DISCORD_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xl text-white tabbable rounded-full backdrop-blur-lg"
                >
                  <IconPatch
                    icon={Icons.DISCORD}
                    clickable
                    downsized
                    navigation
                  />
                </a>

                <button
                  type="button"
                  onClick={() => openDownloadModal()}
                  className="text-xl text-white tabbable rounded-full backdrop-blur-lg"
                  title="Download"
                >
                  <IconPatch
                    icon={Icons.DOWNLOAD}
                    clickable
                    downsized
                    navigation
                  />
                </button>

                <button
                  type="button"
                  onClick={() => openNotifications()}
                  className="text-xl text-white tabbable rounded-full backdrop-blur-lg relative"
                  title="Notifications"
                >
                  <IconPatch
                    icon={Icons.BELL}
                    clickable
                    downsized
                    navigation
                  />
                  {(() => {
                    const count = getUnreadCount();
                    const shouldShow =
                      typeof count === "number" ? count > 0 : count === "99+";
                    return shouldShow ? (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] aspect-square flex items-center justify-center">
                        {count}
                      </span>
                    ) : null;
                  })()}
                </button>
                <button
                  type="button"
                  onClick={() => openTipJar()}
                  className="text-xl text-white tabbable rounded-full backdrop-blur-lg"
                  title="Tip Jar"
                >
                  <IconPatch
                    icon={Icons.TIP_JAR}
                    clickable
                    downsized
                    navigation
                  />
                </button>
              </div>
              <MobileActionsMenu
                openDownloadModal={openDownloadModal}
                openNotifications={openNotifications}
                openTipJar={openTipJar}
                unreadCount={getUnreadCount()}
              />
            </div>
            {props.centerSlot ? (
              <div className="pointer-events-auto order-last w-full min-w-0 lg:order-none lg:w-auto lg:flex-1">
                {props.centerSlot}
              </div>
            ) : null}
            <div className="relative pointer-events-auto ml-auto flex shrink-0 items-center gap-3">
              <div className="hidden lg:block">
                <HomeLayoutCustomizerToggle />
              </div>
              <LinksDropdown>
                {loggedIn ? <UserAvatar withName /> : <NoUserAvatar />}
              </LinksDropdown>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
