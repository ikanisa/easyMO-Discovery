
import { Message, BusinessResultsPayload, PropertyResultsPayload, LegalResultsPayload } from '../types';
import { normalizePhoneNumber } from '../utils/phone';
import { callBackend } from './api';
import { GoogleGenAI } from "@google/genai";
import { MemoryService } from './memory';

// Fallback Client-Side Instance
const clientAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- SECURITY FIX: No Client-Side API Keys ---

/**
 * Proxies the prompt to the Google Apps Script Backend.
 * Protocol: POST { "action": "secure_gemini", "prompt": "...", "tools": [...], "location": {...} }
 */
const askGemini = async (
  prompt: string | any[], 
  tools?: any[], 
  userLocation?: { lat: number, lng: number }
): Promise<string> => {
  
  // Construct Tool Config for Maps Grounding if Maps tool is present
  let toolConfig: any = undefined;
  if (userLocation && tools?.some((t: any) => t.googleMaps)) {
      toolConfig = {
          retrievalConfig: {
              latLng: {
                  latitude: userLocation.lat,
                  longitude: userLocation.lng
              }
          }
      };
  }

  // 1. Try Backend (Secure)
  // Note: Backend currently only supports string prompts. If using attachments, we might need client-side fallback 
  // or update backend to handle multipart. For now, if complex prompt, skip backend or serialize.
  if (typeof prompt === 'string') {
    try {
      const response = await callBackend({
        action: "secure_gemini",
        prompt: prompt,
        tools: tools,
        toolConfig: toolConfig // Pass config to backend
      });
      
      if (response.status === 'success' && response.text) {
          return response.text;
      }
      
      console.warn("Backend Gemini Failed, falling back to client-side:", response.message || response.error);
    } catch (e) {
      console.error("Secure Gemini Net Error, falling back:", e);
    }
  }

  // 2. Fallback to Direct Client Call (Prototype Mode)
  try {
      console.log("Using Direct Gemini Client (Fallback)");
      const model = 'gemini-2.5-flash';
      
      const config: any = {};
      if (tools) config.tools = tools;
      if (toolConfig) config.toolConfig = toolConfig;

      // Format contents for SDK
      let contents: any;
      if (Array.isArray(prompt)) {
          // It's a list of parts (Text + InlineData)
          contents = { role: 'user', parts: prompt };
      } else {
          contents = prompt;
      }

      const result = await clientAI.models.generateContent({
          model: model,
          contents: contents,
          config: config
      });
      return result.text || "No response generated.";
  } catch (clientError: any) {
      console.error("Direct Gemini Client Error:", clientError);
      return "I am having trouble connecting to the brain (Both Secure & Direct channels failed).";
  }
};

// --- ROBUST HELPERS ---

const extractJson = (text: string): any | null => {
  try {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) return JSON.parse(jsonMatch[1]);
    
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) return JSON.parse(text.substring(start, end + 1));
  } catch (e) {
    console.warn("JSON extraction failed", e);
  }
  return null;
};

// Background Fact Extraction
// This runs AFTER the main response to keep UI snappy
const runBackgroundMemoryExtraction = async (userMessage: string, aiResponse: string) => {
  try {
    // Only run if message is substantial
    if (userMessage.length < 15) return;

    const extractionPrompt = `
      Analyze the following interaction. 
      Did the USER state a generic preference, a personal fact, or a specific ongoing need that should be remembered?
      
      User: "${userMessage}"
      AI: "${aiResponse}"
      
      Rules:
      - Ignore one-off queries (e.g. "find pizza").
      - Capture enduring facts (e.g. "I am vegetarian", "I live in Kicukiro", "I have a RAV4").
      - Output JSON ONLY: { "fact": "string", "category": "preference" | "fact" | "context" }
      - If nothing worth remembering, output "null".
    `;

    // We use a cheaper/faster call or the same model
    const result = await askGemini(extractionPrompt);
    const data = extractJson(result);

    if (data && data.fact) {
      console.log("🧠 Memory Extracted:", data.fact);
      await MemoryService.addMemory(data.fact, data.category || 'fact');
    }
  } catch (e) {
    // Fail silently in background
    console.warn("Memory extraction failed", e);
  }
};

// Flatten chat history into a string script for the "stateless" backend proxy
const formatPromptFromHistory = (history: Message[], systemInstruction: string, userMessage: string, locationStr: string): string => {
  // 1. Get Long Term Memory Context
  const memoryBlock = MemoryService.getContextBlock();

  // 2. Compress History (STM)
  // We take the last 10 messages to keep the prompt lean, assuming memoryBlock handles long-term context
  const recentHistory = history
    .filter(m => m.sender !== 'system')
    .slice(-10) 
    .map(m => `${m.sender === 'user' ? 'User' : 'AI'}: ${m.text}`)
    .join('\n');

  return `
${systemInstruction}

${memoryBlock}

CONTEXT:
User Location: ${locationStr}

RECENT HISTORY:
${recentHistory}

CURRENT REQUEST:
User: ${userMessage}

AI Response:
`;
};

// Helper to construct prompt with attachment
const constructPromptWithAttachment = (textPrompt: string, attachment?: { mimeType: string, data: string }) => {
    if (!attachment) return textPrompt;
    return [
        { text: textPrompt },
        { inlineData: { mimeType: attachment.mimeType, data: attachment.data } }
    ];
};

// --- AGENTS IMPLEMENTATION ---

export const GeminiService = {

  chatSupport: async (
    history: Message[],
    userMessage: string,
    attachment?: { mimeType: string, data: string }
  ): Promise<string> => {
    const systemPrompt = `You are the Support Agent for "easyMO", the discovery app for Rwanda.
    Knowledge:
    - Rides: "Find Ride" on Home.
    - MoMo: "MoMo QR" generator.
    - Market: Finds goods/services (use Bob).
    - Legal Drafter: Gatera (in Services tab).
    
    Answer briefly and helpfully. If they need to talk to a human admin, tell them to use the WhatsApp deep link button.`;

    const promptText = formatPromptFromHistory(history, systemPrompt, userMessage, "Unknown");
    const prompt = constructPromptWithAttachment(promptText, attachment);
    
    const response = await askGemini(prompt);
    
    // Trigger Memory Loop
    runBackgroundMemoryExtraction(userMessage, response);
    
    return response;
  },

  resolveLocation: async (query: string, userLat?: number, userLng?: number): Promise<{ address: string, lat?: number, lng?: number, name?: string }> => {
    const systemPrompt = `You are a Location Resolver.
    Your Job: Take a place name or description and find the exact official address and coordinates using Google Maps data.
    Input: "${query}"
    Context: User is likely in Rwanda (approx lat -1.9, lng 30.0).
    OUTPUT JSON ONLY: { "address": "Full formatted address", "lat": -1.9xxxx, "lng": 30.0xxxx, "name": "Place Name" }
    If you cannot find it, guess the best approximate location in Kigali or return null values.`;

    const prompt = `
    ${systemPrompt}
    User Query: ${query}
    ${userLat ? `User Coords: ${userLat}, ${userLng}` : ''}
    `;

    const raw = await askGemini(prompt, [{googleSearch: {}}, {googleMaps: {}}], userLat && userLng ? { lat: userLat, lng: userLng } : undefined);
    const data = extractJson(raw);
    
    if (data && data.address) return data;
    return { address: query }; 
  },

  getLocationInsight: async (lat: number, lng: number): Promise<string> => {
    const prompt = `
      Act as a local guide. I am at coordinates: ${lat}, ${lng} in Rwanda.
      In 10 words or less, describe this area. Be concise and accurate.
    `;
    const text = await askGemini(prompt, [{googleMaps: {}}], { lat, lng });
    return text.replace(/"/g, '').trim();
  },

  // --- NEW: ONBOARDING AGENT ---
  onboardBusiness: async (
    history: Message[],
    userMessage: string,
    userLocation: { lat: number, lng: number }
  ): Promise<{ text: string, extractedData?: { name?: string, description?: string, address?: string, location?: {lat: number, lng: number} } }> => {
    
    const locStr = `${userLocation.lat}, ${userLocation.lng}`;
    const systemPrompt = `You are "OnboardBot", an assistant helping a business owner register their shop on the easyMO app.
    
    YOUR GOAL: Gather 3 key pieces of info: Business Name, Business Description, and Location.
    
    CAPABILITIES:
    1. **Google Maps Search:** If the user gives a business name, search Google Maps immediately. 
       - If found, extract the official address and description. Tell the user you found it.
       - If NOT found, ask the user to describe what they do and where they are located.
    2. **Description Refinement:** If the user types a description (e.g. "sell food"), rewrite it to be professional (e.g. "Authentic local restaurant serving fresh daily specials").
    
    PROTOCOL:
    - Be conversational but concise.
    - If user provides a name, SEARCH for it.
    - If user provides a raw description, IMPROVE it.
    
    OUTPUT JSON SCHEMA (Always include at end of response):
    {
      "extracted": {
         "name": "Business Name (if known)",
         "description": "Professional description (if known)",
         "address": "Address string (if known)",
         "location": { "lat": 0.0, "lng": 0.0 } (if known from Maps)
      }
    }
    `;

    const promptText = formatPromptFromHistory(history, systemPrompt, userMessage, locStr);
    const tools = [{googleSearch: {}}, {googleMaps: {}}];
    
    const rawText = await askGemini(promptText, tools, userLocation);
    const parsedJson = extractJson(rawText);
    const cleanText = rawText.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').replace(/\{[\s\S]*\}/g, '').trim();

    return { 
        text: cleanText || "I've processed your details.",
        extractedData: parsedJson?.extracted
    };
  },

  chatBob: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number },
    isDemoMode: boolean = false,
    attachment?: { mimeType: string, data: string }
  ): Promise<{ text: string, businessPayload?: BusinessResultsPayload, groundingLinks?: { title: string; uri: string }[] }> => {
    
    const locStr = `${userLocation.lat}, ${userLocation.lng}`;
    const systemPrompt = `You are "Bob", easyMO's Hyper-Aggressive Procurement Agent.
    
    YOUR MISSION: Find **up to 30** businesses nearby that match the user's need. Quantity and Proximity are key.
    
    SEARCH STRATEGY:
    1. **Google Maps (Primary):** Search efficiently within 10km. Find *every* relevant business, not just the top 5.
    2. **Google Search (Secondary):** If Maps data is sparse, search for "Item name Kigali Instagram", "Item name Rwanda Facebook", "Item name Jiji" to find informal sellers.
    3. **Contact Harvesting:** You MUST find a phone number. If a Maps result has no phone, use Search to find it.
    
    FILTERING RULES:
    - **Phone Number Mandatory:** Prioritize businesses with a phone number. We need to WhatsApp them.
    - **Proximity:** Sort by distance (closest first).
    - **Volume:** Return as many valid candidates as possible (Target: 30).
    
    JSON SCHEMA (Strict):
    {
      "query_summary": "I found 28 potential sellers nearby. 20 have phone numbers ready for contact.",
      "need_description": "2 bags of cement", 
      "user_location_label": "Kicukiro",
      "category": "Hardware",
      "matches": [ 
        { 
          "name": "Business Name", 
          "phone": "+250...", 
          "category": "Hardware", 
          "distance": "0.5km",
          "address": "Kicukiro Centre",
          "snippet": "Found on Maps. highly rated." 
        } 
      ]
    }
    
    Output the JSON block at the end.`;

    const promptText = formatPromptFromHistory(history, systemPrompt, userMessage, locStr);
    const prompt = constructPromptWithAttachment(promptText, attachment);
    
    const tools = [{googleSearch: {}}, {googleMaps: {}}];
    const rawText = await askGemini(prompt, tools, userLocation); 
    
    runBackgroundMemoryExtraction(userMessage, rawText);

    const parsedJson = extractJson(rawText);
    const cleanText = rawText.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').replace(/\{[\s\S]*\}/g, '').trim();

    let payload: BusinessResultsPayload | undefined;
    if (parsedJson && Array.isArray(parsedJson.matches)) {
        // Post-processing: Normalize phones and filter invalid ones
        const validMatches = parsedJson.matches
            .map((m: any, idx: number) => ({
                id: `gen-${idx}`,
                name: m.name || "Unknown",
                category: m.category || parsedJson.category || 'Business',
                distance: m.distance || 'Nearby',
                phoneNumber: normalizePhoneNumber(m.phone) || null, // Robust normalization
                confidence: 'High',
                address: m.address,
                snippet: m.snippet,
                whatsappDraft: `Hello ${m.name}, I found you on easyMO. Do you have availability for: ${parsedJson.need_description}?`
            }))
            .filter((m: any) => m.phoneNumber !== null); // Filter out results we can't contact

        payload = {
            query_summary: parsedJson.query_summary,
            need_description: parsedJson.need_description,
            user_location_label: parsedJson.user_location_label,
            category: parsedJson.category,
            matches: validMatches
        };
    }

    return { text: cleanText || "I've searched the area. Here are the businesses I found with contact details:", businessPayload: payload };
  },

  chatKeza: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number }, 
    isDemoMode: boolean = false,
    attachment?: { mimeType: string, data: string }
  ): Promise<{ text: string, propertyPayload?: PropertyResultsPayload, groundingLinks?: { title: string; uri: string }[] }> => {
    
    const locStr = `${userLocation.lat}, ${userLocation.lng}`;
    const systemPrompt = `You are "Keza", easyMO's Real Estate Concierge.
    
    YOUR MISSION: Find available properties (Rent/Sale) by exhaustively searching Agencies, Google Maps, and Social Media listings (Instagram/Facebook/Jiji).
    
    PRIORITY:
    1. **Contact Info:** Listings WITHOUT phone numbers are useless. Find the agent/landlord's number.
    2. **Location Accuracy:** Be specific about the neighborhood (e.g., Gisozi, Kibagabaga).
    3. **Volume:** Provide a robust list of options (Target: 10-15).
    
    JSON SCHEMA:
    {
       "query_summary": "Found 12 apartments in Gisozi...",
       "matches": [
          { 
            "title": "2 Bedroom Apartment", 
            "price": 300000, 
            "currency": "RWF", 
            "listing_type": "rent", 
            "contact_phone": "+250...", 
            "area_label": "Gisozi",
            "why_recommended": "Good price for location"
          }
       ]
    }`;

    const promptText = formatPromptFromHistory(history, systemPrompt, userMessage, locStr);
    const prompt = constructPromptWithAttachment(promptText, attachment);
    const tools = [{googleSearch: {}}, {googleMaps: {}}];
    const rawText = await askGemini(prompt, tools, userLocation);
    
    runBackgroundMemoryExtraction(userMessage, rawText);

    const parsedJson = extractJson(rawText);
    const cleanText = rawText.replace(/```json[\s\S]*?```/g, '').replace(/\{[\s\S]*\}/g, '').trim();

    let payload: PropertyResultsPayload | undefined;
    if (parsedJson && Array.isArray(parsedJson.matches)) {
        const validMatches = parsedJson.matches
            .map((m: any, idx: number) => ({
                id: `prop-${idx}`,
                title: m.title || "Property",
                property_type: m.property_type || "Apartment",
                listing_type: m.listing_type || "rent",
                price: m.price || 0,
                currency: m.currency || "RWF",
                bedroom_count: m.bedroom_count || null,
                bathroom_count: m.bathroom_count || null,
                area_label: m.area_label || "Kigali",
                approx_distance_km: 1.5,
                contact_phone: normalizePhoneNumber(m.contact_phone),
                confidence: 'high',
                why_recommended: m.why_recommended || "Matches criteria",
                whatsapp_draft: `Hello, I am interested in ${m.title} available for ${m.listing_type}.`
            }))
            .filter((m: any) => m.contact_phone !== null);

        payload = {
            query_summary: parsedJson.query_summary || "Properties found.",
            filters_applied: { listing_type: 'unknown', property_type: 'unknown', budget_min: 0, budget_max: 0, area: '', radius_km: 0, sort: 'default' },
            disclaimer: "Confirm availability with agent.",
            pagination: { page: 1, page_size: 10, has_more: false },
            matches: validMatches
        };
    }

    return { text: cleanText || "Here are some listings with contacts.", propertyPayload: payload };
  },

  chatGatera: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number }, 
    isDemoMode: boolean = false,
    attachment?: { mimeType: string, data: string }
  ): Promise<{ text: string, legalPayload?: LegalResultsPayload, groundingLinks?: { title: string; uri: string }[] }> => {
    
    const systemPrompt = `You are "Gatera", Rwanda's Premier AI Legal Expert.
    
    CONSTRAINT: You DO NOT use Google Maps. You rely solely on Google Search for legal texts and directories.
    
    MODES:
    1. **Legal Advisor (IRAC):** Answer questions using specific Articles/Laws (Penal Code, Labor Law, etc.). Be precise.
    2. **Contract Drafter:** Generate professional agreements/letters in English/French/Kinyarwanda.
    3. **Professional Finder (Text-Based):** If user asks for a lawyer/notary, search for "List of Advocates in Rwanda" or "Notaries in Kigali" via Google Search and list their names/contacts found in text results. Do NOT try to plot them on a map.
    
    JSON SCHEMA (Only if recommending professionals):
    {
       "matches": [
          { "name": "Me. John Doe", "category": "Advocate", "phone": "+250...", "distance": "Kigali", "snippet": "Found in Bar Association list" }
       ]
    }
    
    Disclaimer: Always remind user you are an AI, not a substitute for a human lawyer in court.
    `;
    
    const promptText = formatPromptFromHistory(history, systemPrompt, userMessage, "Rwanda");
    const prompt = constructPromptWithAttachment(promptText, attachment);
    
    // REMOVED googleMaps from tools for Gatera
    const tools = [{googleSearch: {}}];
    
    const rawText = await askGemini(prompt, tools, userLocation); 
    
    runBackgroundMemoryExtraction(userMessage, rawText);

    const parsedJson = extractJson(rawText);
    const cleanText = rawText.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').replace(/\{[\s\S]*\}/g, '').trim();

    let legalPayload: LegalResultsPayload | undefined;
    if (parsedJson && Array.isArray(parsedJson.matches)) {
        legalPayload = {
            query_summary: "Here are recommended legal professionals found in directories:",
            matches: parsedJson.matches.map((m: any, idx: number) => ({
                id: `legal-${idx}`,
                name: m.name,
                category: m.category || 'Lawyer',
                distance: m.distance || 'Kigali',
                phoneNumber: normalizePhoneNumber(m.phone) || m.phone,
                confidence: 'High',
                snippet: m.snippet,
                whatsappDraft: "Hello Counsel, I found you on easyMO and require legal assistance."
            })).filter((m: any) => m.phoneNumber !== null)
        };
    }

    return { text: cleanText || rawText, legalPayload };
  },
  
  // Aliases
  chatBuySellAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatBob(h, m, l, d, i),
  chatRealEstateAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatKeza(h, m, l, d, i),
  chatLegalAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatGatera(h, m, l, d, i),
};