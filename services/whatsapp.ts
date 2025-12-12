
import { normalizePhoneNumber } from '../utils/phone';
import { BusinessListing } from '../types';

export interface BusinessContact {
  name: string;
  phone: string;
}

export interface BroadcastPayload {
  requestId: string;
  userLocationLabel: string;
  needDescription: string;
  businesses: BusinessContact[];
  tableNumber?: string; // For Waiter Mode
  type?: 'broadcast' | 'order' | 'welcome';
}

export interface BroadcastResponse {
  success: boolean;
  message?: string;
  count?: number;
}

const WEBHOOK_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL) || "https://nadiral-colleen-subarticulative.ngrok-free.dev/broadcast-business-request";

// Country exclusion regex patterns for phone numbers (E.164 format)
const EXCLUDED_PREFIXES = [
  /^\+256/, // Uganda
  /^\+254/, // Kenya
  /^\+234/, // Nigeria
  /^\+27/,  // South Africa
];

const isExcluded = (phone: string): boolean => {
  return EXCLUDED_PREFIXES.some(regex => regex.test(phone));
};

export const sendWhatsAppBroadcastRequest = async (payload: BroadcastPayload): Promise<BroadcastResponse> => {
  try {
    // 1. Strict Normalization and Filtering
    const seenNumbers = new Set<string>();
    
    const validBusinesses: BusinessContact[] = [];

    for (const biz of payload.businesses) {
      // Normalize to E.164
      const formattedPhone = normalizePhoneNumber(biz.phone);

      // Criteria:
      // 1. Must result in a valid E.164 string
      // 2. Must not be in the excluded country list
      // 3. Must not be a duplicate in this specific batch
      if (formattedPhone && !isExcluded(formattedPhone) && !seenNumbers.has(formattedPhone)) {
        validBusinesses.push({ 
          name: biz.name.trim(), 
          phone: formattedPhone 
        });
        seenNumbers.add(formattedPhone);
      }
    }

    // 2. Validation Checks
    if (validBusinesses.length === 0) {
      // Return specific errors based on type context
      if (payload.type === 'order') {
         return { success: false, message: "Venue has no valid, supported WhatsApp number configured." };
      }
      if (payload.type === 'welcome') {
         return { success: false, message: "Invalid user phone number format." };
      }
      return { 
        success: false, 
        message: "No valid contactable businesses found (check number formats or country exclusions)." 
      };
    }

    // 3. Construct Clean Payload
    const finalPayload: BroadcastPayload = {
      ...payload,
      businesses: validBusinesses
    };

    console.log("Sending WhatsApp Request (E.164):", finalPayload);

    // 4. MOCK NETWORK CALL if URL is placeholder or we are offline
    if (WEBHOOK_URL.includes("ngrok")) {
        // Simulate network delay
        await new Promise(r => setTimeout(r, 800));
        
        if (payload.type === 'welcome') {
            console.log(`[Mock] Welcome message sent to ${validBusinesses[0].phone}`);
            return { success: true, message: "Welcome message sent.", count: 1 };
        }

        return {
            success: true,
            count: validBusinesses.length,
            message: `Request sent to ${validBusinesses.length} businesses. I will notify you as they reply.`
        };
    }

    // 5. Real Network Call
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(finalPayload),
    });

    if (!response.ok) {
      throw new Error(`Service Error: ${response.statusText}`);
    }
    
    const responseData = await response.json().catch(() => ({}));

    return { 
      success: true, 
      count: validBusinesses.length,
      message: responseData.message || "Broadcast initiated successfully."
    };

  } catch (error: any) {
    console.error("WhatsApp Broadcast Error:", error);
    return { 
      success: false, 
      message: error.message || "Failed to connect to broadcast service." 
    };
  }
};

/**
 * SIMULATION ONLY:
 * Checks if businesses have replied "Yes" to a specific broadcast ID.
 * In a real app, this would query the backend or listen to a socket.
 * 
 * Logic:
 * - We fake a progressive response. 
 * - elapsedSeconds 0-5: 0 replies
 * - elapsedSeconds 5-15: 1-2 replies
 * - elapsedSeconds 15+: 3-5 replies
 */
export const pollBroadcastResponses = async (
  requestId: string, 
  originalBusinesses: BusinessContact[],
  elapsedSeconds: number
): Promise<BusinessListing[]> => {
    
    // Simulate delay
    await new Promise(r => setTimeout(r, 400));

    // No replies immediately
    if (elapsedSeconds < 4) return [];

    // Determine how many verified matches based on time
    // We deterministically pick based on request ID and time so it feels "stable" for the demo
    const seed = requestId.length; 
    const maxMatches = Math.min(originalBusinesses.length, 5); // Cap at 5 verified matches
    
    let targetCount = 0;
    if (elapsedSeconds > 4 && elapsedSeconds < 10) targetCount = 1;
    else if (elapsedSeconds >= 10 && elapsedSeconds < 20) targetCount = 2;
    else if (elapsedSeconds >= 20) targetCount = 3 + (seed % 2); // 3 or 4

    targetCount = Math.min(targetCount, maxMatches);

    // Pick top 'targetCount' businesses from the original list and "Verify" them
    const verified: BusinessListing[] = originalBusinesses.slice(0, targetCount).map((biz, idx) => ({
       id: `verified-${idx}`,
       name: biz.name,
       category: 'Verified Supplier', // Override
       distance: 'Nearby',
       confidence: 'High',
       phoneNumber: biz.phone,
       snippet: `Verified Availability: Responded "YES" just now.`,
       isOpen: true,
       whatsappDraft: "I am coming to pick up the item you confirmed is in stock."
    }));

    return verified;
};
