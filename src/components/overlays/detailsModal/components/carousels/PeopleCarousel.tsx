import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  getMediaCredits,
  getPersonProfileImage,
} from "@/backend/metadata/tmdb";
import {
  TMDBCastMember,
  TMDBContentTypes,
  TMDBCrewMember,
} from "@/backend/metadata/types/tmdb";
import { useOverlayStack } from "@/stores/interface/overlayStack";

interface CastCarouselProps {
  mediaId: string;
  mediaType: TMDBContentTypes;
}

export function CastCarousel({ mediaId, mediaType }: CastCarouselProps) {
  const { t } = useTranslation();
  const [cast, setCast] = useState<TMDBCastMember[]>([]);
  const [director, setDirector] = useState<TMDBCrewMember | null>(null);
  const clearAllModals = useOverlayStack((s) => s.clearAllModals);

  useEffect(() => {
    async function loadCast() {
      try {
        const credits = await getMediaCredits(mediaId, mediaType);
        const foundDirector = credits.crew.find(
          (member) => member.job === "Director" && member.profile_path,
        );
        setDirector(foundDirector || null);

        const castWithImages = credits.cast
          .filter((member) => member.profile_path)
          .slice(0, 20);
        setCast(castWithImages);
      } catch (err) {
        console.error("Failed to load cast:", err);
      }
    }
    loadCast();
  }, [mediaId, mediaType]);

  if (cast.length === 0 && !director) return null;

  return (
    <div className="space-y-4 pt-6">
      {/* pt-2: a sideways scroller clips vertically too, and the ring is outside the item. */}
      <div
        data-nav-row
        data-nav-remember
        className="flex overflow-x-auto scrollbar-none pt-2 pb-4 gap-4"
      >
        {director && (
          <Link
            to={`/person/${director.id}`}
            onClick={() => clearAllModals()}
            className="flex flex-col items-center space-y-2 flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            <div className="relative h-32 w-32 overflow-hidden rounded-full">
              <img
                src={getPersonProfileImage(director.profile_path)}
                alt={director.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="text-center w-32 flex flex-col">
              <span className="font-medium truncate">{director.name}</span>
              <span className="text-sm truncate">{t("Director")}</span>
            </div>
          </Link>
        )}
        {cast.map((member) => (
          <Link
            key={member.id}
            to={`/person/${member.id}`}
            onClick={() => clearAllModals()}
            className="flex flex-col items-center space-y-2 flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            <div className="relative h-32 w-32 overflow-hidden rounded-full">
              <img
                src={getPersonProfileImage(member.profile_path)}
                alt={member.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="text-center w-32 flex flex-col">
              <span className="font-medium truncate">{member.name}</span>
              <span className="text-sm truncate">{member.character}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
