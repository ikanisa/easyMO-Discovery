
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
type GroundingLink = { title: string; uri: string };

type GeminiResult = {
  text: string;
  groundingLinks: GroundingLink[];
  raw?: any;
};

const KEZA_WORLD_CLASS_PROMPT = `You are "Keza", easyMO's Real Estate Concierge for Rwanda.

MISSION
Help users find apartments, houses, and land for rent or sale in Rwanda, using Google Maps + Google Search grounding.

NON-NEGOTIABLE RULES
- Do NOT invent listings, prices, agencies, phone numbers, URLs, or addresses.
- If you cannot find enough listings, return fewer matches and say so in the summary.
- Prefer VERIFIED, contactable sources (agencies + listings) with phone numbers.
- Use Rwanda context (RWF currency; Kigali neighborhoods; UPI/land title checks).
- Output MUST be valid JSON only (no markdown fences, no extra text).

SEARCH STRATEGY (Use tools)
1) Google Maps (primary):
   - "Real estate agency near [area]"
   - "[property type] for rent in [area]"
   - "[property type] for sale in [area]"
   Extract: name, rating, address, phone, website, and any listing links/photos.
2) Google Search (secondary):
   - "[property type] [area] Rwanda site:jiji.co.rw"
   - "[property type] [area] Rwanda site:facebook.com"
   - "[property type] [area] Rwanda site:instagram.com"

PRICING INTELLIGENCE (Rwanda, Kigali benchmarks — use as sanity checks)
- 2BR (Kicukiro): 250,000–500,000 RWF/month
- 3BR (Kimihurura): 500,000–1,200,000 RWF/month
- Furnished premium: +30–50%
If a listing deviates >40%, set price_assessment to "below_market" or "above_market" and explain briefly.

LEGAL GUIDANCE (always mention briefly)
- For purchases: verify UPI, check encumbrances, transfer tax ~2%
- For rentals: typical deposit 1–3 months; lease registration recommended >3 years

OUTPUT JSON SCHEMA
{
  "query_summary": "string",
  "market_insight": "string",
  "filters_detected": {
    "listing_type": "rent|sale|unknown",
    "property_type": "apartment|house|land|commercial|unknown",
    "bedrooms": 0,
    "budget_min": 0,
    "budget_max": 0,
    "area": "string",
    "radius_km": 0,
    "sort": "distance|best_match|default"
  },
  "matches": [
    {
      "title": "string",
      "property_type": "Apartment|House|Land|Commercial|Other",
      "listing_type": "rent|sale|unknown",
      "price": 0,
      "currency": "RWF",
      "price_assessment": "below_market|fair|above_market",
      "bedroom_count": 0,
      "bathroom_count": 0,
      "area_label": "string",
      "neighborhood_score": 0,
      "nearby": ["string"],
      "amenities": ["string"],
      "contact_phone": "+2507XXXXXXXX",
      "agency_name": "string",
      "verified": true,
      "source_platform": "Google Maps|Google Search|Other",
      "source_url": "https://...",
      "photos": ["https://..."],
      "confidence": "high|medium|low",
      "why_recommended": "string"
    }
  ],
  "disclaimer": "string",
  "next_steps": ["string"]
}`;

const parseInlineImage = (userImage: string): { mimeType: string; data: string } | null => {
  if (!userImage) return null;
  const trimmed = userImage.trim();
  const match = trimmed.match(/^data:([^;]+);base64,(.*)$/);
  if (match) return { mimeType: match[1], data: match[2] };

  // Fallback: already-base64 input (assume jpeg)
  if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 100) {
    return { mimeType: 'image/jpeg', data: trimmed };
  }
  return null;
};

const analyzePropertyImageForKeza = async (userImage: string): Promise<string | null> => {
  const parsed = parseInlineImage(userImage);
  if (!parsed) return null;

  const imagePrompt = `Analyze this Rwanda property image and extract:
1) Property type (apartment/house/land)
2) Estimated condition (new/good/needs_renovation)
3) Visible amenities (parking, garden, pool, security, etc.)
4) Approximate size/scale estimate (rough)
5) Potential red flags (structural issues, dampness, poor finishes, etc.)
6) Rough market value estimate range in RWF (if possible)

Output JSON only:
{
  "property_type": "string",
  "condition": "string",
  "amenities": ["string"],
  "red_flags": ["string"],
  "estimated_value_rwf": 0
}`;

  const contents = [
    {
      role: 'user',
      parts: [
        { text: imagePrompt },
        { inlineData: { mimeType: parsed.mimeType, data: parsed.data } },
      ],
    },
  ];

  try {
    const result = await askGemini(imagePrompt, undefined, undefined, {
      contents,
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    });
    return result.text || null;
  } catch (e) {
    console.warn('Keza image analysis failed:', e);
    return null;
  }
};

const analyzeItemImageForBob = async (userImage: string): Promise<string | null> => {
  const parsed = parseInlineImage(userImage);
  if (!parsed) return null;

  const imagePrompt = `Analyze this product image from a user in Rwanda.

Rules:
- Be conservative. If you are not sure about brand/model, say "unknown".
- Do NOT invent prices. If you estimate, give a wide range and say it's a rough guess.
- Output JSON only.

Output JSON schema:
{
  "identified_item": "string",
  "category": "string",
  "key_attributes": ["string"],
  "search_terms": ["string"],
  "condition": "new|used|unknown",
  "notes": "string"
}`;

  const contents = [
    {
      role: 'user',
      parts: [
        { text: imagePrompt },
        { inlineData: { mimeType: parsed.mimeType, data: parsed.data } },
      ],
    },
  ];

  try {
    const result = await askGemini(imagePrompt, undefined, undefined, {
      contents,
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    });
    return result.text || null;
  } catch (e) {
    console.warn('Bob image analysis failed:', e);
    return null;
  }
};

const extractGroundingLinks = (response: any, responseText: string): GroundingLink[] => {
  const links: GroundingLink[] = [];

  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (Array.isArray(chunks)) {
    chunks.forEach((chunk: any) => {
      const uri = chunk?.web?.uri || chunk?.maps?.uri || chunk?.retrievedContext?.uri;
      if (typeof uri === 'string' && uri.length > 0) {
        const title =
          chunk?.web?.title ||
          chunk?.maps?.title ||
          chunk?.retrievedContext?.title ||
          'Source';
        if (!links.find((l) => l.uri === uri)) links.push({ title, uri });
      }
    });
  }

  const urlRegex = /https?:\/\/[^\s\)]+/g;
  const textUrls = responseText?.match(urlRegex) || [];
  textUrls.forEach((uri: string) => {
    if (!links.find((l) => l.uri === uri)) links.push({ title: 'Referenced Source', uri });
  });

  return links;
};

const askGemini = async (
  prompt: string, 
  tools?: any[], 
  userLocation?: { lat: number, lng: number },
  options?: { contents?: any[]; generationConfig?: any }
): Promise<GeminiResult> => {
  
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
      toolConfig: toolConfig, // Pass config to backend
      ...(options?.contents ? { contents: options.contents } : {}),
      ...(options?.generationConfig ? { generationConfig: options.generationConfig } : {}),
    });
    
    if (response.status === 'success' && response.text) {
        const text = response.text as string;
        const groundingLinks = Array.isArray((response as any).groundingLinks)
          ? ((response as any).groundingLinks as GroundingLink[])
          : extractGroundingLinks(response, text);

        return { text, groundingLinks, raw: response };
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
          contents: options?.contents || prompt,
          config: config
      });
      const text = result.text || "No response generated.";
      const groundingLinks = extractGroundingLinks(result as any, text);
      return { text, groundingLinks, raw: result };
  } catch (clientError: any) {
      console.error("Direct Gemini Client Error:", clientError);
      return { text: "I am having trouble connecting to the brain (Both Secure & Direct channels failed).", groundingLinks: [] };
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
    const data = extractJson(result.text);

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
    const result = await askGemini(prompt, [{googleSearch: {}}]); // Enable search for documentation lookup
    
    // Trigger Memory Loop
    runBackgroundMemoryExtraction(userMessage, result.text);
    
    return result.text;
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
    const data = extractJson(raw.text);
    
    if (data && data.address) return data;
    return { address: query }; 
  },

  getLocationInsight: async (lat: number, lng: number): Promise<string> => {
    const prompt = `
      Act as a local guide. I am at coordinates: ${lat}, ${lng} in Rwanda.
      In 10 words or less, describe this area. Be concise and accurate.
    `;
    const text = await askGemini(prompt, [{googleMaps: {}}], { lat, lng });
    return text.text.replace(/"/g, '').trim();
  },

  chatBob: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number },
    isDemoMode: boolean = false,
    userImage?: string
  ): Promise<{ text: string, businessPayload?: BusinessResultsPayload, groundingLinks?: { title: string; uri: string }[] }> => {
    
    const locStr = `${userLocation.lat}, ${userLocation.lng}`;
    let imageAnalysisContext = '';
    if (userImage) {
      const imageAnalysis = await analyzeItemImageForBob(userImage);
      if (imageAnalysis) {
        imageAnalysisContext = `\n\nUSER PROVIDED ITEM IMAGE (analysis):\n${imageAnalysis}\n\nUse this to refine what the user needs and the best search terms.`;
      }
    }

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
    const systemPromptWithImage = `${systemPrompt}${imageAnalysisContext}`;

    const prompt = formatPromptFromHistory(history, systemPromptWithImage, userMessage, locStr);
    
    const tools = [{googleSearch: {}}, {googleMaps: {}}];
    const result = await askGemini(prompt, tools, userLocation); 
    
    // Trigger Memory Loop
    runBackgroundMemoryExtraction(userMessage, result.text);

    const parsedJson = extractJson(result.text);
    const cleanText = result.text.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').replace(/\{[\s\S]*\}/g, '').trim();

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

    return { text: cleanText || "Here is what I found:", businessPayload: payload, groundingLinks: result.groundingLinks };
  },

  chatKeza: async (
    history: Message[], 
    userMessage: string, 
    userLocation: { lat: number, lng: number }, 
    isDemoMode: boolean = false,
    userImage?: string
  ): Promise<{ text: string, propertyPayload?: PropertyResultsPayload, groundingLinks?: { title: string; uri: string }[] }> => {
    
    const locStr = `${userLocation.lat}, ${userLocation.lng}`;
    let imageAnalysisContext = '';
    if (userImage) {
      const imageAnalysis = await analyzePropertyImageForKeza(userImage);
      if (imageAnalysis) {
        imageAnalysisContext = `\n\nUSER PROVIDED PROPERTY IMAGE (analysis):\n${imageAnalysis}\n\nUse this analysis to tailor recommendations and questions.`;
      }
    }

    const systemPrompt = `${KEZA_WORLD_CLASS_PROMPT}${imageAnalysisContext}`;

    const prompt = formatPromptFromHistory(history, systemPrompt, userMessage, locStr);
    const tools = [{googleSearch: {}}, {googleMaps: {}}];
    const result = await askGemini(prompt, tools, userLocation);
    
    runBackgroundMemoryExtraction(userMessage, result.text);

    const parsedJson = extractJson(result.text);
    const cleanText = result.text.replace(/```json[\s\S]*?```/g, '').replace(/\{[\s\S]*\}/g, '').trim();

	    let payload: PropertyResultsPayload | undefined;
	    if (parsedJson && Array.isArray(parsedJson.matches)) {
        const toNumberOrNull = (v: any): number | null => {
          if (typeof v === 'number' && Number.isFinite(v)) return v;
          if (typeof v === 'string') {
            const normalized = v.replace(/,/g, '').trim();
            const n = Number(normalized);
            return Number.isFinite(n) ? n : null;
          }
          return null;
        };

	        const toNumberOrZero = (v: any): number => toNumberOrNull(v) ?? 0;
	        const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

	        const normalizeListingType = (v: any): 'rent' | 'sale' | 'unknown' => {
	          const s = String(v || '').toLowerCase();
	          if (s === 'rent' || s === 'rental' || s === 'to rent' || s === 'lease') return 'rent';
          if (s === 'sale' || s === 'sell' || s === 'for sale') return 'sale';
          return 'unknown';
        };

        const normalizeConfidence = (v: any): 'high' | 'medium' | 'low' => {
          const s = String(v || '').toLowerCase();
          if (s === 'high') return 'high';
          if (s === 'medium' || s === 'med') return 'medium';
          if (s === 'low') return 'low';
          return 'medium';
        };

        const normalizePriceAssessment = (v: any): 'below_market' | 'fair' | 'above_market' | undefined => {
          const s = String(v || '').toLowerCase();
          if (s === 'below_market' || s === 'below') return 'below_market';
          if (s === 'above_market' || s === 'above') return 'above_market';
          if (s === 'fair' || s === 'market' || s === 'market_rate') return 'fair';
          return undefined;
        };

	        const normalizeStringArray = (v: any): string[] | undefined => {
	          if (!Array.isArray(v)) return undefined;
	          const out = v.map((x) => String(x || '').trim()).filter(Boolean);
	          return out.length > 0 ? out : undefined;
	        };

	        const filters = parsedJson.filters_detected || parsedJson.filters_applied || {};
	        const nextSteps = normalizeStringArray(parsedJson.next_steps);
	        const marketInsight = typeof parsedJson.market_insight === 'string' ? parsedJson.market_insight : undefined;
	        const bedroomsRaw = toNumberOrNull(filters.bedrooms);
	        const bedrooms = bedroomsRaw === null ? undefined : Math.max(0, Math.trunc(bedroomsRaw));

	        payload = {
	            query_summary: parsedJson.query_summary || "Properties found.",
	            market_insight: marketInsight,
	            next_steps: nextSteps,
	            filters_applied: {
	              listing_type: normalizeListingType(filters.listing_type),
	              property_type: filters.property_type || 'unknown',
	              bedrooms,
	              budget_min: toNumberOrZero(filters.budget_min),
	              budget_max: toNumberOrZero(filters.budget_max),
	              area: filters.area || '',
	              radius_km: toNumberOrZero(filters.radius_km),
	              sort: filters.sort || 'default',
	            },
            disclaimer:
              parsedJson.disclaimer ||
              "Confirm availability and verify details with the agent/agency (UPI/title checks for purchases).",
	            pagination: parsedJson.pagination || { page: 1, page_size: 10, has_more: false },
	            matches: parsedJson.matches.map((m: any, idx: number) => ({
	                id: `prop-${idx}`,
	                title: m.title || "Property",
	                property_type: m.property_type || "Property",
	                listing_type: normalizeListingType(m.listing_type),
	                price: toNumberOrNull(m.price),
	                currency: m.currency || "RWF",
	                price_assessment: normalizePriceAssessment(m.price_assessment),
	                bedroom_count: toNumberOrNull(m.bedroom_count),
	                bathroom_count: toNumberOrNull(m.bathroom_count),
	                area_sqm: toNumberOrNull(m.area_sqm),
	                area_label: m.area_label || m.area || "Kigali",
	                approx_distance_km: toNumberOrNull(m.approx_distance_km),
	                neighborhood_score: (() => {
	                  const n = toNumberOrNull(m.neighborhood_score);
	                  if (n === null) return null;
	                  return clamp(n, 0, 10);
	                })(),
	                nearby: normalizeStringArray(m.nearby),
	                amenities: normalizeStringArray(m.amenities),
	                contact_phone: normalizePhoneNumber(m.contact_phone || m.phone || m.contact),
	                agency_name: m.agency_name,
	                verified: typeof m.verified === 'boolean' ? m.verified : undefined,
                source_platform: m.source_platform || m.source,
                source_url: m.source_url,
                photos: normalizeStringArray(m.photos),
                confidence: normalizeConfidence(m.confidence),
                why_recommended: m.why_recommended || "Matches your criteria",
                whatsapp_draft:
                  m.whatsapp_draft ||
                  `Hello, I am interested in ${m.title || 'this property'} (${normalizeListingType(m.listing_type)}).`,
            }))
        };
    }

    const fallbackText =
      cleanText ||
      parsedJson?.market_insight ||
      parsedJson?.query_summary ||
      "Here are some listings.";

    return { text: fallbackText, propertyPayload: payload, groundingLinks: result.groundingLinks };
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
    const result = await askGemini(prompt, tools, userLocation); 
    
    runBackgroundMemoryExtraction(userMessage, result.text);

    // Gatera no longer returns JSON payloads (no lawyer finder mode)
    // Return the rich text response directly
    return { text: result.text, groundingLinks: result.groundingLinks };
  },
  
  // Aliases
  chatBuySellAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatBob(h, m, l, d, i),
  chatRealEstateAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatKeza(h, m, l, d, i),
  chatLegalAgent: (h: any, m: any, l: any, d: any, i: any) => GeminiService.chatGatera(h, m, l, d, i),
};
