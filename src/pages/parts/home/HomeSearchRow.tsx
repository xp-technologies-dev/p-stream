import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { SearchBarInput } from "@/components/form/SearchBar";
import { Icon, Icons } from "@/components/Icon";
import { useSlashFocus } from "@/components/player/hooks/useSlashFocus";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useRandomTranslation } from "@/hooks/useRandomTranslation";
import { useSearchQuery } from "@/hooks/useSearchQuery";

export interface HomeSearchRowProps {
  searchParams: ReturnType<typeof useSearchQuery>;
  isInFeatured?: boolean;
  isSticky?: boolean;
}

export function HomeSearchRow({
  searchParams,
  isInFeatured,
  isSticky,
}: HomeSearchRowProps) {
  const { t: randomT } = useRandomTranslation();
  const [search, setSearch, setSearchUnFocus] = searchParams;
  const { isMobile } = useIsMobile();
  const placeholder = randomT(`home.search.placeholder`);
  const inputRef = useRef<HTMLInputElement>(null);
  useSlashFocus(inputRef);

  const [scrolled, setScrolled] = useState(() => window.scrollY > 0);
  useEffect(() => {
    if (!isInFeatured) return undefined;
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [isInFeatured]);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <SearchBarInput
          ref={inputRef}
          onChange={setSearch}
          value={search}
          onUnFocus={setSearchUnFocus}
          placeholder={placeholder ?? ""}
          isSticky={isInFeatured ? scrolled : isSticky}
          isInFeatured={isInFeatured}
          compact={isMobile}
        />
      </div>
      {!isInFeatured && (
        <Link
          to="/discover"
          className={classNames(
            "group relative flex items-center justify-center rounded-[28px] bg-search-background/50 hover:bg-search-background backdrop-blur-sm transition-[transform,background-color] duration-300 ease-spring hover:scale-105 active:scale-95 overflow-hidden",
            isMobile ? "h-11" : "h-14",
          )}
        >
          <div className="absolute inset-0 rounded-[28px] bg-[linear-gradient(90deg,#a855f7,#ec4899,#d946ef,#c084fc,#a855f7,#ec4899,#d946ef,#c084fc,#a855f7)] bg-[length:300%_100%] opacity-70 group-hover:opacity-100 transition-opacity duration-500 animate-gradient-flow" />
          <div className="absolute inset-[2px] rounded-[26px] bg-search-background transition-colors duration-300" />

          <div className="relative flex items-center justify-center px-4 sm:px-5 h-full">
            <Icon
              icon={Icons.RISING_STAR}
              className="text-search-icon group-hover:text-pink-400 transition-colors duration-300 text-xl group-hover:rotate-12"
            />
            <span className="max-w-0 opacity-0 group-hover:max-w-[80px] group-hover:opacity-100 group-hover:ml-1 text-white font-bold text-sm tracking-wide bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text group-hover:text-transparent transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden hidden sm:block">
              Discover
            </span>
          </div>
        </Link>
      )}
    </div>
  );
}
