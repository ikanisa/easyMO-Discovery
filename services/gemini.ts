
import { Message, BusinessResultsPayload, PropertyResultsPayload, LegalResultsPayload } from '../types';
import { normalizePhoneNumber } from '../utils/phone';
import { callBackend } from './api';

// --- SECURITY FIX: No Client-Side API Keys ---

/**
 * Proxies the prompt to the Google Apps Script Backend.
 * Protocol: POST { "action": "secure_gemini", "prompt": "..." }
 */
const askGemini = async (prompt: string): Promise<string> => {
  try {
    const response = await callBackend({
      action: "secure_gemini",
      prompt: prompt
    });
    
    if (response.text) return response.text;
    if (response.error) {
        console.error("Backend Gemini Error:", response.error);
        return "I am having trouble connecting to the brain.";
    }
    return "No response from AI.";
  } catch (e) {
    console.error("Secure Gemini Net Error:", e);
    return "Connection error. Please try again.";
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
    - Services: Notary, Insurance.
    
    Answer briefly and helpfully.`;

    const prompt = formatPromptFromHistory(history, systemPrompt, userMessage, "Unknown");
    return await askGemini(prompt);
  },

  chatBob: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number },
    isDemoMode: boolean = false,
    userImage?: string
  ): Promise<{ text: string, businessPayload?: BusinessResultsPayload, groundingLinks?: { title: string; uri: string }[] }> => {
    
    const locStr = `${userLocation.lat}, ${userLocation.lng}`;
    const systemPrompt = `You are "Bob", easyMO's Procurement Agent.
    
    GOAL: Help the user find products/services nearby.
    
    INSTRUCTIONS:
    1. Acknowledge the user's need.
    2. Pretend to search (I will display results based on your JSON).
    3. Generate a JSON block with realistic results for the user's location.
    4. IMPORTANT: Include 'matches' with realistic names and phone numbers.
    
    JSON SCHEMA (Strict):
    {
      "query_summary": "Found X...",
      "need_description": "User item",
      "user_location_label": "User Area",
      "matches": [ 
        { "name": "Biz Name", "phone": "+250...", "category": "Type", "distance": "0.5km" } 
      ]
    }
    
    End your response with this JSON block.`;

    const prompt = formatPromptFromHistory(history, systemPrompt, userMessage, locStr);
    const rawText = await askGemini(prompt);
    
    const parsedJson = extractJson(rawText);
    const cleanText = rawText.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').replace(/\{[\s\S]*\}/g, '').trim(); // Strip JSON from text bubble

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
                whatsappDraft: `Do you have ${parsedJson.need_description}?`
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
    const systemPrompt = `You are "Keza", Real Estate Agent.
    Generate a JSON response with property listings based on the user request.
    
    JSON SCHEMA:
    {
       "query_summary": "Found apartments...",
       "matches": [
          { "title": "Apartment 1", "price": 300000, "currency": "RWF", "listing_type": "rent", "contact_phone": "+250..." }
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
            disclaimer: "Confirm with agent.",
            pagination: { page: 1, page_size: 10, has_more: false },
            matches: parsedJson.matches.map((m: any, idx: number) => ({
                id: `prop-${idx}`,
                title: m.title || "Property",
                property_type: "Apartment",
                listing_type: m.listing_type || "rent",
                price: m.price || 0,
                currency: m.currency || "RWF",
                bedroom_count: 2,
                bathroom_count: 1,
                area_label: "Nearby",
                approx_distance_km: 1.2,
                contact_phone: normalizePhoneNumber(m.contact_phone),
                confidence: 'high',
                why_recommended: "Great location",
                whatsapp_draft: "Interested in property"
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
    
    const systemPrompt = `You are "Gatera", Legal Assistant. Find nearby Notaries/Lawyers.
    Return JSON with matches containing 'name' and 'phoneNumber'.`;
    
    const prompt = formatPromptFromHistory(history, systemPrompt, userMessage, `${userLocation.lat},${userLocation.lng}`);
    const rawText = await askGemini(prompt);
    const parsedJson = extractJson(rawText);
    const cleanText = rawText.replace(/```json[\s\S]*?```/g, '').replace(/\{[\s\S]*\}/g, '').trim();

    let payload: LegalResultsPayload | undefined;
    if (parsedJson && Array.isArray(parsedJson.matches)) {
        payload = {
            query_summary: parsedJson.query_summary,
            matches: parsedJson.matches.map((m: any, idx: number) => ({
                id: `leg-${idx}`,
                name: m.name,
                category: 'Legal',
                distance: 'Nearby',
                phoneNumber: normalizePhoneNumber(m.phoneNumber),
                confidence: 'High',
                address: "Kigali",
                whatsappDraft: "Legal inquiry"
            }))
        };
    }

    return { text: cleanText || "Here are legal professionals nearby:", legalPayload: payload };
  },
  
  // Aliases
  chatBuySellAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatBob(h, m, l, d, i),
  chatRealEstateAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatKeza(h, m, l, d, i),
  chatLegalAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatGatera(h, m, l, d, i),
};
