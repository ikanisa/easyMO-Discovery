
import React from 'react';
import Skeleton from './UI/Skeleton';

const LoadingScreen: React.FC = () => {
  return (
    <div className="h-full w-full bg-slate-50 dark:bg-[#0f172a] absolute inset-0 z-50" role="status" aria-label="Loading">
      <div className="px-6 pt-10 space-y-6">
        {/* Header skeleton */}
        <Skeleton variant="text" width="8rem" height="2rem" />
        
        {/* Search bar skeleton */}
        <Skeleton variant="rectangular" width="100%" height="3rem" className="rounded-3xl" />
        
        {/* Section 1: Quick actions */}
        <div className="space-y-3">
          <Skeleton variant="text" width="6rem" height="0.75rem" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="card"
                width="9rem"
                height="9rem"
              />
            ))}
          </div>
        </div>
        
        {/* Section 2: Secondary actions */}
        <div className="space-y-3">
          <Skeleton variant="text" width="7rem" height="0.75rem" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="card"
                width="9rem"
                height="9rem"
              />
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading application...</span>
    </div>
  );
};

export default LoadingScreen;
