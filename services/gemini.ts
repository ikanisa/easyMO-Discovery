
import { Message, BusinessResultsPayload, PropertyResultsPayload, LegalResultsPayload } from '../types';
import { normalizePhoneNumber } from '../utils/phone';
import { callBackend } from './api';
import { GoogleGenAI } from "@google/genai";

// Fallback Client-Side Instance
const clientAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- SECURITY FIX: No Client-Side API Keys ---

/**
 * Proxies the prompt to the Google Apps Script Backend.
 * Protocol: POST { "action": "secure_gemini", "prompt": "..." }
 */
const askGemini = async (prompt: string): Promise<string> => {
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
    const systemPrompt = `You are the Support Agent for "easyMO", the discovery app for Rwanda.
    Knowledge:
    - Rides: "Find Ride" on Home.
    - MoMo: "MoMo QR" generator.
    - Market: Finds goods/services (use Bob).
    - Legal Drafter: Gatera (in Services tab).
    
    Answer briefly and helpfully. If they need to talk to a human admin, tell them to use the WhatsApp button on the Support page.`;

    const prompt = formatPromptFromHistory(history, systemPrompt, userMessage, "Unknown");
    return await askGemini(prompt);
  },

  /**
   * LOCATION RESOLVER
   * Uses Google Maps Grounding (via Gemini) to turn a text query into a structured address.
   */
  resolveLocation: async (query: string, userLat?: number, userLng?: number): Promise<{ address: string, lat?: number, lng?: number, name?: string }> => {
    const systemPrompt = `You are a Location Resolver.
    Your Job: Take a place name or description and find the exact official address and coordinates using Google Maps data.
    
    Input: "${query}"
    Context: User is likely in Rwanda (approx lat -1.9, lng 30.0).
    
    OUTPUT JSON ONLY:
    {
      "address": "Full formatted address",
      "lat": -1.9xxxx,
      "lng": 30.0xxxx,
      "name": "Place Name"
    }
    
    If you cannot find it, guess the best approximate location in Kigali or return null values.`;

    const prompt = `
    ${systemPrompt}
    
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
      Act as a local guide. I am at coordinates: ${lat}, ${lng} in Rwanda.
      In 10 words or less, describe this area (e.g. "Busy commercial hub", "Quiet residential street", "Near the convention center").
      Be concise and accurate.
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
    const systemPrompt = `You are "Bob", easyMO's Procurement & Discovery Agent.
    
    YOUR JOB:
    1. Identify what the user needs (Product, Service, or Professional).
    2. Search for businesses/people nearby in Rwanda.
    3. Return a Structured JSON list of contacts.

    CRITICAL INSTRUCTIONS:
    - If user asks for "Lawyer", "Notary", "Plumber", "Mechanic" -> YOU find them. (Do not refer to Gatera. Gatera only writes contracts).
    - If user asks for "Cement", "Phone", "Food" -> YOU find them.
    - Always extract the 'need_description' for the WhatsApp broadcast.

    JSON SCHEMA (Strict):
    {
      "query_summary": "I found 5 hardware stores in Kicukiro...",
      "need_description": "2 bags of cement", 
      "user_location_label": "Kicukiro",
      "matches": [ 
        { 
          "name": "Business/Person Name", 
          "phone": "+250...", 
          "category": "Hardware", 
          "distance": "0.5km",
          "snippet": "Stock available"
        } 
      ]
    }
    
    End your response with this JSON block.`;

    const prompt = formatPromptFromHistory(history, systemPrompt, userMessage, locStr);
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
    const systemPrompt = `You are "Keza", easyMO's Real Estate Concierge.
    
    YOUR JOB:
    Find apartments, houses, and land for Rent or Sale in Rwanda.
    
    JSON SCHEMA:
    {
       "query_summary": "Found 3 apartments in Gisozi...",
       "matches": [
          { "title": "2 Bedroom Apartment", "price": 300000, "currency": "RWF", "listing_type": "rent", "contact_phone": "+250...", "area_label": "Gisozi" }
       ]
    }`;

    const prompt = formatPromptFromHistory(history, systemPrompt, userMessage, locStr);
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
    
    const systemPrompt = `You are "Gatera", easyMO's AI Notary Assistant & Legal Drafter.

    YOUR IDENTITY:
    - You are a specialized Legal Document Generator.
    - You speak English, Kinyarwanda, and French.

    YOUR ONLY FUNCTION:
    - **Drafting Contracts**: Generate professional text for Sales Agreements, Employment Contracts, Tenant Agreements, Power of Attorney, etc.
    - **Irembo Guidance**: Explain procedures for notary services.

    CRITICAL RULES:
    1. **YOU ARE NOT A DIRECTORY**: Do NOT search for lawyers, notaries, or bailiffs.
    2. **REFUSE SEARCH REQUESTS**: If the user asks "Find me a lawyer" or "Where is a notary?", reply: "I am a Drafting AI. I create contracts. To find a person, please go back and ask 'Bob' in the Market tab."
    3. **NO PHONE NUMBERS**: Never invent contact details.
    4. **DRAFTING**: When drafting, use clear placeholders like [NAME], [DATE], [AMOUNT]. Use bold headings.

    Example Request: "Draft a car sale agreement."
    Example Response: "Here is a standard Car Sale Agreement template... **AGREEMENT OF SALE**..."
    `;
    
    const prompt = formatPromptFromHistory(history, systemPrompt, userMessage, `${userLocation.lat},${userLocation.lng}`);
    const rawText = await askGemini(prompt);
    
    return { text: rawText, legalPayload: undefined };
  },
  
  // Aliases
  chatBuySellAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatBob(h, m, l, d, i),
  chatRealEstateAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatKeza(h, m, l, d, i),
  chatLegalAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatGatera(h, m, l, d, i),
};
