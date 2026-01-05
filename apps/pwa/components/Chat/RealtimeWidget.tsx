/**
 * RealtimeWidget Component
 * 
 * Wraps ChatKit widgets with Supabase Realtime subscriptions for live updates.
 * Automatically subscribes to database changes and updates widget state.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import type { Widgets } from '@easymo/chatkit-widget-pack/types';

interface RealtimeWidgetProps {
  widget: Widgets.Card;
  onUpdate?: (updatedWidget: Widgets.Card) => void;
  messageId?: string; // Optional message ID for tracking
}

/**
 * Update widget based on realtime event
 */
function updateWidgetFromRealtimeEvent(
  widget: Widgets.Card,
  payload: any
): Widgets.Card {
  const metadata = widget.metadata;
  if (!metadata?.realtime_table) return widget;

  // Handle broadcast_targets updates
  if (metadata.realtime_table === 'broadcast_targets') {
    // Find list view in widget components
    const listView = findListViewInWidget(widget);
    if (listView && listView.type === 'ListView') {
      const updatedItems = listView.items.map((item: any) => {
        // Check if this item matches the updated target
        const targetId = item.metadata?.target_id || 
                        extractIdFromItem(item);
        
        if (targetId === payload.new.id || targetId === payload.new.business_id) {
          // Update item subtitle with new status
          const updatedItem = { ...item };
          if (item.children) {
            updatedItem.children = item.children.map((child: any) => {
              if (child.type === 'Caption') {
                return {
                  ...child,
                  value: `${payload.new.status ?? 'pending'}${payload.new.distance_km ? ` • ${payload.new.distance_km.toFixed(1)} km` : ''}`,
                };
              }
              return child;
            });
          }
          return updatedItem;
        }
        return item;
      });

      // Update widget with new items
      return updateWidgetComponent(widget, (component: any) => {
        if (component.type === 'ListView') {
          return { ...component, items: updatedItems };
        }
        return component;
      });
    }
  }

  return widget;
}

/**
 * Find ListView component in widget tree
 */
function findListViewInWidget(widget: Widgets.Card): Widgets.ListView | null {
  for (const component of widget.children) {
    if (component.type === 'ListView') {
      return component as Widgets.ListView;
    }
    // Recursively search in nested components
    if ('children' in component && Array.isArray((component as any).children)) {
      const found = findListViewInComponent((component as any));
      if (found) return found;
    }
  }
  return null;
}

function findListViewInComponent(component: any): Widgets.ListView | null {
  if (component.type === 'ListView') {
    return component;
  }
  if (component.children) {
    for (const child of component.children) {
      const found = findListViewInComponent(child);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Update a component in widget tree
 */
function updateWidgetComponent(
  widget: Widgets.Card,
  updater: (component: any) => any
): Widgets.Card {
  return {
    ...widget,
    children: widget.children.map(component => {
      const updated = updater(component);
      if ('children' in component && Array.isArray((component as any).children)) {
        return {
          ...updated,
          children: (component as any).children.map((child: any) => updater(child)),
        };
      }
      return updated;
    }),
  };
}

/**
 * Extract ID from list item (heuristic)
 */
function extractIdFromItem(item: any): string | null {
  // Try to find ID in metadata
  if (item.metadata?.target_id) return item.metadata.target_id;
  if (item.metadata?.business_id) return item.metadata.business_id;
  
  // Try to find ID in onClickAction payload
  if (item.onClickAction?.payload?.business_id) {
    return item.onClickAction.payload.business_id;
  }
  if (item.onClickAction?.payload?.target_id) {
    return item.onClickAction.payload.target_id;
  }
  
  return null;
}

/**
 * RealtimeWidget Component
 * 
 * Automatically subscribes to Supabase Realtime updates based on widget metadata
 * and updates the widget when database changes occur.
 */
export const RealtimeWidget: React.FC<RealtimeWidgetProps> = ({
  widget,
  onUpdate,
  messageId,
}) => {
  const [localWidget, setLocalWidget] = useState<Widgets.Card>(widget);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const metadata = widget.metadata;
    
    // Only subscribe if widget has realtime metadata
    if (!metadata?.realtime_channel || !metadata?.realtime_table) {
      return;
    }

    // Parse filter if provided
    let filter: any = {};
    if (metadata.realtime_filter) {
      // Parse filter like "campaign_id=eq.123"
      const [column, operator, value] = metadata.realtime_filter.split(/[=<>]/);
      if (column && operator && value) {
        filter = { [column]: value };
      }
    }

    const channel = supabase
      .channel(metadata.realtime_channel)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: metadata.realtime_table,
          filter: metadata.realtime_filter || undefined,
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          
          // Update widget based on realtime event
          const updatedWidget = updateWidgetFromRealtimeEvent(localWidget, payload);
          setLocalWidget(updatedWidget);
          onUpdate?.(updatedWidget);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
          console.log(`RealtimeWidget subscribed to ${metadata.realtime_channel}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`RealtimeWidget subscription error for ${metadata.realtime_channel}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsSubscribed(false);
    };
  }, [widget.metadata?.realtime_channel, widget.metadata?.realtime_table, widget.metadata?.realtime_filter]);

  // Update local widget when prop changes
  useEffect(() => {
    setLocalWidget(widget);
  }, [widget]);

  // This component manages realtime subscription
  // The parent component should render the widget
  // This hook provides the updated widget state
  return null;
};

/**
 * Hook version for easier integration
 */
export function useRealtimeWidget(
  widget: Widgets.Card | null | undefined,
  onUpdate?: (updatedWidget: Widgets.Card) => void
): Widgets.Card | null {
  const [localWidget, setLocalWidget] = useState<Widgets.Card | null>(widget || null);

  useEffect(() => {
    if (!widget) {
      setLocalWidget(null);
      return;
    }

    const metadata = widget.metadata;
    if (!metadata?.realtime_channel || !metadata?.realtime_table) {
      setLocalWidget(widget);
      return;
    }

    const channel = supabase
      .channel(metadata.realtime_channel)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: metadata.realtime_table,
          filter: metadata.realtime_filter || undefined,
        },
        (payload) => {
          const updatedWidget = updateWidgetFromRealtimeEvent(localWidget || widget, payload);
          setLocalWidget(updatedWidget);
          onUpdate?.(updatedWidget);
        }
      )
      .subscribe();

    setLocalWidget(widget);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [widget?.metadata?.realtime_channel, widget?.metadata?.realtime_table]);

  return localWidget;
}

export default RealtimeWidget;

