
import React from 'react';
import { ICONS } from '../../constants';
import { PropertyListing } from '../../types';
import ImageCarousel from './ImageCarousel';

interface PropertyCardWidgetProps {
  property: PropertyListing;
}

const PropertyCardWidget: React.FC<PropertyCardWidgetProps> = ({ property }) => {
  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const draft = property.whatsapp_draft || `Hi, I am interested in ${property.title}.`;
    const phone = property.contact_phone?.replace(/\D/g, '') || '';
    
    const url = phone 
      ? `https://wa.me/${phone}?text=${encodeURIComponent(draft)}`
      : `https://wa.me/?text=${encodeURIComponent(draft)}`;
      
    window.open(url, '_blank');
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (property.contact_phone) {
      window.open(`tel:${property.contact_phone}`, '_self');
    }
  };

  const formattedPrice = property.price 
    ? `${property.price.toLocaleString()} ${property.currency}` 
    : 'Price on request';

  const neighborhoodScore =
    typeof property.neighborhood_score === 'number' && Number.isFinite(property.neighborhood_score)
      ? Math.max(0, Math.min(10, property.neighborhood_score))
      : null;

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-lg bg-white dark:bg-slate-900/40 w-full mb-3">
      {/* Property Image Gallery */}
      <div className="relative h-48 overflow-hidden">
        {property.photos && property.photos.length > 0 ? (
          <ImageCarousel images={property.photos} alt={property.title} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
            <ICONS.Home className="w-16 h-16 text-slate-600" />
          </div>
        )}

        {/* Verified Badge */}
        {property.verified && (
          <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 border border-white/10">
            <ICONS.CheckCircle className="w-3 h-3" /> Verified
          </div>
        )}

        {/* Price Assessment Badge */}
        {property.price_assessment && (
          <div
            className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded-full border border-white/10 ${
              property.price_assessment === 'below_market'
                ? 'bg-emerald-500 text-white'
                : property.price_assessment === 'above_market'
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-700 text-white'
            }`}
          >
            {property.price_assessment === 'below_market'
              ? 'Great Deal'
              : property.price_assessment === 'above_market'
                ? 'Premium'
                : 'Fair Price'}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Header: Type & Confidence */}
        <div className="flex justify-between items-start">
           <div className="flex items-center gap-2">
             <span className="bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-200 dark:border-blue-500/20">
               {property.property_type}
             </span>
             <span className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wider font-bold ${
                property.confidence === 'high' ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 
                property.confidence === 'medium' ? 'border-yellow-500/30 text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10' :
                'border-slate-300 dark:border-slate-700 text-slate-500'
             }`}>
               {property.confidence} Match
             </span>
           </div>
           <div className={`text-xs font-bold uppercase ${property.listing_type === 'rent' ? 'text-orange-500 dark:text-orange-400' : 'text-purple-600 dark:text-purple-400'}`}>
              For {property.listing_type}
           </div>
        </div>

        {/* Title & Price */}
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{property.title}</h3>
          <div className="text-emerald-600 dark:text-emerald-400 font-mono font-bold mt-1 text-base">
            {formattedPrice}
            <span className="text-slate-500 dark:text-slate-500 text-xs font-normal ml-1">
               {property.listing_type === 'rent' ? '/ month' : ''}
            </span>
          </div>
        </div>

        {/* Neighborhood Score */}
        {neighborhoodScore !== null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Neighborhood</span>
            <div className="flex-1 h-2 bg-slate-200/60 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                style={{ width: `${neighborhoodScore * 10}%` }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">
              {neighborhoodScore.toFixed(1)}/10
            </span>
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
           <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 p-2 rounded-lg">
              <ICONS.MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
              <div className="truncate">{property.area_label}</div>
           </div>
           {property.approx_distance_km && (
             <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 p-2 rounded-lg">
                <ICONS.Map className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                <div>~{property.approx_distance_km.toFixed(1)} km</div>
             </div>
           )}
           {(property.bedroom_count !== null || property.bathroom_count !== null) && (
             <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 p-2 rounded-lg col-span-2">
                {property.bedroom_count !== null && (
                   <span className="flex items-center gap-1.5">
                     <ICONS.Bed className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" /> 
                     {property.bedroom_count} Beds
                   </span>
                )}
                {property.bathroom_count !== null && (
                   <span className="flex items-center gap-1.5 border-l border-slate-300 dark:border-white/10 pl-3">
                     <ICONS.Bath className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" /> 
                     {property.bathroom_count} Baths
                   </span>
                )}
             </div>
           )}
        </div>

        {/* Nearby Amenities */}
        {property.nearby && property.nearby.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {property.nearby.slice(0, 3).map((poi, idx) => (
              <span
                key={idx}
                className="text-[10px] bg-blue-500/15 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/20"
              >
                {poi}
              </span>
            ))}
          </div>
        )}

        {/* Reason */}
        {property.why_recommended && (
          <div className="text-xs text-slate-500 dark:text-slate-400 italic border-l-2 border-slate-300 dark:border-slate-700 pl-2">
            "{property.why_recommended}"
          </div>
        )}

        {/* Source Attribution */}
        {(property.source_platform || property.source_url) && (
          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">via {property.source_platform || 'Google Search'}</span>
            {property.source_url && (
              <a
                href={property.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-500 dark:text-blue-300 hover:underline"
              >
                View original →
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-[1.5fr_1fr] gap-2 mt-1">
          <button 
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
          >
            <ICONS.WhatsApp className="w-4 h-4" />
            Msg Agent
          </button>
          
          <button 
            onClick={handleCall}
            disabled={!property.contact_phone}
            className={`
              flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold border transition-all active:scale-95
              ${property.contact_phone 
                ? 'bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10' 
                : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 border-transparent cursor-not-allowed opacity-60'}
            `}
          >
            <ICONS.Phone className="w-4 h-4" />
            Call
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyCardWidget;
