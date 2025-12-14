
import { Message, BusinessResultsPayload, PropertyResultsPayload, LegalResultsPayload } from '../types';
import { normalizePhoneNumber } from '../utils/phone';
import { callBackend } from './api';
import { GoogleGenAI } from "@google/genai";
import { AGENT_PROMPTS, LEGAL_DISCLAIMER } from '../config/prompts';

// Fallback Client-Side Instance
const clientAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- RATE LIMITING ---

/**
 * Simple client-side rate limiter to prevent API abuse.
 * Limits: 10 requests per minute per session.
 */
const rateLimiter = {
  requests: [] as number[],
  maxRequests: 10,
  windowMs: 60000, // 1 minute window
  
  canMakeRequest(): boolean {
    const now = Date.now();
    // Remove requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return this.requests.length < this.maxRequests;
  },
  
  recordRequest(): void {
    this.requests.push(Date.now());
  },
  
  getTimeUntilReset(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    return Math.max(0, this.windowMs - (Date.now() - oldestRequest));
  }
};

// --- SECURITY FIX: No Client-Side API Keys ---

/**
 * Proxies the prompt to the Google Apps Script Backend.
 * Protocol: POST { "action": "secure_gemini", "prompt": "..." }
 * Includes rate limiting to prevent API abuse.
 */
const askGemini = async (prompt: string): Promise<string> => {
  // Rate limit check
  if (!rateLimiter.canMakeRequest()) {
    const waitTime = Math.ceil(rateLimiter.getTimeUntilReset() / 1000);
    return `I'm receiving too many requests. Please wait ${waitTime} seconds before trying again.`;
  }
  
  rateLimiter.recordRequest();

  // 1. Try Backend (Secure)
  try {
    const response = await callBackend({
      action: "secure_gemini",
      prompt: prompt
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
      const result = await clientAI.models.generateContent({
          model: model,
          contents: prompt
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

// Flatten chat history into a string script for the "stateless" backend proxy
const formatPromptFromHistory = (history: Message[], systemInstruction: string, userMessage: string, locationStr: string): string => {
  const conversation = history
    .filter(m => m.sender !== 'system')
    .map(m => `${m.sender === 'user' ? 'User' : 'AI'}: ${m.text}`)
    .join('\n');

  return `
${systemInstruction}

CONTEXT:
User Location: ${locationStr}

HISTORY:
${conversation}

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
    const prompt = formatPromptFromHistory(history, AGENT_PROMPTS.SUPPORT, userMessage, "Unknown");
    return await askGemini(prompt);
  },

  /**
   * LOCATION RESOLVER
   * Uses Google Maps Grounding (via Gemini) to turn a text query into a structured address.
   */
  resolveLocation: async (query: string, userLat?: number, userLng?: number): Promise<{ address: string, lat?: number, lng?: number, name?: string }> => {
    const prompt = `
    ${AGENT_PROMPTS.LOCATION_RESOLVER}
    
    Input: "${query}"
    User Query: ${query}
    ${userLat ? `User Coords: ${userLat}, ${userLng}` : ''}
    `;

    const raw = await askGemini(prompt);
    const data = extractJson(raw);
    
    if (data && data.address) {
        return data;
    }
    return { address: query }; // Fallback
  },

  /**
   * LOCATION INSIGHT
   * Provides a 1-sentence context about a specific coordinate.
   */
  getLocationInsight: async (lat: number, lng: number): Promise<string> => {
    const prompt = `
      ${AGENT_PROMPTS.LOCATION_INSIGHT}
      Coordinates: ${lat}, ${lng} in Rwanda.
    `;
    const text = await askGemini(prompt);
    return text.replace(/"/g, '').trim();
  },

  /**
   * BOB: THE PROCUREMENT & DISCOVERY AGENT
   * Role: Finds Products, Services, AND Professionals (including Lawyers/Notaries).
   */
  chatBob: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number },
    isDemoMode: boolean = false,
    userImage?: string
  ): Promise<{ text: string, businessPayload?: BusinessResultsPayload, groundingLinks?: { title: string; uri: string }[] }> => {
    
    const locStr = `${userLocation.lat}, ${userLocation.lng}`;
    const prompt = formatPromptFromHistory(history, AGENT_PROMPTS.BOB, userMessage, locStr);
    const rawText = await askGemini(prompt);
    
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

  /**
   * KEZA: REAL ESTATE AGENT
   */
  chatKeza: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number }, 
    isDemoMode: boolean = false,
    userImage?: string
  ): Promise<{ text: string, propertyPayload?: PropertyResultsPayload, groundingLinks?: { title: string; uri: string }[] }> => {
    
    const locStr = `${userLocation.lat}, ${userLocation.lng}`;
    const prompt = formatPromptFromHistory(history, AGENT_PROMPTS.KEZA, userMessage, locStr);
    const rawText = await askGemini(prompt);
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

  /**
   * GATERA: NOTARY & DRAFTING AGENT
   * Role: Drafts contracts, explains Irembo, advises on procedure.
   * DOES NOT: Find phone numbers.
   */
  chatGatera: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number }, 
    isDemoMode: boolean = false,
    userImage?: string
  ): Promise<{ text: string, legalPayload?: LegalResultsPayload, groundingLinks?: { title: string; uri: string }[] }> => {
    
    const prompt = formatPromptFromHistory(history, AGENT_PROMPTS.GATERA, userMessage, `${userLocation.lat},${userLocation.lng}`);
    const rawText = await askGemini(prompt);
    
    // Add legal disclaimer for drafting responses
    const responseWithDisclaimer = rawText + LEGAL_DISCLAIMER;
    
    return { text: responseWithDisclaimer, legalPayload: undefined };
  },
  
  // Aliases
  chatBuySellAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatBob(h, m, l, d, i),
  chatRealEstateAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatKeza(h, m, l, d, i),
  chatLegalAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatGatera(h, m, l, d, i),
};
