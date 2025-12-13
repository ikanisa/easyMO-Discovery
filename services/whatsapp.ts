
import { normalizePhoneNumber } from '../utils/phone';
import { BusinessListing } from '../types';
import { callBackend } from './api';

export interface BusinessContact {
  name: string;
  phone: string;
}

export interface BroadcastPayload {
  requestId: string;
  userLocationLabel: string;
  needDescription: string;
  businesses: BusinessContact[];
  tableNumber?: string;
  type?: 'broadcast' | 'order' | 'welcome';
}

export interface BroadcastResponse {
  success: boolean;
  message?: string;
  count?: number;
}

const EXCLUDED_PREFIXES = [/^\+256/, /^\+254/, /^\+234/, /^\+27/];
const isExcluded = (phone: string): boolean => EXCLUDED_PREFIXES.some(regex => regex.test(phone));

/**
 * Triggers a stock check via Google Apps Script Backend.
 */
export const triggerWhatsAppBroadcast = async (
  businessName: string, 
  businessPhone: string, 
  userLocation: string, 
  need: string
): Promise<boolean> => {
  
  const cleanPhone = normalizePhoneNumber(businessPhone);
  if (!cleanPhone) return false;

  const payload = {
    action: "queue_broadcast",
    requestId: "REQ-" + Date.now(),
    userLocation: userLocation || "Unknown Location",
    need: need || "General Inquiry",
    businessName: businessName,
    businessPhone: cleanPhone
  };

  try {
    const response = await callBackend(payload);
    return response.status === 'success' || response.result === 'success';
  } catch (error) {
    console.error("Broadcast Error", error);
    return false;
  }
};

/**
 * Batch broadcast (for 'Ask All').
 */
export const sendWhatsAppBroadcastRequest = async (payload: BroadcastPayload): Promise<BroadcastResponse> => {
  try {
    const validBusinesses = payload.businesses
      .map(b => ({ name: b.name, phone: normalizePhoneNumber(b.phone) }))
      .filter(b => b.phone && !isExcluded(b.phone));

    if (validBusinesses.length === 0) {
      return { success: false, message: "No valid numbers found." };
    }

    const backendPayload = {
      action: "batch_broadcast",
      ...payload,
      businesses: validBusinesses
    };

    const response = await callBackend(backendPayload);

    if (response.status === 'success' || response.result === 'success') {
       return { 
         success: true, 
         count: validBusinesses.length,
         message: `Request sent to ${validBusinesses.length} businesses.`
       };
    } else {
       return { success: false, message: response.message || "Backend rejected request." };
    }

  } catch (error: any) {
    console.error("Batch Broadcast Error:", error);
    return { success: false, message: "Failed to connect to backend." };
  }
};

/**
 * Polling for "Yes" replies via Backend.
 * Uses action: "check_broadcast_status"
 */
export const pollBroadcastResponses = async (
  requestId: string, 
  originalBusinesses: BusinessContact[],
  elapsedSeconds: number
): Promise<BusinessListing[]> => {
    
    try {
        const response = await callBackend({
            action: "check_broadcast_status",
            requestId: requestId
        });

        // Backend should return { matches: [ { name, phone, item_found, ... } ] }
        if (response.matches && Array.isArray(response.matches)) {
            // Map backend matches to BusinessListing
            return response.matches.map((m: any, idx: number) => ({
                id: `verified-${m.phone}-${idx}`,
                name: m.name || "Verified Business",
                category: "Verified",
                distance: "Nearby",
                confidence: 'High',
                phoneNumber: m.phone,
                // These are specific to verified items
                snippet: `Confirmed stock: ${m.item_found || 'Yes'}`,
                whatsappDraft: `Hello, I saw your confirmation for "${m.item_found}". I would like to order.`
            }));
        }
    } catch (e) {
        console.warn("Polling error:", e);
    }
    
    return [];
};
