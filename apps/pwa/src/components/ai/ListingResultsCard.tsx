/**
 * ListingResultsCard - Card for displaying marketplace listings
 */

import React from 'react';
import ToolCard from './ToolCard';
import { ICONS } from '@easymo/shared/constants';

export interface ListingResult {
  id: string;
  title: string;
  description?: string;
  category: string;
  price?: number;
  currency?: string;
  images?: string[];
  vendor_id: string;
  location?: {
    lat: number;
    lng: number;
  };
  distance_km?: string;
  created_at?: string;
}

interface ListingResultsCardProps {
  listing: ListingResult;
  onViewDetails?: (listingId: string) => void;
  onContact?: (listingId: string) => void;
}

const ListingResultsCard: React.FC<ListingResultsCardProps> = ({
  listing,
  onViewDetails,
  onContact,
}) => {
  const actions = [];
  if (onViewDetails) {
    actions.push({
      label: 'View Details',
      onClick: () => onViewDetails(listing.id),
      variant: 'primary' as const,
      icon: ICONS.Info,
    });
  }
  if (onContact) {
    actions.push({
      label: 'Contact',
      onClick: () => onContact(listing.id),
      variant: 'secondary' as const,
      icon: ICONS.Phone,
    });
  }

  const priceDisplay = listing.price
    ? `${listing.price.toLocaleString()} ${listing.currency || 'RWF'}`
    : 'Price on request';

  return (
    <ToolCard
      title={listing.title}
      icon={ICONS.Store}
      actions={actions}
    >
      <div className="space-y-3">
        {/* Image */}
        {listing.images && listing.images.length > 0 && (
          <div className="w-full h-48 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700">
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Category */}
        <div className="flex items-center gap-2">
          <ICONS.Tag className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {listing.category}
          </span>
        </div>

        {/* Description */}
        {listing.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
            {listing.description}
          </p>
        )}

        {/* Price */}
        <div className="flex items-center gap-2">
          <ICONS.DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-base font-bold text-slate-900 dark:text-white">
            {priceDisplay}
          </span>
        </div>

        {/* Distance */}
        {listing.distance_km && (
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <ICONS.MapPin className="w-5 h-5 text-red-500" />
            <span className="text-sm font-semibold">
              {listing.distance_km} km away
            </span>
          </div>
        )}
      </div>
    </ToolCard>
  );
};

export default ListingResultsCard;

