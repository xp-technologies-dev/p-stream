import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { getMediaVideos } from "@/backend/metadata/tmdb";
import { TMDBContentTypes, TMDBVideo } from "@/backend/metadata/types/tmdb";

interface TrailerCarouselProps {
  mediaId: string;
  mediaType: TMDBContentTypes;
  imdbData?: any;
  onTrailerClick: (videoKey: string, isImdbTrailer?: boolean) => void;
}

export function TrailerCarousel({
  mediaId,
  mediaType,
  imdbData,
  onTrailerClick,
}: TrailerCarouselProps) {
  const { t } = useTranslation();
  const [videos, setVideos] = useState<TMDBVideo[]>([]);

  useEffect(() => {
    async function loadVideos() {
      try {
        const mediaVideos = await getMediaVideos(mediaId, mediaType);
        // Sort by official status and then by type (Trailer first, then Teaser)
        const sortedVideos = mediaVideos.sort((a, b) => {
          if (a.official !== b.official) return b.official ? 1 : -1;
          if (a.type !== b.type) return a.type === "Trailer" ? -1 : 1;
          return 0;
        });
        setVideos(sortedVideos);
      } catch (err) {
        console.error("Failed to load videos:", err);
      }
    }
    loadVideos();
  }, [mediaId, mediaType]);

  // Combine TMDB videos and IMDb trailer
  const allTrailers = [
    ...videos,
    ...(imdbData?.trailer_url
      ? [
          {
            id: "imdb-trailer",
            key: imdbData.trailer_url,
            name: "IMDb Trailer",
            site: "IMDb",
            size: 1080,
            type: "Trailer",
            official: true,
            published_at: new Date().toISOString(),
            thumbnail: imdbData.trailer_thumbnail,
          },
        ]
      : []),
  ];

  if (allTrailers.length === 0) return null;

  return (
    <div className="space-y-4 pt-8">
      <h3 className="text-lg font-semibold text-white/90">
        {t("details.trailers")}
      </h3>
      <div
        data-nav-row
        data-nav-remember
        className="flex overflow-x-auto scrollbar-none pt-2 pb-4 gap-4"
      >
        {allTrailers.map((video) => {
          const isImdbTrailer = video.id === "imdb-trailer";
          let thumbnailUrl: string;

          if (isImdbTrailer) {
            // Use IMDb thumbnail if available, otherwise use a generic trailer placeholder
            thumbnailUrl = video.thumbnail || "/thumbnail-placeholder.png";
          } else {
            // Use YouTube thumbnail for TMDB videos
            thumbnailUrl = `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`;
          }

          return (
            <button
              key={video.id}
              type="button"
              onClick={() => onTrailerClick(video.key, isImdbTrailer)}
              className="flex-shrink-0 hover:opacity-80 transition-opacity rounded-lg overflow-hidden"
            >
              <div className="relative h-52 w-96 overflow-hidden bg-black/60">
                <img
                  src={thumbnailUrl}
                  alt={video.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 right-3">
                  <h4 className="text-white font-medium text-sm leading-tight line-clamp-2 text-left">
                    {video.name}
                  </h4>
                  {/* <p className="text-white/80 text-xs mt-1 text-left">
                    {isImdbTrailer ? "IMDb Trailer" : video.type}
                  </p> */}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
