
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
  prompt: string, 
  tools?: any[], 
  userLocation?: { lat: number, lng: number }
): Promise<string> => {
  
  // Construct Tool Config for Maps Grounding if Maps tool is present
  let toolConfig: any = undefined;
  if (userLocation && tools?.some(t => t.googleMaps)) {
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

  // 2. Fallback to Direct Client Call (Prototype Mode)
  try {
      console.log("Using Direct Gemini Client (Fallback)");
      const model = 'gemini-2.5-flash';
      
      const config: any = {};
      if (tools) config.tools = tools;
      if (toolConfig) config.toolConfig = toolConfig;

      const result = await clientAI.models.generateContent({
          model: model,
          contents: prompt,
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

// --- AGENTS IMPLEMENTATION ---

export const GeminiService = {

  chatSupport: async (
    history: Message[],
    userMessage: string,
    userImage?: string
  ): Promise<string> => {
    const systemPrompt = `You are the Support Agent for "easyMO", the discovery app for Rwanda.
    Knowledge:
    - Rides: "Find Ride" on Home.
    - MoMo: "MoMo QR" generator.
    - Market: Finds goods/services (use Bob).
    - Legal Drafter: Gatera (in Services tab).
    
    Answer briefly and helpfully. If they need to talk to a human admin, tell them to use the WhatsApp button on the Support page.`;

    const prompt = formatPromptFromHistory(history, systemPrompt, userMessage, "Unknown");
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

  chatBob: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number },
    isDemoMode: boolean = false,
    userImage?: string
  ): Promise<{ text: string, businessPayload?: BusinessResultsPayload, groundingLinks?: { title: string; uri: string }[] }> => {
    
    const locStr = `${userLocation.lat}, ${userLocation.lng}`;
    const systemPrompt = `You are "Bob", easyMO's Hyper-Aggressive Procurement Agent.
    
    YOUR GOAL: Conduct an exhaustive search to find up to 30 nearby businesses that might have the requested item/service.
    
    SEARCH STRATEGY:
    1. **Google Maps (Proximity):** Search strictly within 10km first. Look for established businesses.
    2. **Google Search (Social/Informal):** Search for "Item name Kigali Instagram", "Item name Rwanda Facebook", "Item name Jiji Rwanda" to find informal sellers or boutiques without maps listings.
    3. **Aggressive Listing:** Do not stop at 5. List as many viable candidates as possible (target 20-30).
    
    DATA EXTRACTION:
    - **Phone:** Crucial. If a Maps result has no phone, try to find it via Search.
    - **Name:** Use the business name or the social handle.
    - **Distance:** Estimate distance from user location (${locStr}).
    - **Prioritize:** Order by PROXIMITY (closest first).
    
    JSON SCHEMA (Strict):
    {
      "query_summary": "I found 28 potential sellers nearby, including 5 from Instagram...",
      "need_description": "2 bags of cement", 
      "user_location_label": "Kicukiro",
      "matches": [ 
        { 
          "name": "Business/Person Name", 
          "phone": "+250...", 
          "category": "Hardware", 
          "distance": "0.5km",
          "snippet": "Found on Instagram: @hardware_rw" 
        } 
      ]
    }
    
    End your response with this JSON block.`;

    const prompt = formatPromptFromHistory(history, systemPrompt, userMessage, locStr);
    
    const tools = [{googleSearch: {}}, {googleMaps: {}}];
    const rawText = await askGemini(prompt, tools, userLocation); 
    
    // Trigger Memory Loop
    runBackgroundMemoryExtraction(userMessage, rawText);

    const parsedJson = extractJson(rawText);
    const cleanText = rawText.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').replace(/\{[\s\S]*\}/g, '').trim();

    let payload: BusinessResultsPayload | undefined;
    if (parsedJson && Array.isArray(parsedJson.matches)) {
        payload = {
            query_summary: parsedJson.query_summary,
            need_description: parsedJson.need_description,
            user_location_label: parsedJson.user_location_label,
            category: parsedJson.category,
            matches: parsedJson.matches.map((m: any, idx: number) => ({
                id: `gen-${idx}`,
                name: m.name || "Unknown",
                category: m.category || 'Business',
                distance: m.distance || 'Nearby',
                phoneNumber: normalizePhoneNumber(m.phone) || m.phone,
                confidence: 'High',
                address: m.address,
                snippet: m.snippet,
                whatsappDraft: `Hello, I found you on easyMO. Do you have availability for: ${parsedJson.need_description}?`
            }))
        };
    }

    return { text: cleanText || "Here is what I found:", businessPayload: payload };
  },

  chatKeza: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number }, 
    isDemoMode: boolean = false,
    userImage?: string
  ): Promise<{ text: string, propertyPayload?: PropertyResultsPayload, groundingLinks?: { title: string; uri: string }[] }> => {
    
    const locStr = `${userLocation.lat}, ${userLocation.lng}`;
    const systemPrompt = `You are "Keza", easyMO's Real Estate Concierge.
    
    YOUR JOB:
    Find apartments, houses, and land for Rent or Sale in Rwanda.
    Use Google Maps to find Real Estate Agencies and specific property listings if available.
    
    JSON SCHEMA:
    {
       "query_summary": "Found 3 apartments in Gisozi...",
       "matches": [
          { "title": "2 Bedroom Apartment", "price": 300000, "currency": "RWF", "listing_type": "rent", "contact_phone": "+250...", "area_label": "Gisozi" }
       ]
    }`;

    const prompt = formatPromptFromHistory(history, systemPrompt, userMessage, locStr);
    const tools = [{googleSearch: {}}, {googleMaps: {}}];
    const rawText = await askGemini(prompt, tools, userLocation);
    
    runBackgroundMemoryExtraction(userMessage, rawText);

    const parsedJson = extractJson(rawText);
    const cleanText = rawText.replace(/```json[\s\S]*?```/g, '').replace(/\{[\s\S]*\}/g, '').trim();

    let payload: PropertyResultsPayload | undefined;
    if (parsedJson && Array.isArray(parsedJson.matches)) {
        payload = {
            query_summary: parsedJson.query_summary || "Properties found.",
            filters_applied: { listing_type: 'unknown', property_type: 'unknown', budget_min: 0, budget_max: 0, area: '', radius_km: 0, sort: 'default' },
            disclaimer: "Confirm availability with agent.",
            pagination: { page: 1, page_size: 10, has_more: false },
            matches: parsedJson.matches.map((m: any, idx: number) => ({
                id: `prop-${idx}`,
                title: m.title || "Property",
                property_type: "Apartment",
                listing_type: m.listing_type || "rent",
                price: m.price || 0,
                currency: m.currency || "RWF",
                bedroom_count: m.bedroom_count || 2,
                bathroom_count: m.bathroom_count || 1,
                area_label: m.area_label || "Kigali",
                approx_distance_km: 1.2,
                contact_phone: normalizePhoneNumber(m.contact_phone),
                confidence: 'high',
                why_recommended: "Matches your criteria",
                whatsapp_draft: `Hello, I am interested in ${m.title} available for ${m.listing_type}.`
            }))
        };
    }

    return { text: cleanText || "Here are some listings.", propertyPayload: payload };
  },

  chatGatera: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number }, 
    isDemoMode: boolean = false,
    userImage?: string
  ): Promise<{ text: string, legalPayload?: LegalResultsPayload, groundingLinks?: { title: string; uri: string }[] }> => {
    
    const systemPrompt = `You are "Gatera", Rwanda's Premier AI Legal Expert.
    
    You have exactly TWO distinct operating modes. You must auto-detect which mode to use based on the user's request.

    **CRITICAL RULES:**
    - You are NOT a directory. Do NOT search for lawyers, notaries, or bailiffs.
    - You do NOT use Google Maps.
    - You ONLY use Google Search for legal research.
    - If user asks to find a lawyer/notary, reply: "I am a Legal Advisor and Contract Drafter. To find a lawyer or notary near you, please use Bob in the Market tab."

    === MODE 1: LEGAL ADVISOR (Research & Advice) ===
    Trigger: User asks a legal question, asks for advice, clarification on laws, or rights (e.g., "Can I fire my maid?", "What is the penalty for drunk driving?", "How to register a company?").
    
    **Knowledge Source:** 
    - You have access to the Rwandan Legal Corpus via Google Search.
    
    **Advisory Protocol (IRAC Method):**
    1. **Issue:** Clearly state the legal question.
    2. **Rule:** CITE specific Articles and Laws using Google Search results (Constitution of 2003, Penal Code, Labor Law 2018, Land Law, Commercial Recovery, Family Law). Do NOT invent laws.
    3. **Analysis:** Apply the law to the user's situation. Explain in simple, accessible terms (English/Kinyarwanda/French).
    4. **Conclusion:** Give a concrete recommendation.
    
    *Formatting:* Use Bold for Articles. Use bullet points for steps.
    *Disclaimer:* ALWAYS end with: "Disclaimer: I am an AI. This is information, not legal counsel. Consult a Bar Association lawyer for court representation."

    === MODE 2: CONTRACT DRAFTER ===
    Trigger: User asks to "write", "draft", "make" a contract, agreement, letter, or affidavit.
    
    **Protocol:**
    1. **Intake:** Ask for specific details (Names, IDs, Amounts, Dates) if missing.
    2. **Drafting:** Generate a professional, execution-ready document.
    3. **Legal Basis:** Even when drafting, briefly mention the relevant law (e.g., "Drafted in accordance with the Law governing Contracts").
    4. **Localization:** Use the requested language (default English).

    ===================================================
    **Output Instructions:**
    Provide rich text for ADVICE or DRAFT responses. Do NOT return JSON for lawyer listings.
    `;
    
    const prompt = formatPromptFromHistory(history, systemPrompt, userMessage, `${userLocation.lat},${userLocation.lng}`);
    const tools = [{googleSearch: {}}];
    const rawText = await askGemini(prompt, tools, userLocation); 
    
    runBackgroundMemoryExtraction(userMessage, rawText);

    const parsedJson = extractJson(rawText);
    const cleanText = rawText.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').replace(/\{[\s\S]*\}/g, '').trim();

    let legalPayload: LegalResultsPayload | undefined;
    if (parsedJson && Array.isArray(parsedJson.matches)) {
        legalPayload = {
            query_summary: "Here are recommended legal professionals:",
            matches: parsedJson.matches.map((m: any, idx: number) => ({
                id: `legal-${idx}`,
                name: m.name,
                category: m.category || 'Lawyer',
                distance: m.distance || 'Kigali',
                phoneNumber: normalizePhoneNumber(m.phone) || m.phone,
                confidence: 'High',
                snippet: m.snippet,
                whatsappDraft: "Hello Counsel, I found you on easyMO and require legal assistance."
            }))
        };
    }

    return { text: cleanText || rawText, legalPayload };
  },
  
  // Aliases
  chatBuySellAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatBob(h, m, l, d, i),
  chatRealEstateAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatKeza(h, m, l, d, i),
  chatLegalAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatGatera(h, m, l, d, i),
};
