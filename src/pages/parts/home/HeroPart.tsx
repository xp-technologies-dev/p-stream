import classNames from "classnames";
import { useCallback, useState } from "react";
import Sticky from "react-sticky-el";

import { ThinContainer } from "@/components/layout/ThinContainer";
import { HeroTitle } from "@/components/text/HeroTitle";
import { useIsIOS, useIsMobile, useIsPWA } from "@/hooks/useIsMobile";
import { useIsTV } from "@/hooks/useIsTv";
import { useRandomTranslation } from "@/hooks/useRandomTranslation";
import { useSearchQuery } from "@/hooks/useSearchQuery";
import { useBannerSize } from "@/stores/banner";

import { GenreChips } from "./GenreChips";
import { HomeSearchRow } from "./HomeSearchRow";

export interface HeroPartProps {
  setIsSticky: (val: boolean) => void;
  searchParams: ReturnType<typeof useSearchQuery>;
  showTitle?: boolean;
}

function getTimeOfDay(
  date: Date,
): "night" | "morning" | "day" | "420" | "69" | "halloween" {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (month === 4 && day === 20) return "420";
  if (month === 6 && day === 9) return "69";
  if (month === 10 && day === 31) return "halloween";
  const hour = date.getHours();
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 19) return "day";
  return "night";
}

export function HeroPart({
  setIsSticky,
  searchParams,
  showTitle,
}: HeroPartProps) {
  const { t: randomT } = useRandomTranslation();
  const [search] = searchParams;
  const [showBg, setShowBg] = useState(false);
  const bannerSize = useBannerSize();
  const { isMobile } = useIsMobile();
  const { isTV } = useIsTV();
  const compact = isMobile;

  const stickStateChanged = useCallback(
    (isFixed: boolean) => {
      setShowBg(isFixed);
      setIsSticky(isFixed);
    },
    [setIsSticky],
  );

  const isPWA = useIsPWA();
  const isIOS = useIsIOS();
  const isIOSPWA = isIOS && isPWA;

  // Navbar height is 80px (h-20)
  const navbarHeight = 80;
  // On desktop: inline with navbar (same top position + 14px adjustment)
  // On mobile: below navbar (navbar height + banner)
  const topOffset = isMobile
    ? navbarHeight + bannerSize + (isIOSPWA ? 34 : 0)
    : bannerSize + 14;

  const time = getTimeOfDay(new Date());
  const title = randomT(`home.titles.${time}`);

  return (
    <>
      <ThinContainer>
        <div
          className={classNames(
            "space-y-16 text-center",
            showTitle ? "mt-44" : "mt-4",
          )}
        >
          {showTitle && (!isTV || search.length === 0) ? (
            <div className="relative z-10 mb-16">
              <HeroTitle className="mx-auto max-w-md">{title}</HeroTitle>
            </div>
          ) : null}

          <div className="relative z-30">
            <div className={compact ? "h-14" : "h-20"}>
              <Sticky
                topOffset={-topOffset}
                stickyStyle={{
                  paddingTop: `${topOffset}px`,
                }}
                onFixedToggle={stickStateChanged}
                scrollElement="window"
              >
                <div data-nav-obstruct={showBg ? "" : undefined}>
                  <HomeSearchRow
                    searchParams={searchParams}
                    isSticky={showBg}
                  />
                </div>
              </Sticky>
            </div>
          </div>
        </div>
      </ThinContainer>
      {(!search || search.length === 0) && (
        <div className="mt-6 px-8">
          <GenreChips />
        </div>
      )}
    </>
  );
}
