
import { GoogleGenAI } from "@google/genai";
import { Message, BusinessListing, BusinessResultsPayload, Order, OrderItem, PropertyResultsPayload, PropertyListing, LegalResultsPayload, LegalListing } from '../types';
import { formatDistance } from './location';
import { WaiterService } from './waiter';

// NOTE: In production, API calls should go through a backend proxy to secure the key.
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to clean JSON from markdown
const extractJson = (text: string): any | null => {
  try {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    // Try parsing raw if no code blocks
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      return JSON.parse(text.substring(start, end + 1));
    }
  } catch (e) {
    console.warn("Failed to extract JSON from model response", e);
  }
  return null;
};

// Helper to parse Data URL to Base64 part
const parseDataUrl = (url: string) => {
  const match = url.match(/^data:(.*?);base64,(.*)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return null;
};

// Helper to convert internal Message history to Gemini Content Parts
const formatHistory = (history: Message[]) => {
  return history
    .filter(m => m.sender !== 'system')
    .map(m => {
      const parts: any[] = [];
      if (m.text) parts.push({ text: m.text });
      if (m.image?.previewUrl) {
        const parsed = parseDataUrl(m.image.previewUrl);
        if (parsed) {
          parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
        }
      }
      return {
        role: m.sender === 'user' ? 'user' : 'model',
        parts: parts
      };
    });
};

// Helper to create current user parts
const createUserParts = (text: string, imageUrl?: string | null) => {
  const parts: any[] = [];
  if (text) parts.push({ text });
  if (imageUrl) {
    const parsed = parseDataUrl(imageUrl);
    if (parsed) {
      parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
    }
  }
  return parts;
};

// --- MOCK DATA ---
const MOCK_ELECTRONICS: BusinessResultsPayload = {
  query_summary: "Found top rated electronics stores near you.",
  category: "Electronics",
  filters_applied: { radius_km: 3, sort: 'best_match' },
  pagination: { page_size: 20, page: 1, has_more: false, next_page: 1 },
  matches: [
    {
      id: '1', name: 'Kigali Electronics Hub', category: 'Electronics', distance: '0.5 km', approx_distance_km: 0.5, isOpen: true, confidence: 'High',
      snippet: 'Best match for "chargers" with high user ratings.', address: 'KN 3 Ave, Kigali', phoneNumber: '+250788123456', whatsappDraft: 'Hello, do you have original iPhone chargers available?'
    },
    {
      id: '2', name: 'Gadget World', category: 'Electronics', distance: '1.2 km', approx_distance_km: 1.2, isOpen: true, confidence: 'Medium',
      snippet: 'Stock varies, but usually has cables.', address: 'KG 11 Ave, Kigali', whatsappDraft: 'Hi, looking for USB-C cables.'
    },
    {
      id: '3', name: 'City Tech Repairs', category: 'Electronics', distance: '0.3 km', approx_distance_km: 0.3, isOpen: false, confidence: 'High',
      snippet: 'Known for affordable repairs and parts.', address: 'Downtown, Kigali', whatsappDraft: 'Hello, do you repair charging ports?'
    }
  ],
  disclaimer: "Results are based on nearby confirmed listings. Verify availability."
};

const getMockPayload = (query: string): BusinessResultsPayload => {
    return MOCK_ELECTRONICS; // Simplified for demo
};

const MOCK_REAL_ESTATE_PAYLOAD: PropertyResultsPayload = {
  query_summary: "Found 3 apartments for rent near Kacyiru.",
  filters_applied: {
    listing_type: 'rent',
    property_type: 'Apartment',
    budget_min: 0,
    budget_max: 0,
    area: 'Kacyiru',
    radius_km: 5,
    sort: 'best_match'
  },
  pagination: {
    page_size: 20,
    page: 1,
    has_more: false,
    next_page: 1
  },
  matches: [
    {
      id: 're-1',
      title: 'Modern 2-Bedroom Apartment',
      property_type: 'Apartment',
      listing_type: 'rent',
      price: 600,
      currency: 'USD',
      bedroom_count: 2,
      bathroom_count: 2,
      area_label: 'Kacyiru, Kigali',
      approx_distance_km: 1.2,
      contact_phone: '+250788123456',
      confidence: 'high',
      why_recommended: 'Matches your location and bedroom requirement perfectly.',
      whatsapp_draft: 'Hi, I saw your 2-bedroom apartment in Kacyiru. Is it available?'
    }
  ],
  disclaimer: "Prices and availability are subject to change by landlords."
};

const MOCK_LEGAL_PAYLOAD: LegalResultsPayload = {
    query_summary: "Found 2 Notaries in Kacyiru.",
    pagination: {
        page_size: 20,
        page: 1,
        has_more: false
    },
    matches: [
        {
            id: 'leg-1', name: 'Me. Jean Bosco', category: 'Notary', distance: '0.5 km', approx_distance_km: 0.5, isOpen: true, confidence: 'High',
            snippet: 'Sworn notary public, Kacyiru Sector.', address: 'Kacyiru, KG 7 Ave', phoneNumber: '+250788111111', whatsappDraft: 'Muraho Me. Jean, ndashaka serivisi za notaire.'
        },
        {
            id: 'leg-2', name: 'Kigali Law Chambers', category: 'Lawyer', distance: '1.2 km', approx_distance_km: 1.2, isOpen: true, confidence: 'Medium',
            snippet: 'Full service law firm.', address: 'Kimihurura', phoneNumber: '+250788222222', whatsappDraft: 'Hello, inquiring about legal representation.'
        }
    ],
    disclaimer: "Verify credentials before service."
};


export const GeminiService = {
  /**
   * Support Agent
   */
  chatSupport: async (history: Message[], userMessage: string, userImage?: string): Promise<string> => {
    const model = 'gemini-2.5-flash';
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
            ...formatHistory(history),
            { role: 'user', parts: createUserParts(userMessage, userImage) }
        ],
        config: {
            systemInstruction: `You are the support agent for easyMO. Help users with safety, app issues. Reply in user's language (English or Kinyarwanda). Be concise.`,
        }
      });
      return response.text || "I'm sorry, I couldn't process that.";
    } catch (error) {
      console.error("Gemini Support Error:", error);
      return "Connection error. Please try again.";
    }
  },

  /**
   * Buy & Sell / Generic Discovery Agent
   */
  chatBuySellAgent: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number },
    isDemoMode: boolean = false,
    userImage?: string
  ): Promise<{ text: string, businessPayload?: BusinessResultsPayload, groundingLinks?: any[] }> => {
    
    if (isDemoMode) {
      await new Promise(r => setTimeout(r, 1000));
      return {
        text: `I found some places that might help with "${userMessage}".`,
        businessPayload: getMockPayload(userMessage)
      };
    }

    const model = 'gemini-2.5-flash';
    const systemPrompt = `You are easyMO's Super-Discovery Agent.
    
    CORE DIRECTIVE:
    You are an intelligent business finder. Find ALL relevant businesses near the user.
    You MUST exhaust **Google Maps** (for formal businesses) AND **Google Search** (for informal Social Media listings).
    
    STRICT PAGINATION RULE:
    - Results MUST be returned in pages of exactly 20 items (or less if fewer found).
    - If you find more than 20 items, return ONLY the first 20 in the 'matches' array.
    - Set "has_more": true and "next_page": 2 in the pagination object.
    - If the user asks for "page 2" or "more results", fetch and return the next 20 items (21-40).
    
    JSON Schema (STRICT):
    {
      "query_summary": "Found 35 pharmacies. Showing 1-20.",
      "category": "string",
      "pagination": {
        "page_size": 20,
        "page": 1,
        "has_more": true,
        "next_page": 2
      },
      "filters_applied": { "radius_km": 10, "sort": "distance_asc" },
      "matches": [
        {
          "name": "string",
          "category": "string",
          "phone": "string",
          "approx_distance_km": 0.2, 
          "open_status": "open|closed|unknown",
          "area": "string",
          "confidence": "High|Medium|Low",
          "why_recommended": "string",
          "whatsapp_draft": "string"
        }
      ],
      "disclaimer": "string"
    }
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
            ...formatHistory(history),
            { role: 'user', parts: createUserParts(userMessage, userImage) }
        ],
        config: {
          tools: [{ googleMaps: {} }, { googleSearch: {} }],
          toolConfig: { retrievalConfig: { latLng: { latitude: userLocation.lat, longitude: userLocation.lng } } },
          systemInstruction: systemPrompt
        }
      });

      const fullText = response.text || "";
      const parsedJson = extractJson(fullText);
      let cleanText = fullText.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').trim();
      let payload: BusinessResultsPayload | undefined = undefined;

      if (parsedJson && parsedJson.matches) {
        if (!cleanText) cleanText = parsedJson.query_summary || "Here are the closest matches.";
        payload = {
            query_summary: parsedJson.query_summary,
            category: parsedJson.category,
            pagination: parsedJson.pagination,
            filters_applied: parsedJson.filters_applied,
            matches: parsedJson.matches.map((m: any, idx: number) => ({
               id: `gen-${idx}-${Date.now()}`,
               name: m.name,
               category: m.category,
               distance: m.approx_distance_km ? formatDistance(m.approx_distance_km) : 'Unknown',
               approx_distance_km: m.approx_distance_km,
               isOpen: m.open_status === 'open' ? true : (m.open_status === 'closed' ? false : undefined),
               confidence: m.confidence as any,
               snippet: m.why_recommended,
               address: m.area,
               phoneNumber: m.phone,
               whatsappDraft: m.whatsapp_draft
            })),
            disclaimer: parsedJson.disclaimer
        };
      }

      // Extract Grounding
      let groundingLinks: { title: string, uri: string }[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web?.uri && chunk.web?.title) groundingLinks.push({ title: chunk.web.title, uri: chunk.web.uri });
        });
      }

      return { text: cleanText, businessPayload: payload, groundingLinks };

    } catch (error) {
      console.error("Gemini Buy/Sell Error:", error);
      return { text: "I'm having trouble searching right now. Please try again." };
    }
  },

  /**
   * Real Estate Agent
   */
  chatRealEstateAgent: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number },
    isDemoMode: boolean = false,
    userImage?: string
  ): Promise<{ text: string, propertyPayload?: PropertyResultsPayload, groundingLinks?: any[] }> => {
    
    if (isDemoMode) {
      await new Promise(r => setTimeout(r, 1500));
      return { text: "Here are some properties.", propertyPayload: MOCK_REAL_ESTATE_PAYLOAD };
    }

    const model = 'gemini-2.5-flash';
    const systemPrompt = `You are the easyMO Real Estate AI Agent.

MISSION: Find ALL available properties. Combine **Google Maps** (Agencies) with **Google Search** (Social Media listings).

STRICT PAGINATION RULE:
- Results MUST be returned in pages of exactly 20 items.
- If finding > 20, return only the first 20.
- Set "has_more": true and "next_page": [page + 1] in pagination object.
- If user asks for "more results" or "page 2", fetch the next batch.

JSON Schema (STRICT):
{
  "query_summary": "Found 45 matches.",
  "filters_applied": { "listing_type": "rent", "property_type": "Apartment", "area": "string", "sort": "best_match" },
  "pagination": { 
    "page_size": 20, 
    "page": 1, 
    "has_more": true, 
    "next_page": 2 
  },
  "matches": [
    {
      "title": "string",
      "property_type": "string",
      "listing_type": "rent|sale",
      "price": number,
      "currency": "string",
      "bedroom_count": number,
      "bathroom_count": number,
      "area_label": "string",
      "approx_distance_km": number,
      "contact_phone": "string",
      "confidence": "high|medium|low",
      "why_recommended": "string",
      "whatsapp_draft": "string"
    }
  ],
  "disclaimer": "Verify ownership before payment."
}
`;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
            ...formatHistory(history),
            { role: 'user', parts: createUserParts(userMessage, userImage) }
        ],
        config: {
          tools: [{ googleMaps: {} }, { googleSearch: {} }],
          toolConfig: { retrievalConfig: { latLng: { latitude: userLocation.lat, longitude: userLocation.lng } } },
          systemInstruction: systemPrompt
        }
      });

      const fullText = response.text || "";
      const parsedJson = extractJson(fullText);
      let cleanText = fullText.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').trim();
      let payload: PropertyResultsPayload | undefined = undefined;

      if (parsedJson && parsedJson.matches) {
        if (!cleanText) cleanText = parsedJson.query_summary || "Here are the properties found.";
        payload = {
            query_summary: parsedJson.query_summary,
            filters_applied: parsedJson.filters_applied,
            pagination: parsedJson.pagination,
            matches: parsedJson.matches.map((m: any, idx: number) => ({
               id: `prop-${idx}-${Date.now()}`,
               title: m.title || "Property",
               property_type: m.property_type,
               listing_type: m.listing_type,
               price: m.price,
               currency: m.currency,
               bedroom_count: m.bedroom_count,
               bathroom_count: m.bathroom_count,
               area_label: m.area_label,
               approx_distance_km: m.approx_distance_km,
               contact_phone: m.contact_phone,
               confidence: m.confidence,
               why_recommended: m.why_recommended,
               whatsapp_draft: m.whatsapp_draft
            })),
            disclaimer: parsedJson.disclaimer
        };
      }

      let groundingLinks: { title: string, uri: string }[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web?.uri && chunk.web?.title) groundingLinks.push({ title: chunk.web.title, uri: chunk.web.uri });
        });
      }

      return { text: cleanText, propertyPayload: payload, groundingLinks };

    } catch (error) {
      console.error("Gemini Real Estate Error:", error);
      return { text: "Error searching properties." };
    }
  },

  /**
   * Legal Agent - Now with Search & Draft
   */
  chatLegalAgent: async (
    history: Message[],
    userMessage: string,
    userLocation: { lat: number, lng: number },
    isDemoMode: boolean = false,
    userImage?: string
  ): Promise<{ text: string, legalPayload?: LegalResultsPayload }> => {

    if (isDemoMode && userMessage.toLowerCase().includes('find')) {
       await new Promise(r => setTimeout(r, 1000));
       return { text: "I found some notaries nearby.", legalPayload: MOCK_LEGAL_PAYLOAD };
    }
    
    // We use gemini-3-pro-preview for advanced reasoning (Drafting) AND Tools (Search)
    const model = 'gemini-3-pro-preview';

    const systemPrompt = `You are "Rwanda Document Assistant," a specialized legal AI. 

CAPABILITIES:
1. **DISCOVERY**: Find Notaries, Bailiffs, and Law Firms near the user.
2. **DRAFTING**: Help draft contracts (Sales, Rent, Employment) by extracting info from uploaded IDs/Docs (OCR).

DISCOVERY RULES (When asked to FIND/SEARCH):
- Use Google Maps/Search to find professionals.
- STRICT PAGINATION: Return max 20 results per page.
- If results > 20, set "has_more": true and "next_page": 2.
- JSON Schema for Search Results:
{
  "query_summary": "Found 5 notaries.",
  "pagination": { "page_size": 20, "page": 1, "has_more": true, "next_page": 2 },
  "matches": [
    {
      "name": "string",
      "category": "Notary|Lawyer|Bailiff",
      "address": "string",
      "phone": "string",
      "confidence": "High|Medium",
      "whatsapp_draft": "string"
    }
  ],
  "disclaimer": "Verify credentials."
}

DRAFTING RULES (When asked to WRITE/DRAFT):
- Perform OCR on uploaded images.
- Ask for missing details.
- Draft the document text.
- DO NOT return the "matches" JSON schema, just return the text response.
`;

    const tools = [
        { googleMaps: {} }, 
        { googleSearch: {} },
        // Drafting Tools Stub
        { functionDeclarations: [
           { name: "generate_pdf", description: "Generates PDF", parameters: { type: "OBJECT", properties: { text: { type: "STRING" } } } } 
        ]}
    ];

    try {
      const chat = ai.chats.create({
        model: model,
        config: {
          systemInstruction: systemPrompt,
          tools: tools,
          toolConfig: { retrievalConfig: { latLng: { latitude: userLocation.lat, longitude: userLocation.lng } } }
        },
        history: formatHistory(history)
      });

      const result = await chat.sendMessage({ 
          parts: createUserParts(userMessage, userImage) 
      });
      
      const fullText = result.text || "";
      const parsedJson = extractJson(fullText);
      let cleanText = fullText.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').trim();
      
      let payload: LegalResultsPayload | undefined = undefined;

      // If response matches Search Schema
      if (parsedJson && parsedJson.matches) {
          if (!cleanText) cleanText = parsedJson.query_summary || "Here are the legal professionals found.";
          payload = {
              query_summary: parsedJson.query_summary,
              pagination: parsedJson.pagination,
              matches: parsedJson.matches.map((m: any, idx: number) => ({
                 id: `leg-${idx}-${Date.now()}`,
                 name: m.name,
                 category: m.category,
                 distance: m.distance || 'Unknown', // AI might not always return distance field if not in Maps tool result directly, ensure schema alignment
                 approx_distance_km: m.approx_distance_km,
                 isOpen: true, // simplified
                 confidence: m.confidence,
                 snippet: m.address,
                 address: m.address,
                 phoneNumber: m.phone,
                 whatsappDraft: m.whatsapp_draft
              })),
              disclaimer: parsedJson.disclaimer
          };
      }

      return { text: cleanText, legalPayload: payload };

    } catch (error) {
      console.error("Gemini Legal Agent Error:", error);
      return { text: "I'm having trouble connecting right now. Please try again." };
    }
  },
  
  chatWaiterAgent: async (history: Message[], userMessage: string, businessId: string) => {
      // Mock implementation unchanged
      return { text: "Waiter: I received your order.", orderSummary: undefined };
  }
};
