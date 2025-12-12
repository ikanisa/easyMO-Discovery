
import { GoogleGenAI } from "@google/genai";
import { Message, BusinessResultsPayload, Order, PropertyResultsPayload, LegalResultsPayload } from '../types';
import { normalizePhoneNumber } from '../utils/phone';
import { sendWhatsAppBroadcastRequest } from './whatsapp';

// NOTE: In production, API calls should go through a backend proxy to protect the key.
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// --- ROBUST HELPERS ---

/**
 * Safely extracts JSON from a model response, handling Markdown blocks and potential syntax errors.
 */
const extractJson = (text: string): any | null => {
  try {
    // 1. Try extracting from code blocks
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // 2. Try finding the first '{' and last '}'
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      const jsonStr = text.substring(start, end + 1);
      return JSON.parse(jsonStr);
    }
  } catch (e) {
    console.warn("JSON extraction failed, attempting loose repair...", e);
  }
  return null;
};

const parseDataUrl = (url: string) => {
  const match = url.match(/^data:(.*?);base64,(.*)$/);
  return match ? { mimeType: match[1], data: match[2] } : null;
};

/**
 * Formats chat history for Gemini API.
 * Maps 'sender' types to 'user' or 'model' roles.
 * CRITICAL: Filters out messages that result in empty 'parts'.
 */
const formatHistory = (history: Message[]) => {
  return history
    .filter(m => m.sender !== 'system')
    .map(m => {
      const parts: any[] = [];
      if (m.text && m.text.trim()) {
         parts.push({ text: m.text });
      }
      if (m.image?.previewUrl) {
        const parsed = parseDataUrl(m.image.previewUrl);
        if (parsed) parts.push({ inlineData: parsed });
      }
      return { role: m.sender === 'user' ? 'user' : 'model', parts };
    })
    .filter(m => m.parts.length > 0);
};

const createUserParts = (text: string, imageUrl?: string | null) => {
  const parts: any[] = [];
  if (text && text.trim()) parts.push({ text });
  if (imageUrl) {
    const parsed = parseDataUrl(imageUrl);
    if (parsed) parts.push({ inlineData: parsed });
  }
  // Fallback to avoid empty parts error
  if (parts.length === 0) {
      parts.push({ text: "." });
  }
  return parts;
};

// --- TOOL DEFINITIONS ---

const broadcastToolDef = {
  name: "broadcast_business_request",
  description: "Contacts multiple businesses via WhatsApp to check for product/service availability.",
  parameters: {
    type: "OBJECT",
    properties: {
      userLocationLabel: { type: "STRING", description: "e.g. 'Remera, Kigali'" },
      needDescription: { type: "STRING", description: "Short description of what user needs" },
      businesses: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            phone: { type: "STRING", description: "Phone number exactly as found in search results" }
          }
        }
      }
    },
    required: ["userLocationLabel", "needDescription", "businesses"]
  }
};

const submitOrderToolDef = {
  name: "submit_order",
  description: "Submits a food/drink order to the venue's WhatsApp.",
  parameters: {
    type: "OBJECT",
    properties: {
      venueName: { type: "STRING" },
      venuePhone: { type: "STRING" },
      tableNumber: { type: "STRING" },
      orderItems: { type: "STRING", description: "Summary of items e.g. '2 Beers, 1 Frites'" },
      totalEstimate: { type: "STRING" }
    },
    required: ["venueName", "venuePhone", "tableNumber", "orderItems"]
  }
};

// --- AGENTS IMPLEMENTATION ---

export const GeminiService = {

  /**
   * Support Agent
   * Simple chat, no complex tools.
   */
  chatSupport: async (
    history: Message[],
    userMessage: string,
    userImage?: string
  ): Promise<string> => {
    const model = 'gemini-2.5-flash';
    const systemPrompt = `You are the Support Agent for "easyMO", the all-in-one discovery app for Rwanda.
    
    YOUR KNOWLEDGE BASE:
    1. **Rides**: "Find Ride" on Home screen finds motos/cabs nearby.
    2. **MoMo**: "MoMo QR" generates payment codes for MTN/Airtel without internet.
    3. **Scanner**: "Scan" opens the camera for MoMo QRs or website links.
    4. **Services**: We have 'Notary AI' and 'Insurance' in the Services tab.
    5. **Waiters**: The "Waiter Mode" lets you order food inside restaurants.
    
    TONE: Friendly, concise, helpful.
    INSTRUCTION: Guide the user to the right button on the screen if they are lost.`;
    
    const chat = ai.chats.create({
      model,
      config: { systemInstruction: systemPrompt },
      history: formatHistory(history)
    });

    try {
      const result = await chat.sendMessage({ message: { parts: createUserParts(userMessage, userImage) } });
      return result.text || "I'm here to help, but I didn't catch that.";
    } catch (e) {
      console.error("Support Error:", e);
      return "I am currently unavailable. Please check your connection.";
    }
  },

  /**
   * "Bob" - Buy & Sell Agent
   */
  chatBob: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number },
    isDemoMode: boolean = false,
    userImage?: string
  ): Promise<{ text: string, businessPayload?: BusinessResultsPayload, groundingLinks?: any[] }> => {
    
    if (isDemoMode) {
      await new Promise(r => setTimeout(r, 1000));
      return { 
          text: "I'm in Demo Mode. Here are some mock results.", 
          businessPayload: { matches: [], query_summary: "Demo Results" } as any 
      };
    }

    const model = 'gemini-2.5-flash';
    
    // Explicitly using googleSearch.
    const tools = [
      { googleSearch: {} }, 
      { functionDeclarations: [broadcastToolDef] }
    ];

    const systemPrompt = `You are "Bob", easyMO's Elite Procurement Agent.
    
    CONTEXT: User is located at Lat: ${userLocation.lat}, Lng: ${userLocation.lng}.
    
    GOAL: Exhaustively find and contact local sellers to secure the item.
    
    SEARCH STRATEGY:
    1. **DEEP SEARCH**: Search Google Maps, business directories, and Social Media (Facebook, Instagram) for businesses matching the user's request near their location.
    2. **MAXIMIZE CANDIDATES**: Do not stop at a few. Try to find **up to 30** relevant businesses sorted by proximity.
    3. **EXTRACT CONTACTS**: Prioritize results where a phone number is available.
    
    ACTIONABLE INSTRUCTIONS:
    1. **BROADCAST**: If the user's intent is to find an item (e.g., "looking for...", "check price"), you MUST use the \`broadcast_business_request\` tool.
       - Include the **TOP 30** closest businesses found that have phone numbers. 
       - Do not arbitrarily limit the list. More contacts = higher success rate.
    2. **CONFIRMED MATCHES**: In your final JSON response, list ALL the businesses you attempted to contact.
    3. **STRUCTURED OUTPUT**: Always output the strict JSON block at the end.
    
    JSON SCHEMA (Strict):
    \`\`\`json
    {
      "query_summary": "Found 15 hardware stores in Remera",
      "need_description": "Cement and paint",
      "user_location_label": "Remera", 
      "category": "Hardware",
      "matches": [ 
        { 
          "name": "Store Name", 
          "phone": "+250...", 
          "category": "Hardware", 
          "confidence": "High", 
          "distance": "0.5km", 
          "address": "Street name or area",
          "whatsappDraft": "Do you have cement?" 
        } 
      ]
    }
    \`\`\`
    `;

    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: systemPrompt,
        tools,
      },
      history: formatHistory(history)
    });

    try {
      let result = await chat.sendMessage({ message: { parts: createUserParts(userMessage, userImage) } });
      
      let turns = 0;
      while (result.functionCalls && result.functionCalls.length > 0 && turns < 2) {
        turns++;
        const call = result.functionCalls[0];
        
        if (call.name === 'broadcast_business_request') {
          const args = call.args as any;
          
          const broadcastRes = await sendWhatsAppBroadcastRequest({
              requestId: `req-${Date.now()}`,
              userLocationLabel: args.userLocationLabel,
              needDescription: args.needDescription,
              businesses: args.businesses,
              type: 'broadcast'
          });

          result = await chat.sendMessage({
            message: {
                parts: [{
                  functionResponse: {
                    name: 'broadcast_business_request',
                    response: { result: broadcastRes }
                  }
                }]
            }
          });
        }
      }

      const fullText = result.text || "";
      const parsedJson = extractJson(fullText);
      const cleanText = fullText.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').trim();

      let payload: BusinessResultsPayload | undefined;
      if (parsedJson && Array.isArray(parsedJson.matches)) {
          payload = {
              query_summary: parsedJson.query_summary || "Here are the results.",
              need_description: parsedJson.need_description,
              user_location_label: parsedJson.user_location_label,
              category: parsedJson.category,
              matches: parsedJson.matches.map((m: any, idx: number) => ({
                 id: `gen-${idx}`,
                 name: m.name || "Unknown Business",
                 category: m.category || 'Business',
                 distance: m.distance || 'Nearby',
                 phoneNumber: normalizePhoneNumber(m.phone) || m.phone,
                 confidence: 'High',
                 address: m.address,
                 whatsappDraft: m.whatsappDraft
              }))
          };
      }

      return { text: cleanText, businessPayload: payload, groundingLinks: result.groundingMetadata?.groundingChunks as any[] };

    } catch (e) {
      console.error("Bob Error:", e);
      return { text: "I'm having trouble connecting to the discovery network. Please try again." };
    }
  },

  /**
   * "Keza" - Real Estate Agent
   */
  chatKeza: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number }, 
    isDemoMode: boolean = false, 
    userImage?: string
  ): Promise<{ text: string, propertyPayload?: PropertyResultsPayload, groundingLinks?: any[] }> => {

     if (isDemoMode) {
        await new Promise(r => setTimeout(r, 1000));
        return { text: "Demo: Found properties.", propertyPayload: { matches: [], query_summary: "Demo Results", disclaimer: "", pagination: { page: 1, page_size: 10, has_more: false }, filters_applied: { listing_type: 'unknown', property_type: 'unknown', budget_min: 0, budget_max: 0, area: '', radius_km: 0, sort: 'default' } } };
     }

     const model = 'gemini-2.5-flash';
     const tools = [{ googleSearch: {} }, { functionDeclarations: [broadcastToolDef] }];
     const systemPrompt = `You are "Keza", the Real Estate Assistant. 
     
     GOAL: Find every available property listing (Rent/Sale) by sweeping all sources.
     CONTEXT: User at Lat: ${userLocation.lat}, Lng: ${userLocation.lng}.
     
     SEARCH STRATEGY:
     1. **AGGRESSIVE SEARCH**: Search for "Real Estate Agencies", "Brokers", "Property Managers", and individual listings on Facebook, Instagram, and local classifieds near the user.
     2. **CONTACT EXTRACTION**: You typically need to call/message to get details. Prioritize findings with phone numbers.
     3. **PROXIMITY**: Sort matches by distance to the user.
     4. **BROADCAST**: If phone numbers are found, assume the user wants to inquire. Use \`broadcast_business_request\` to message agents.

     JSON SCHEMA:
     \`\`\`json
     {
       "query_summary": "Found 3 apartments...",
       "matches": [
          {
            "title": "2BHK Apartment in Remera",
            "property_type": "Apartment",
            "listing_type": "rent",
            "price": 400000,
            "currency": "RWF",
            "contact_phone": "+250...",
            "bedroom_count": 2,
            "bathroom_count": 1,
            "area_label": "Remera",
            "confidence": "high",
            "why_recommended": "Good view, near road",
            "whatsapp_draft": "Hi, interested in the 2BHK..."
          }
       ]
     }
     \`\`\`
     `;
     
     const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: systemPrompt,
        tools,
      },
      history: formatHistory(history)
    });

    try {
      let result = await chat.sendMessage({ message: { parts: createUserParts(userMessage, userImage) } });
      
      let turns = 0;
      while (result.functionCalls && result.functionCalls.length > 0 && turns < 2) {
        turns++;
        const call = result.functionCalls[0];
        if (call.name === 'broadcast_business_request') {
            const args = call.args as any;
            const broadcastRes = await sendWhatsAppBroadcastRequest({
                requestId: `req-${Date.now()}`,
                userLocationLabel: args.userLocationLabel,
                needDescription: args.needDescription,
                businesses: args.businesses,
                type: 'broadcast'
            });
            result = await chat.sendMessage({ 
                message: {
                    parts: [{ functionResponse: { name: 'broadcast_business_request', response: { result: broadcastRes } } }]
                }
            });
        }
      }

      const fullText = result.text || "";
      const parsedJson = extractJson(fullText);
      const cleanText = fullText.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').trim();

      let payload: PropertyResultsPayload | undefined;
      if (parsedJson && Array.isArray(parsedJson.matches)) {
          payload = {
              query_summary: parsedJson.query_summary || "Properties found.",
              pagination: { page: 1, page_size: 20, has_more: false },
              filters_applied: { listing_type: 'unknown', property_type: 'unknown', budget_min: 0, budget_max: 0, area: '', radius_km: 0, sort: 'default' },
              disclaimer: "Prices and availability subject to confirmation.",
              matches: parsedJson.matches.map((m: any, idx: number) => ({
                 id: `prop-${idx}`,
                 title: m.title || "Property",
                 property_type: m.property_type || "Unknown",
                 listing_type: m.listing_type || "unknown",
                 price: m.price || null,
                 currency: m.currency || "RWF",
                 bedroom_count: m.bedroom_count || null,
                 bathroom_count: m.bathroom_count || null,
                 area_label: m.area_label || "Nearby",
                 approx_distance_km: m.approx_distance_km || null,
                 contact_phone: normalizePhoneNumber(m.contact_phone) || m.contact_phone,
                 confidence: 'high',
                 why_recommended: m.why_recommended,
                 whatsapp_draft: m.whatsapp_draft
              }))
          };
      }

      return { text: cleanText, propertyPayload: payload, groundingLinks: result.groundingMetadata?.groundingChunks as any[] };

    } catch (e) {
      console.error("Keza Error:", e);
      return { text: "I'm having trouble searching for properties right now." };
    }
  },

  /**
   * "Gatera" - Legal Agent
   */
  chatGatera: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number }, 
    isDemoMode: boolean = false, 
    userImage?: string
  ): Promise<{ text: string, legalPayload?: LegalResultsPayload, groundingLinks?: any[] }> => {

     if (isDemoMode) {
       await new Promise(r => setTimeout(r, 1000));
       return { text: "Demo: Found legal services.", legalPayload: { matches: [], query_summary: "Demo Results" } };
     }

     const model = 'gemini-2.5-flash';
     const tools = [{ googleSearch: {} }, { functionDeclarations: [broadcastToolDef] }];
     const systemPrompt = `You are "Gatera", the Legal Assistant.
     
     GOAL: Provide a comprehensive list of all legal professionals nearby.
     CONTEXT: User at Lat: ${userLocation.lat}, Lng: ${userLocation.lng}.
     
     SEARCH STRATEGY:
     1. **EXHAUSTIVE MAP**: Search for every Notary, Lawyer, Bailiff, and Law Firm in the vicinity using Google Maps and directories.
     2. **VERIFICATION**: Distinguish between "Notary" (for contracts/authentications) and "Lawyer" (for advice/court).
     3. **CONTACT**: Ensure phone numbers are extracted for immediate contact.
     4. **BROADCAST**: If user asks to find a professional, use \`broadcast_business_request\` with found phone numbers.

     JSON SCHEMA:
     \`\`\`json
     {
       "query_summary": "Found 4 notaries.",
       "matches": [
         {
           "name": "Me. Jean Paul",
           "category": "Notary",
           "phoneNumber": "+250...",
           "address": "Kigali Heights",
           "whatsappDraft": "Hello, I need notary services..."
         }
       ]
     }
     \`\`\`
     `;
     
     const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: systemPrompt,
        tools,
      },
      history: formatHistory(history)
    });

    try {
      let result = await chat.sendMessage({ message: { parts: createUserParts(userMessage, userImage) } });
      
      let turns = 0;
      while (result.functionCalls && result.functionCalls.length > 0 && turns < 2) {
        turns++;
        const call = result.functionCalls[0];
        if (call.name === 'broadcast_business_request') {
            const args = call.args as any;
            const broadcastRes = await sendWhatsAppBroadcastRequest({
                requestId: `req-${Date.now()}`,
                userLocationLabel: args.userLocationLabel,
                needDescription: args.needDescription,
                businesses: args.businesses,
                type: 'broadcast'
            });
            result = await chat.sendMessage({ 
                message: {
                    parts: [{ functionResponse: { name: 'broadcast_business_request', response: { result: broadcastRes } } }]
                }
            });
        }
      }

      const fullText = result.text || "";
      const parsedJson = extractJson(fullText);
      const cleanText = fullText.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').trim();

      let payload: LegalResultsPayload | undefined;
      if (parsedJson && Array.isArray(parsedJson.matches)) {
          payload = {
              query_summary: parsedJson.query_summary || "Legal services found.",
              matches: parsedJson.matches.map((m: any, idx: number) => ({
                 id: `leg-${idx}`,
                 name: m.name,
                 category: m.category || 'Legal Professional',
                 distance: m.distance || 'Nearby',
                 phoneNumber: normalizePhoneNumber(m.phoneNumber) || m.phoneNumber,
                 confidence: 'High',
                 address: m.address,
                 whatsappDraft: m.whatsappDraft
              }))
          };
      }

      return { text: cleanText, legalPayload: payload, groundingLinks: result.groundingMetadata?.groundingChunks as any[] };

    } catch (e) {
      console.error("Gatera Error:", e);
      return { text: "I'm having trouble finding legal services right now." };
    }
  },

  /**
   * "Dogo" - Waiter Agent
   */
  chatDogo: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number }, 
    businessId: string
  ): Promise<{ text: string, orderSummary?: Order }> => {

    const model = 'gemini-2.5-flash';
    const tools = [
        { googleSearch: {} }, 
        { functionDeclarations: [submitOrderToolDef] }
    ];

    const systemPrompt = `You are "Dogo", a smart digital waiter.
    
    CONTEXT: User is at Lat: ${userLocation.lat}, Lng: ${userLocation.lng}.
    
    WORKFLOW:
    1. **IDENTIFY VENUE**: If this is the first message, Use Google Search to find the *closest* bar/restaurant to the user's coordinates.
    2. **GET TABLE**: Ask for Table Number if not provided.
    3. **TAKE ORDER**: Discuss menu items.
    4. **SUBMIT**: Use the \`submit_order\` tool when the user confirms.
       - You MUST find the venue's phone number via Google Search to submit the order.
       - If no phone is found, ask the user for the waiter's number.
    5. **CONFIRM**: Tell user order is sent.

    Always be brief and friendly.
    `;

    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: systemPrompt,
        tools,
      },
      history: formatHistory(history)
    });

    try {
        let result = await chat.sendMessage({ message: { parts: createUserParts(userMessage) } });
        let orderSummary: Order | undefined;

        // Function Call Loop
        let turns = 0;
        while (result.functionCalls && result.functionCalls.length > 0 && turns < 2) {
            turns++;
            const call = result.functionCalls[0];
            
            if (call.name === 'submit_order') {
                const args = call.args as any;
                console.log("[Dogo] Submitting order", args);

                const whatsappRes = await sendWhatsAppBroadcastRequest({
                    requestId: `ord-${Date.now()}`,
                    userLocationLabel: "On Premise",
                    needDescription: `Order Table ${args.tableNumber}`,
                    businesses: [{ name: args.venueName, phone: args.venuePhone }],
                    type: 'order'
                });

                orderSummary = {
                    id: `ord-${Date.now()}`,
                    businessId: 'dynamic',
                    guestSessionId: 'user',
                    tableLabel: args.tableNumber,
                    status: 'submitted',
                    total: 0,
                    currency: 'RWF',
                    createdAt: Date.now(),
                    items: [{ id: '1', name: args.orderItems, qty: 1, price: 0, menuItemId: '0' }]
                };

                result = await chat.sendMessage({
                    message: {
                        parts: [{
                            functionResponse: {
                                name: 'submit_order',
                                response: { result: whatsappRes }
                            }
                        }]
                    }
                });
            }
        }

        return { text: result.text || "Just a moment...", orderSummary };

    } catch (e) {
        console.error("Dogo Error", e);
        return { text: "Sorry, I can't take your order right now due to a connection issue." };
    }
  },
  
  // Legacy aliases
  chatBuySellAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatBob(h, m, l, d, i),
  chatRealEstateAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatKeza(h, m, l, d, i),
  chatLegalAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatGatera(h, m, l, d, i),
  chatWaiterAgent: (h: any, m: any, id: any) => GeminiService.chatDogo(h, m, {lat: -1.9, lng: 30.0}, id),
};
