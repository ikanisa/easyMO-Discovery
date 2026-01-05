/**
 * ChatGPT App UI Bundle
 * Lightweight React component bundle for ChatGPT Apps SDK
 * Renders match cards, marketplace listings, and payment QR codes
 */

import React from 'react';

export interface MatchCardProps {
  matches: Array<{
    user_id: string;
    role: 'passenger' | 'driver';
    vehicle_type?: string;
    location: { lat: number; lng: number };
    distance_km: string;
    last_seen: string;
  }>;
  onContact?: (userId: string) => void;
}

export interface MarketplaceCardProps {
  listings: Array<{
    id: string;
    title: string;
    category?: string;
    price?: number;
    currency?: string;
    distance_km?: string;
    phone_number?: string;
  }>;
  onContact?: (listingId: string) => void;
}

export interface PaymentQRProps {
  ussd_code: string;
  qr_value: string;
  country?: string;
}

/**
 * Match Card Component
 * Displays driver/passenger matches for mobility
 */
export const MatchCard: React.FC<MatchCardProps> = ({ matches, onContact }) => {
  return (
    <div style={{ padding: '16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
        {matches.length} Match{matches.length !== 1 ? 'es' : ''} Found
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {matches.slice(0, 5).map((match, idx) => (
          <div
            key={match.user_id || idx}
            style={{
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                  {match.role === 'driver' ? '🚗 Driver' : '🚶 Passenger'}
                </div>
                {match.vehicle_type && (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Vehicle: {match.vehicle_type}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {match.distance_km} away
                </div>
              </div>
              {onContact && (
                <button
                  onClick={() => onContact(match.user_id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Contact
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {matches.length > 5 && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
          +{matches.length - 5} more matches
        </div>
      )}
    </div>
  );
};

/**
 * Marketplace Card Component
 * Displays business/product listings
 */
export const MarketplaceCard: React.FC<MarketplaceCardProps> = ({ listings, onContact }) => {
  return (
    <div style={{ padding: '16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
        {listings.length} Listing{listings.length !== 1 ? 's' : ''} Found
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {listings.slice(0, 5).map((listing, idx) => (
          <div
            key={listing.id || idx}
            style={{
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                  {listing.title}
                </div>
                {listing.category && (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    {listing.category}
                  </div>
                )}
                {listing.price && (
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    {listing.currency || 'RWF'} {listing.price.toLocaleString()}
                  </div>
                )}
                {listing.distance_km && (
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {listing.distance_km} away
                  </div>
                )}
              </div>
              {onContact && listing.phone_number && (
                <button
                  onClick={() => onContact(listing.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Call
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {listings.length > 5 && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
          +{listings.length - 5} more listings
        </div>
      )}
    </div>
  );
};

/**
 * Payment QR Component
 * Displays Mobile Money QR code information
 */
export const PaymentQR: React.FC<PaymentQRProps> = ({ ussd_code, qr_value, country = 'RW' }) => {
  return (
    <div style={{ padding: '16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
        Mobile Money QR Code
      </h3>
      <div
        style={{
          padding: '16px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          backgroundColor: '#f9fafb',
        }}
      >
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
            USSD Code:
          </div>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '16px',
              fontWeight: '600',
              padding: '8px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
            }}
          >
            {ussd_code}
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
            QR Value:
          </div>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              padding: '8px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              wordBreak: 'break-all',
            }}
          >
            {qr_value}
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '12px' }}>
          Country: {country.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

/**
 * Main App Component
 * Renders appropriate card based on type
 */
export interface AppProps {
  type: 'matches' | 'marketplace' | 'payment';
  data: any;
  onAction?: (action: string, payload: any) => void;
}

export const App: React.FC<AppProps> = ({ type, data, onAction }) => {
  switch (type) {
    case 'matches':
      return (
        <MatchCard
          matches={data.matches || []}
          onContact={(userId) => onAction?.('contact', { userId })}
        />
      );
    case 'marketplace':
      return (
        <MarketplaceCard
          listings={data.listings || []}
          onContact={(listingId) => onAction?.('contact', { listingId })}
        />
      );
    case 'payment':
      return <PaymentQR {...data} />;
    default:
      return <div>Unknown card type: {type}</div>;
  }
};

export default App;

