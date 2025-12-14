
import { normalizePhoneNumber } from '../utils/phone';
import { BusinessListing } from '../types';
import { callBackend } from './api';
import { CONFIG } from '../config';

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
  timestamp?: number;
}

export interface BroadcastResponse {
  success: boolean;
  message?: string;
  count?: number;
}

const EXCLUDED_PREFIXES = [/^\+256/, /^\+254/, /^\+234/, /^\+27/];
const isExcluded = (phone: string): boolean => EXCLUDED_PREFIXES.some(regex => regex.test(phone));

// --- MOCK DATA FOR DEMO MODE ---
const MOCK_REPLIES = [
  { text: 'Yes, we have it in stock.', delay: 5 },
  { text: 'Available. 5000 RWF.', delay: 12 },
  { text: 'Yes, come pick up.', delay: 8 }
];

// --- HISTORY HELPERS ---
const HISTORY_KEY = 'easyMO_broadcast_history';

export const saveBroadcastToHistory = (payload: BroadcastPayload) => {
  try {
    const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    const entry = { ...payload, timestamp: Date.now(), status: 'pending' };
    // Keep last 10
    const updated = [entry, ...existing].slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    // Dispatch event for UI updates
    window.dispatchEvent(new Event('broadcast_history_updated'));
  } catch (e) {
    console.error("Failed to save broadcast history", e);
  }
};

export const getBroadcastHistory = (): any[] => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch (e) {
    return [];
  }
};

/**
 * Triggers a single stock check via Edge Function.
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
    requestId: "REQ-" + Date.now(),
    userLocationLabel: userLocation || "Unknown Location",
    needDescription: need || "General Inquiry",
    businesses: [{ name: businessName, phone: cleanPhone }]
  };

  // Save to local history immediately
  saveBroadcastToHistory(payload);

  try {
    const response = await callBackend({
      action: "queue_broadcast",
      ...payload
    });
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
  const validBusinesses = payload.businesses
    .map(b => ({ name: b.name, phone: normalizePhoneNumber(b.phone) }))
    .filter(b => b.phone && !isExcluded(b.phone));

  if (validBusinesses.length === 0) {
    return { success: false, message: "No valid numbers found." };
  }

  // Save to history
  saveBroadcastToHistory({ ...payload, businesses: validBusinesses });

  try {
    // Map to Edge Function structure
    const backendPayload = {
      action: "batch_broadcast",
      requestId: payload.requestId,
      userLocationLabel: payload.userLocationLabel,
      needDescription: payload.needDescription,
      businesses: validBusinesses
    };

    const response = await callBackend(backendPayload);

    if (response.status === 'success') {
       return { 
         success: true, 
         count: validBusinesses.length,
         message: `Request sent to ${validBusinesses.length} businesses.`
       };
    } else {
       // Check if it's just demo mode falling back
       if (CONFIG.ENABLE_DEMO_MODE) {
          return { success: true, count: validBusinesses.length, message: "Demo: Request queued." };
       }
       return { success: false, message: response.message || "Request failed." };
    }

  } catch (error: any) {
    console.error("Batch Broadcast Error:", error);
    return { success: false, message: "Connection failed." };
  }
};

/**
 * Polling for "Yes" replies.
 */
export const pollBroadcastResponses = async (
  requestId: string, 
  originalBusinesses: BusinessContact[],
  elapsedSeconds: number
): Promise<BusinessListing[]> => {
    
    // 1. Check Real Backend
    try {
        const response = await callBackend({
            action: "check_broadcast_status",
            requestId: requestId
        });

        if (response.matches && Array.isArray(response.matches) && response.matches.length > 0) {
            return response.matches.map((m: any, idx: number) => ({
                id: `verified-${m.business_phone}-${idx}`,
                name: m.business_name || "Verified Business",
                category: "Verified",
                distance: "Nearby",
                confidence: 'High',
                phoneNumber: m.business_phone,
                snippet: `Confirmed stock: ${m.item_found || 'Yes'}`,
                whatsappDraft: `Hello, I saw your confirmation for "${m.item_found}". I would like to order.`
            }));
        }
    } catch (e) {
        // Fall through
    }

    // 2. DEMO MODE SIMULATION (Client-Side)
    // If real backend has no results, simulate them for demo purposes
    if (CONFIG.ENABLE_DEMO_MODE) {
       const activeMatches: BusinessListing[] = [];
       originalBusinesses.slice(0, 3).forEach((biz, idx) => {
          const mock = MOCK_REPLIES[idx % MOCK_REPLIES.length];
          // Simulate arrival at different times
          if (elapsedSeconds > mock.delay && elapsedSeconds < mock.delay + 5) {
             activeMatches.push({
                id: `verified-${biz.phone}-${idx}`,
                name: biz.name,
                category: "Verified",
                distance: "Nearby",
                confidence: 'High',
                phoneNumber: biz.phone,
                snippet: `Confirmed stock: ${mock.text}`,
                whatsappDraft: `Hello ${biz.name}, I saw your confirmation: "${mock.text}". I would like to order.`
             });
          }
       });
       return activeMatches;
    }

    return [];
};
