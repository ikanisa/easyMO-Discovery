/**
 * Widget helper utilities for agent responses
 * 
 * This module provides helpers to generate ChatKit widgets from tool results
 * and integrate them into agent responses.
 */

import type { Widgets } from '@easymo/chatkit-widget-pack/types';
import {
  ModePickerCard,
  PassengerRideRequestCard,
  DriverAvailabilityCard,
  MatchesCard,
  HandoffCard,
  MarketplaceSearchCard,
  ListingsCard,
  BroadcastComposerCard,
  BroadcastTargetsPreviewCard,
  BroadcastProgressCard,
  IncomingResponsesCard,
  type MatchCandidate,
  type Listing,
  type BroadcastTarget,
  type BroadcastStats,
} from '@easymo/chatkit-widget-pack';

/**
 * Generate widget from tool result
 * 
 * Tools can return structured JSON that includes a `widget_type` field
 * to indicate which widget should be generated.
 */
export function generateWidgetFromToolResult(
  toolName: string,
  toolResult: string,
  context?: Record<string, any>
): Widgets.Card | null {
  try {
    const result = JSON.parse(toolResult);
    
    // Check if tool result explicitly requests a widget
    if (result.widget_type) {
      return generateWidgetByType(result.widget_type, result, context);
    }
    
    // Otherwise, infer widget from tool name and result structure
    return inferWidgetFromTool(toolName, result, context);
  } catch {
    // Not JSON, return null (agent will use text response)
    return null;
  }
}

function generateWidgetByType(
  widgetType: string,
  data: any,
  context?: Record<string, any>
): Widgets.Card | null {
  switch (widgetType) {
    case 'mode_picker':
      return ModePickerCard();
    
    case 'passenger_ride_request':
      return PassengerRideRequestCard();
    
    case 'driver_availability':
      return DriverAvailabilityCard();
    
    case 'matches':
      const candidates: MatchCandidate[] = data.matches?.map((m: any) => ({
        id: m.id || m.user_id || m.driver_id,
        label: m.display_name || `${m.role} ${m.user_id?.slice(0, 8)}`,
        etaMin: m.eta_seconds ? Math.round(m.eta_seconds / 60) : undefined,
        distanceKm: m.distance_km || (m.distance_m ? m.distance_m / 1000 : undefined),
        note: m.vehicle_type || m.address,
        contactHint: m.phone,
        mapsUrl: m.maps_url,
      })) || [];
      return MatchesCard(candidates);
    
    case 'handoff':
      return HandoffCard({
        who: data.who || 'Connection established',
        nextStep: data.nextStep || data.message || 'You can now contact each other directly.',
      });
    
    case 'marketplace_search':
      return MarketplaceSearchCard();
    
    case 'listings':
      const listings: Listing[] = data.listings?.map((l: any) => ({
        id: l.id,
        title: l.title || l.name,
        price: l.price ? `${l.price} ${l.currency || 'RWF'}` : undefined,
        location: l.address || l.location_label,
        summary: l.description,
        contactHint: l.phone_number || l.phone,
      })) || [];
      return ListingsCard(listings);
    
    case 'broadcast_composer':
      return BroadcastComposerCard();
    
    case 'broadcast_targets_preview':
      const targets: BroadcastTarget[] = data.targets?.map((t: any) => ({
        business_id: t.id || t.business_id,
        name: t.name || t.business_name,
        category: t.category,
        distance_km: t.distance_km,
        whatsapp_hint: t.phone,
        status: 'pending',
      })) || [];
      return BroadcastTargetsPreviewCard(targets, data.payload || {});
    
    case 'broadcast_progress':
      const stats: BroadcastStats = {
        campaign_id: data.campaign_id || data.request_id,
        total: data.total || 0,
        sent: data.sent || 0,
        delivered: data.delivered || 0,
        replied: data.replied || 0,
        failed: data.failed || 0,
      };
      const progressTargets: BroadcastTarget[] = data.targets?.map((t: any) => ({
        business_id: t.id || t.business_id,
        name: t.name || t.business_name,
        status: t.status || 'pending',
        distance_km: t.distance_km,
      })) || [];
      return BroadcastProgressCard(stats, progressTargets);
    
    case 'incoming_responses':
      return IncomingResponsesCard(
        data.campaign_id || data.request_id,
        data.responses?.map((r: any) => ({
          business_name: r.business_name || r.name,
          text: r.text || r.item_found || r.message,
          ts: r.responded_at || r.created_at || new Date().toISOString(),
          business_id: r.business_id || r.id,
        })) || []
      );
    
    default:
      return null;
  }
}

function inferWidgetFromTool(
  toolName: string,
  result: any,
  context?: Record<string, any>
): Widgets.Card | null {
  // Infer widget based on tool name and result structure
  if (toolName === 'create_match_candidates' || toolName === 'find_driver_matches') {
    if (result.matches && Array.isArray(result.matches)) {
      return generateWidgetByType('matches', result, context);
    }
  }
  
  if (toolName === 'create_ride_intent') {
    if (result.success && result.intent_id) {
      // After creating intent, show matches widget
      return null; // Will be handled by subsequent match tool call
    }
  }
  
  if (toolName === 'search_listings' || toolName === 'search_offers') {
    if (result.listings && Array.isArray(result.listings)) {
      return generateWidgetByType('listings', result, context);
    }
  }
  
  return null;
}

/**
 * Check if a tool result should trigger a widget
 */
export function shouldUseWidget(toolName: string, toolResult: string): boolean {
  try {
    const result = JSON.parse(toolResult);
    return result.widget_type !== undefined || 
           (toolName.includes('match') && result.matches) ||
           (toolName.includes('listing') && result.listings);
  } catch {
    return false;
  }
}

