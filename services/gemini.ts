
import { Message, BusinessResultsPayload, PropertyResultsPayload, LegalResultsPayload } from '../types';
import { normalizePhoneNumber } from '../utils/phone';
import { callBackend } from './api';
import { GoogleGenAI } from "@google/genai";
import { MemoryService } from './memory';

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
  if (typeof prompt === 'string') {
    try {
      const response = await callBackend({
        action: "secure_gemini",
        prompt: prompt,
        tools: tools,
        toolConfig: toolConfig 
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
      // Fix: Create instance just-in-time as per guidelines to ensure current key usage, exclusively using process.env.API_KEY.
      const clientAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Fix: Select model based on task. Maps grounding requires 2.5 series.
      // General text tasks use gemini-3-flash-preview.
      const isMaps = tools?.some((t: any) => t.googleMaps);
      const model = isMaps ? 'gemini-2.5-flash' : 'gemini-3-flash-preview';
      
      const config: any = {};
      if (tools) config.tools = tools;
      if (toolConfig) config.toolConfig = toolConfig;

      let contents: any;
      // Fix: For multi-part prompts (arrays), wrap them in an object with a parts array, omitting the unnecessary role field.
      if (Array.isArray(prompt)) {
          contents = { parts: prompt };
      } else {
          contents = prompt;
      }

      // Fix: Use ai.models.generateContent to query the model with name and contents directly.
      const result = await clientAI.models.generateContent({
          model: model,
          contents: contents,
          config: config
      });
      // Fix: Correctly access the generated text using the .text property directly.
      return result.text || "No response generated.";
  } catch (clientError: any) {
      console.error("Direct Gemini Client Error:", clientError);
      return "I am having trouble connecting to the brain (Both Secure & Direct channels failed).";
  }
};

// --- ROBUST HELPERS ---

const extractJson = (text: string): any | null => {
  let clean = text.trim();
  
  // 1. Try to find Markdown block
  const jsonMatch = clean.match(/```json\s*([\s\S]*?)\s*```/i) || clean.match(/```\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    clean = jsonMatch[1].trim();
  } else {
    // 2. Fallback: Find first '{' and last '}'
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      clean = clean.substring(start, end + 1);
    }
  }

  try {
    return JSON.parse(clean);
  } catch (e) {
    // 3. Attempt simple repairs (trailing commas)
    try {
        const repaired = clean.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        return JSON.parse(repaired);
    } catch (e2) {
        console.debug("JSON extraction failed:", e2);
    }
  }
  return null;
};

// Background Fact Extraction
const runBackgroundMemoryExtraction = async (userMessage: string, aiResponse: string) => {
  try {
    if (userMessage.length < 15) return;

    const extractionPrompt = `
      Analyze interaction.
      User: "${userMessage}"
      AI: "${aiResponse}"
      Identify user PREFERENCES or FACTS (e.g. "I live in Kicukiro", "Vegetarian").
      Output JSON: { "fact": "string", "category": "preference" | "fact" | "context" }
      If none, output "null".
    `;

    const result = await askGemini(extractionPrompt);
    const data = extractJson(result);

    if (data && data.fact) {
      console.log("🧠 Memory Extracted:", data.fact);
      await MemoryService.addMemory(data.fact, data.category || 'fact');
    }
  } catch (e) {
    console.warn("Memory extraction failed", e);
  }
};

const formatPromptFromHistory = (history: Message[], systemInstruction: string, userMessage: string, locationStr: string): string => {
  const memoryBlock = MemoryService.getContextBlock();
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
    
    Answer briefly and helpfully.`;

    const promptText = formatPromptFromHistory(history, systemPrompt, userMessage, "Unknown");
    const prompt = constructPromptWithAttachment(promptText, attachment);
    
    const response = await askGemini(prompt);
    runBackgroundMemoryExtraction(userMessage, response);
    return response;
  },

  resolveLocation: async (query: string, userLat?: number, userLng?: number): Promise<{ address: string, lat?: number, lng?: number, name?: string }> => {
    const prompt = `
    Resolve location: "${query}" in Rwanda.
    User Coords: ${userLat}, ${userLng}
    OUTPUT JSON: { "address": "string", "lat": number, "lng": number, "name": "string" }
    `;
    const raw = await askGemini(prompt, [{googleSearch: {}}, {googleMaps: {}}], userLat && userLng ? { lat: userLat, lng: userLng } : undefined);
    const data = extractJson(raw);
    if (data && data.address) return data;
    return { address: query }; 
  },

  getLocationInsight: async (lat: number, lng: number): Promise<string> => {
    const prompt = `Act as a local guide. Describe area at ${lat}, ${lng} in Rwanda in 10 words.`;
    const text = await askGemini(prompt, [{googleMaps: {}}], { lat, lng });
    return text.replace(/"/g, '').trim();
  },

  onboardBusiness: async (
    history: Message[],
    userMessage: string,
    userLocation: { lat: number, lng: number }
  ): Promise<{ text: string, extractedData?: { name?: string, description?: string, address?: string, location?: {lat: number, lng: number} } }> => {
    const systemPrompt = `You are "OnboardBot". Help user register business.
    Goal: Get Name, Description, Location.
    Search Maps if they give a name.
    OUTPUT JSON at end: { "extracted": { "name": "...", "description": "...", "address": "...", "location": { "lat": 0, "lng": 0 } } }
    `;
    const promptText = formatPromptFromHistory(history, systemPrompt, userMessage, `${userLocation.lat}, ${userLocation.lng}`);
    const rawText = await askGemini(promptText, [{googleSearch: {}}, {googleMaps: {}}], userLocation);
    const parsedJson = extractJson(rawText);
    
    let cleanText = rawText.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').replace(/\{[\s\S]*\}/g, '').trim();
    if (!cleanText && parsedJson) cleanText = "I've updated the details.";

    return { 
        text: cleanText || "Processing...",
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
    const systemPrompt = `You are "Bob", easyMO's Procurement Agent.
    
    1. SEARCH: Google Maps for "${userMessage}" near ${locStr}. Find up to 30 results.
    2. FILTER: Must have phone numbers.
    3. FORMAT: Output STRICT JSON.
    
    JSON SCHEMA:
    {
      "query_summary": "Found 20 hardware stores in Kicukiro.",
      "need_description": "short item name", 
      "user_location_label": "Kicukiro",
      "category": "Category Name",
      "matches": [ 
        { 
          "name": "Name", 
          "phone": "+250...", 
          "category": "Cat", 
          "distance": "0.5km",
          "address": "Addr",
          "snippet": "Info" 
        } 
      ]
    }
    
    Ensure JSON is valid. Wrap in \`\`\`json block.
    `;

    const promptText = formatPromptFromHistory(history, systemPrompt, userMessage, locStr);
    const prompt = constructPromptWithAttachment(promptText, attachment);
    const tools = [{googleSearch: {}}, {googleMaps: {}}];
    
    const rawText = await askGemini(prompt, tools, userLocation); 
    runBackgroundMemoryExtraction(userMessage, rawText);

    const parsedJson = extractJson(rawText);
    
    // Fallback text logic
    let cleanText = "";
    if (parsedJson && parsedJson.query_summary) {
        cleanText = parsedJson.query_summary;
    } else {
        // Aggressive cleaning if JSON parse failed but structure exists
        cleanText = rawText.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').trim();
        // If it still looks like JSON code, show generic error
        if (cleanText.includes('{"') || cleanText.includes('"matches":')) {
            cleanText = "I found some businesses but had trouble processing the list. Please try refining your search.";
        }
    }

    let payload: BusinessResultsPayload | undefined;
    if (parsedJson && Array.isArray(parsedJson.matches)) {
        const validMatches = parsedJson.matches
            .map((m: any, idx: number) => ({
                id: `gen-${idx}`,
                name: m.name || "Unknown",
                category: m.category || parsedJson.category || 'Business',
                distance: m.distance || 'Nearby',
                phoneNumber: normalizePhoneNumber(m.phone) || null,
                confidence: 'High',
                address: m.address,
                snippet: m.snippet,
                whatsappDraft: `Hello ${m.name}, inquiry regarding ${parsedJson.need_description}.`
            }))
            .filter((m: any) => m.phoneNumber !== null);

        payload = {
            query_summary: parsedJson.query_summary,
            need_description: parsedJson.need_description,
            user_location_label: parsedJson.user_location_label,
            category: parsedJson.category,
            matches: validMatches
        };
    }

    return { text: cleanText || "Here are the results:", businessPayload: payload };
  },

  chatKeza: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number }, 
    isDemoMode: boolean = false,
    attachment?: { mimeType: string, data: string }
  ): Promise<{ text: string, propertyPayload?: PropertyResultsPayload, groundingLinks?: { title: string; uri: string }[] }> => {
    
    const locStr = `${userLocation.lat}, ${userLocation.lng}`;
    const systemPrompt = `You are "Keza", Real Estate Agent.
    Search for properties. Prioritize listings with phone numbers.
    
    OUTPUT JSON:
    {
       "query_summary": "Found 12 apartments...",
       "matches": [
          { 
            "title": "Title", 
            "price": 300000, 
            "currency": "RWF", 
            "listing_type": "rent", 
            "contact_phone": "+250...", 
            "area_label": "Loc",
            "why_recommended": "Reason"
          }
       ]
    }`;

    const promptText = formatPromptFromHistory(history, systemPrompt, userMessage, locStr);
    const prompt = constructPromptWithAttachment(promptText, attachment);
    const tools = [{googleSearch: {}}, {googleMaps: {}}];
    const rawText = await askGemini(prompt, tools, userLocation);
    runBackgroundMemoryExtraction(userMessage, rawText);

    const parsedJson = extractJson(rawText);
    
    let cleanText = "";
    if (parsedJson && parsedJson.query_summary) {
        cleanText = parsedJson.query_summary;
    } else {
        cleanText = rawText.replace(/```json[\s\S]*?```/g, '').replace(/\{[\s\S]*\}/g, '').trim();
        if (cleanText.includes('{"')) cleanText = "I found listings but couldn't format them properly.";
    }

    let payload: PropertyResultsPayload | undefined;
    if (parsedJson && Array.isArray(parsedJson.matches)) {
        const validMatches = parsedJson.matches
            .map((m: any, idx: number) => ({
                id: `prop-${idx}`,
                title: m.title || "Property",
                property_type: m.property_type || "Unit",
                listing_type: m.listing_type || "rent",
                price: m.price || 0,
                currency: m.currency || "RWF",
                bedroom_count: m.bedroom_count || null,
                bathroom_count: m.bathroom_count || null,
                area_label: m.area_label || "Kigali",
                approx_distance_km: 1.5,
                contact_phone: normalizePhoneNumber(m.contact_phone),
                confidence: 'high',
                why_recommended: m.why_recommended,
                whatsapp_draft: `Interested in ${m.title}.`
            }))
            .filter((m: any) => m.contact_phone !== null);

        payload = {
            query_summary: parsedJson.query_summary || "Properties found.",
            filters_applied: { listing_type: 'unknown', property_type: 'unknown', budget_min: 0, budget_max: 0, area: '', radius_km: 0, sort: 'default' },
            disclaimer: "Confirm availability.",
            pagination: { page: 1, page_size: 10, has_more: false },
            matches: validMatches
        };
    }

    return { text: cleanText || "Listings found:", propertyPayload: payload };
  },

  chatGatera: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number }, 
    isDemoMode: boolean = false,
    attachment?: { mimeType: string, data: string }
  ): Promise<{ text: string, legalPayload?: LegalResultsPayload, groundingLinks?: { title: string; uri: string }[] }> => {
    
    const systemPrompt = `You are "Gatera", Legal Expert Rwanda.
    Modes:
    1. Advice: Answer using Laws.
    2. Drafter: Write contracts.
    3. Finder: If user asks for Lawyer/Notary, search directories.
    
    If Finder Mode, OUTPUT JSON:
    {
       "matches": [
          { "name": "Name", "category": "Advocate", "phone": "+250...", "distance": "Kigali", "snippet": "Info" }
       ]
    }
    
    If Advice/Drafter, just output TEXT.
    `;
    
    const promptText = formatPromptFromHistory(history, systemPrompt, userMessage, "Rwanda");
    const prompt = constructPromptWithAttachment(promptText, attachment);
    const tools = [{googleSearch: {}}];
    const rawText = await askGemini(prompt, tools, userLocation); 
    runBackgroundMemoryExtraction(userMessage, rawText);

    const parsedJson = extractJson(rawText);
    
    let legalPayload: LegalResultsPayload | undefined;
    let cleanText = rawText;

    if (parsedJson && Array.isArray(parsedJson.matches)) {
        cleanText = "Here are recommended legal professionals found in directories:";
        legalPayload = {
            query_summary: cleanText,
            matches: parsedJson.matches.map((m: any, idx: number) => ({
                id: `legal-${idx}`,
                name: m.name,
                category: m.category || 'Lawyer',
                distance: m.distance || 'Kigali',
                phoneNumber: normalizePhoneNumber(m.phone) || m.phone,
                confidence: 'High',
                snippet: m.snippet,
                whatsappDraft: "Hello Counsel, legal inquiry."
            })).filter((m: any) => m.phoneNumber !== null)
        };
    } else {
        // Ensure no raw JSON leaks in text mode
        if (cleanText.trim().startsWith('{') || cleanText.includes('```json')) {
             cleanText = cleanText.replace(/```json[\s\S]*?```/g, '').trim();
        }
    }

    return { text: cleanText || rawText, legalPayload };
  },
  
  chatBuySellAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatBob(h, m, l, d, i),
  chatRealEstateAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatKeza(h, m, l, d, i),
  chatLegalAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatGatera(h, m, l, d, i),
};
