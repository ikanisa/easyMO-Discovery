/**
 * MobilityMatchCard - Card for displaying driver/passenger matches
 */

import React from 'react';
import ToolCard from './ToolCard';
import { ICONS } from '../../../constants';

export interface MobilityMatch {
  id: string;
  user_id: string;
  role: 'driver' | 'passenger';
  display_name?: string;
  vehicle_type?: 'moto' | 'cab' | 'liffan' | 'truck' | 'other';
  distance_km?: string;
  distance_m?: number;
  is_online?: boolean;
  last_seen_at?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

interface MobilityMatchCardProps {
  match: MobilityMatch;
  onRequestRide?: (matchId: string) => void;
  onAccept?: (matchId: string) => void;
  onViewDetails?: (matchId: string) => void;
}

const vehicleIcons: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  moto: ICONS.Bike,
  cab: ICONS.Car,
  liffan: ICONS.Car,
  truck: ICONS.Car,
  other: ICONS.Car,
};

const vehicleLabels: Record<string, string> = {
  moto: 'Moto',
  cab: 'Cab',
  liffan: 'Liffan',
  truck: 'Truck',
  other: 'Vehicle',
};

const MobilityMatchCard: React.FC<MobilityMatchCardProps> = ({
  match,
  onRequestRide,
  onAccept,
  onViewDetails,
}) => {
  const VehicleIcon = vehicleIcons[match.vehicle_type || 'other'] || ICONS.Car;
  const vehicleLabel = vehicleLabels[match.vehicle_type || 'other'] || 'Vehicle';

  const isDriver = match.role === 'driver';
  const title = isDriver ? 'Driver Available' : 'Ride Request';

  const actions = [];
  if (isDriver && onRequestRide) {
    actions.push({
      label: 'Request Ride',
      onClick: () => onRequestRide(match.id),
      variant: 'primary' as const,
      icon: ICONS.Navigation,
    });
  } else if (!isDriver && onAccept) {
    actions.push({
      label: 'Accept',
      onClick: () => onAccept(match.id),
      variant: 'primary' as const,
      icon: ICONS.Check,
    });
  }
  if (onViewDetails) {
    actions.push({
      label: 'View Details',
      onClick: () => onViewDetails(match.id),
      variant: 'secondary' as const,
      icon: ICONS.Info,
    });
  }

  return (
    <ToolCard
      title={title}
      icon={isDriver ? ICONS.Car : ICONS.User}
      actions={actions}
    >
      <div className="space-y-3">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="
            w-12 h-12 rounded-full
            bg-gradient-to-br from-blue-500 to-purple-600
            flex items-center justify-center
            text-white font-bold text-lg
            shadow-lg
          ">
            {match.display_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <div className="font-bold text-base text-slate-900 dark:text-white">
              {match.display_name || 'Driver'}
            </div>
            {match.is_online !== undefined && (
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    match.is_online ? 'bg-green-500' : 'bg-slate-400'
                  }`}
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {match.is_online ? 'Online' : 'Offline'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Type */}
        {match.vehicle_type && (
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <VehicleIcon className="w-5 h-5" />
            <span className="text-sm font-semibold">{vehicleLabel}</span>
          </div>
        )}

        {/* Distance */}
        {match.distance_km && (
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <ICONS.MapPin className="w-5 h-5 text-red-500" />
            <span className="text-sm font-semibold">
              {match.distance_km} km away
            </span>
          </div>
        )}

        {/* Last Seen */}
        {match.last_seen_at && !match.is_online && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Last seen: {new Date(match.last_seen_at).toLocaleTimeString()}
          </div>
        )}
      </div>
    </ToolCard>
  );
};

export default MobilityMatchCard;

