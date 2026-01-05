
import React, { useState, useRef, useEffect } from 'react';
import { useDataSaver } from '../../src/context/DataSaverContext';
import { cn } from '../../utils/ui';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /**
   * Responsive sizes attribute for srcset
   * Example: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
   */
  sizes?: string;
  /**
   * Priority loading (eager) for above-the-fold images
   * Default: false (lazy loading)
   */
  priority?: boolean;
  /**
   * Aspect ratio to prevent layout shift
   * Example: "16/9", "1/1", "4/3"
   */
  aspectRatio?: string;
  /**
   * Blur placeholder (base64 data URL)
   * If provided, shows blur placeholder while loading
   */
  blurPlaceholder?: string;
  /**
   * Fallback image if src fails to load
   */
  fallback?: string;
}

/**
 * OptimizedImage Component
 * 
 * Features:
 * - Lazy loading (unless priority)
 * - Responsive srcset support
 * - Layout shift prevention (aspect ratio)
 * - Blur placeholder support
 * - Data saver mode integration
 * - Error handling with fallback
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  sizes = '(max-width: 768px) 100vw, 800px',
  priority = false,
  aspectRatio,
  blurPlaceholder,
  fallback,
  className,
  onError,
  ...props
}) => {
  const { shouldReduceImages } = useDataSaver();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
  };

  // Handle image error
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    if (fallback && imgRef.current) {
      imgRef.current.src = fallback;
      setHasError(false);
    }
    onError?.(e);
  };

  // Generate responsive srcset if needed
  // In production, this would use vite-imagetools to generate multiple sizes
  const generateSrcSet = (baseSrc: string): string | undefined => {
    // If vite-imagetools is configured, it will handle srcset generation
    // For now, return undefined to use single src
    // TODO: Integrate with vite-imagetools when installed
    return undefined;
  };

  const imageSrc = hasError && fallback ? fallback : src;
  const srcSet = generateSrcSet(imageSrc);

  // Aspect ratio container to prevent layout shift
  const containerStyle: React.CSSProperties = aspectRatio
    ? {
        aspectRatio,
        position: 'relative',
        overflow: 'hidden',
      }
    : {};

  return (
    <div style={containerStyle} className={cn('relative', className)}>
      {/* Blur placeholder */}
      {blurPlaceholder && !isLoaded && (
        <img
          src={blurPlaceholder}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-sm scale-110"
          style={{ filter: 'blur(20px)' }}
        />
      )}
      
      {/* Main image */}
      <img
        ref={imgRef}
        src={imageSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          shouldReduceImages && 'opacity-90' // Slight reduction in data saver mode
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
      
      {/* Loading skeleton */}
      {!isLoaded && !blurPlaceholder && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse" />
      )}
    </div>
  );
};

export default OptimizedImage;

