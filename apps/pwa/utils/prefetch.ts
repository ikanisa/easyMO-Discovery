
/**
 * Route Prefetching Utilities
 * 
 * Prefetches likely next routes on good network connections
 * to improve perceived performance
 */

interface PrefetchOptions {
  /**
   * Only prefetch on good network connections
   * Default: true
   */
  onlyOnGoodConnection?: boolean;
  /**
   * Delay before prefetching (ms)
   * Default: 2000 (2 seconds after page load)
   */
  delay?: number;
}

/**
 * Check if connection is good enough for prefetching
 */
const isGoodConnection = (): boolean => {
  const connection = (navigator as any).connection;
  if (!connection) return true; // Assume good if unknown
  
  // Prefetch on 4G or better
  const effectiveType = connection.effectiveType;
  if (effectiveType === '4g' || effectiveType === '5g') {
    return true;
  }
  
  // Don't prefetch on slow connections or data saver
  if (connection.saveData || effectiveType === '2g' || effectiveType === 'slow-2g') {
    return false;
  }
  
  return true;
};

/**
 * Prefetch a route
 */
export const prefetchRoute = (route: string, options: PrefetchOptions = {}): void => {
  const { onlyOnGoodConnection = true, delay = 2000 } = options;
  
  // Check connection quality
  if (onlyOnGoodConnection && !isGoodConnection()) {
    return;
  }
  
  // Delay prefetch to not interfere with initial load
  setTimeout(() => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = route;
    link.as = 'document';
    document.head.appendChild(link);
  }, delay);
};

/**
 * Prefetch multiple routes
 */
export const prefetchRoutes = (routes: string[], options: PrefetchOptions = {}): void => {
  routes.forEach((route, index) => {
    // Stagger prefetches to avoid overwhelming the network
    prefetchRoute(route, {
      ...options,
      delay: (options.delay || 2000) + index * 500,
    });
  });
};

/**
 * Initialize route prefetching for likely next routes
 */
export const initRoutePrefetching = (): void => {
  // Prefetch primary navigation routes
  const likelyRoutes = [
    '/?mode=discovery',
    '/?mode=business',
    '/?mode=services',
  ];
  
  prefetchRoutes(likelyRoutes, {
    onlyOnGoodConnection: true,
    delay: 2000,
  });
};

