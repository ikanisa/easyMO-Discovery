import React, { useMemo, useState } from 'react';
import { ICONS } from '../../constants';

interface ImageCarouselProps {
  images: string[];
  alt?: string;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, alt = 'Property photo' }) => {
  const safeImages = useMemo(() => images.filter((u) => typeof u === 'string' && u.trim().length > 0).slice(0, 10), [images]);
  const [index, setIndex] = useState(0);

  if (safeImages.length === 0) return null;

  const prev = () => setIndex((i) => (i - 1 + safeImages.length) % safeImages.length);
  const next = () => setIndex((i) => (i + 1) % safeImages.length);

  return (
    <div className="relative w-full h-full">
      <img
        src={safeImages[index]}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 pointer-events-none" />

      {safeImages.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/55 text-white border border-white/10 backdrop-blur-sm"
            aria-label="Previous photo"
          >
            <ICONS.ChevronDown className="w-4 h-4 rotate-90" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/55 text-white border border-white/10 backdrop-blur-sm"
            aria-label="Next photo"
          >
            <ICONS.ChevronDown className="w-4 h-4 -rotate-90" />
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/25 border border-white/10 rounded-full px-2 py-1 backdrop-blur-sm">
            {safeImages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/70'}`}
                aria-label={`Go to photo ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ImageCarousel;

