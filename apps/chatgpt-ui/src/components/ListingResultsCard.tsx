/**
 * ListingResultsCard - Renders marketplace listing results
 */

import React from 'react';
import { ToolCard } from './ToolCard';

interface ListingResultsCardProps {
  data: any;
  onAction?: (action: string, payload: any) => void;
}

export const ListingResultsCard: React.FC<ListingResultsCardProps> = ({ data, onAction }) => {
  const listings = data.listings || [];
  const listing = data.listing; // Single listing from create_listing

  const displayListings = listing ? [listing] : listings;

  return (
    <ToolCard
      title={listing ? 'Listing Created' : `Found ${listings.length} ${listings.length === 1 ? 'Listing' : 'Listings'}`}
    >
      <div className="space-y-3">
        {displayListings.length > 0 ? (
          displayListings.map((item: any, index: number) => (
            <div
              key={item.id || index}
              className="
                p-3 rounded-lg
                border border-slate-200 dark:border-slate-700
                bg-slate-50 dark:bg-slate-900/50
              "
            >
              <div className="font-medium text-slate-900 dark:text-white">
                {item.title}
              </div>
              {item.description && (
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {item.description}
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                {item.price && (
                  <div className="font-semibold text-blue-600 dark:text-blue-400">
                    {item.price} {item.currency || 'RWF'}
                  </div>
                )}
                {item.category && (
                  <div className="text-xs text-slate-500 dark:text-slate-500">
                    {item.category}
                  </div>
                )}
              </div>
              {item.distance_km && (
                <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {parseFloat(item.distance_km).toFixed(1)} km away
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-slate-500 dark:text-slate-400">
            <p>No listings found.</p>
          </div>
        )}
      </div>
    </ToolCard>
  );
};

