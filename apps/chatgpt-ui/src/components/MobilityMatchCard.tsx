/**
 * MobilityMatchCard - Renders mobility matching results
 */

import React from 'react';
import { ToolCard } from './ToolCard';

interface MobilityMatchCardProps {
  data: any;
  onAction?: (action: string, payload: any) => void;
}

export const MobilityMatchCard: React.FC<MobilityMatchCardProps> = ({ data, onAction }) => {
  const matches = data.matches || [];
  const intentId = data.intent_id;

  return (
    <ToolCard
      title={matches.length > 0 ? `Found ${matches.length} ${matches.length === 1 ? 'Match' : 'Matches'}` : 'No Matches Found'}
      actions={[
        {
          label: 'Refresh',
          variant: 'secondary',
          onClick: () => {
            if (onAction && intentId) {
              onAction('find_driver_matches', { intent_id: intentId });
            }
          },
        },
      ]}
    >
      <div className="space-y-3">
        {matches.length > 0 ? (
          matches.map((match: any, index: number) => (
            <div
              key={index}
              className="
                p-3 rounded-lg
                border border-slate-200 dark:border-slate-700
                bg-slate-50 dark:bg-slate-900/50
              "
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-white">
                    {match.role === 'driver' ? 'Driver' : 'Passenger'}
                  </div>
                  {match.distance_km && (
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {parseFloat(match.distance_km).toFixed(1)} km away
                    </div>
                  )}
                  {match.eta_seconds && (
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      ETA: {Math.round(match.eta_seconds / 60)} min
                    </div>
                  )}
                </div>
                {match.user_id && (
                  <button
                    onClick={() => {
                      if (onAction) {
                        onAction('reveal_contact', { match_id: match.match_id || match.user_id });
                      }
                    }}
                    className="
                      px-3 py-1.5 rounded-lg
                      bg-blue-600 text-white text-sm
                      hover:bg-blue-700
                      transition-colors
                    "
                  >
                    Contact
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-slate-500 dark:text-slate-400">
            <p>No matches found. Try expanding your search radius.</p>
          </div>
        )}
      </div>
    </ToolCard>
  );
};

