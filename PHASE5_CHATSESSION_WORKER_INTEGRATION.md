# Phase 5: ChatSession Worker Integration - Implementation Guide

**Date:** 2025-01-27  
**Status:** ⚠️ Implementation Ready, Needs Testing

---

## Overview

Update `ChatSession.tsx` to use Worker streaming with fallback to GeminiService.

---

## Implementation Steps

### 1. Add Helper Function: `parseToolResult`

Add this function before `handleAIResponse`:

```typescript
// Helper to parse tool results and map to Message payloads
const parseToolResult = (
  toolName: string,
  toolResult: string,
  sessionType: string
): {
  businessPayload?: BusinessResultsPayload;
  propertyPayload?: PropertyResultsPayload;
  legalPayload?: LegalResultsPayload;
  text?: string;
} => {
  try {
    const result = JSON.parse(toolResult);
    
    // Marketplace tools (business/real_estate)
    if (toolName === 'search_offers' || toolName === 'create_listing') {
      if (sessionType === 'business' && result.matches) {
        // Map to BusinessResultsPayload
        const validMatches = result.matches
          .map((m: any, idx: number) => ({
            id: m.id || `gen-${idx}`,
            name: m.name || m.title || "Unknown",
            category: m.category || result.category || 'Business',
            distance: m.distance || (m.distance_km ? `${m.distance_km} km` : 'Nearby'),
            phoneNumber: normalizePhoneNumber(m.phone || m.phone_number) || null,
            confidence: 'High' as const,
            address: m.address,
            snippet: m.snippet || m.description,
            whatsappDraft: `Hello ${m.name || m.title}, inquiry regarding ${result.query || 'your service'}.`
          }))
          .filter((m: any) => m.phoneNumber !== null);
        
        return {
          businessPayload: {
            query_summary: result.query_summary || result.message || "Results found",
            need_description: result.query || result.need_description,
            user_location_label: result.user_location_label || result.location?.label,
            category: result.category,
            matches: validMatches
          }
        };
      } else if (sessionType === 'real_estate' && result.matches) {
        // Map to PropertyResultsPayload
        const validMatches = result.matches
          .map((m: any, idx: number) => ({
            id: m.id || `prop-${idx}`,
            title: m.title || m.name || "Property",
            property_type: m.property_type || "Unit",
            listing_type: (m.listing_type || 'rent') as 'rent' | 'sale' | 'unknown',
            price: m.price || null,
            currency: m.currency || "RWF",
            bedroom_count: m.bedroom_count || null,
            bathroom_count: m.bathroom_count || null,
            area_label: m.area_label || m.location?.label || "Kigali",
            approx_distance_km: m.distance_km || null,
            contact_phone: normalizePhoneNumber(m.contact_phone || m.phone) || null,
            confidence: 'high' as const,
            why_recommended: m.why_recommended || m.snippet || "Property available",
            whatsapp_draft: `Interested in ${m.title || m.name}.`
          }))
          .filter((m: any) => m.contact_phone !== null);
        
        return {
          propertyPayload: {
            query_summary: result.query_summary || result.message || "Properties found",
            filters_applied: result.filters || {
              listing_type: 'unknown',
              property_type: 'unknown',
              budget_min: 0,
              budget_max: 0,
              area: '',
              radius_km: 0,
              sort: 'default'
            },
            disclaimer: result.disclaimer || "Confirm availability.",
            pagination: result.pagination || { page: 1, page_size: 10, has_more: false },
            matches: validMatches
          }
        };
      }
    }
    
    // Support/Legal tools
    if (toolName === 'search_offers' && sessionType === 'legal' && result.matches) {
      // Map to LegalResultsPayload
      const validMatches = result.matches
        .map((m: any, idx: number) => ({
          id: m.id || `legal-${idx}`,
          name: m.name || "Legal Service",
          category: (m.category || 'Other') as 'Notary' | 'Lawyer' | 'Bailiff' | 'Agency' | 'Other',
          distance: m.distance || (m.distance_km ? `${m.distance_km} km` : 'Nearby'),
          approx_distance_km: m.distance_km,
          isOpen: m.is_open,
          confidence: 'High' as const,
          snippet: m.snippet || m.why_recommended,
          address: m.address,
          phoneNumber: normalizePhoneNumber(m.phone || m.phone_number) || null,
          whatsappDraft: `Hello ${m.name}, I need ${m.category?.toLowerCase()} services.`
        }))
        .filter((m: any) => m.phoneNumber !== null);
      
      return {
        legalPayload: {
          query_summary: result.query_summary || result.message || "Legal services found",
          pagination: result.pagination || { page: 1, page_size: 10, has_more: false },
          matches: validMatches,
          disclaimer: result.disclaimer
        }
      };
    }
    
    // Return text if no structured payload
    return {
      text: result.message || result.text || JSON.stringify(result)
    };
  } catch (e) {
    console.error('Failed to parse tool result:', e);
    return {
      text: toolResult // Return raw string if parsing fails
    };
  }
};
```

### 2. Update `handleAIResponse`

Replace the entire `handleAIResponse` function with:

```typescript
// Helper to handle AI response generation (with Worker streaming support)
const handleAIResponse = async (history: Message[], userText: string, attachment?: { mimeType: string, data: string }) => {
  try {
    let loc = { lat: -1.9441, lng: 30.0619 }; // Default Kigali
    try { loc = await getCurrentPosition(); } catch (e) { console.warn("Using default loc"); }

    // P2P sessions: Keep as mock (not using Worker)
    if (initialSession.type === 'mobility' && initialSession.peerId) {
      setTimeout(() => {
        const peerMsg: Message = { id: Date.now().toString(), sender: 'peer', text: "Got it!", timestamp: Date.now() };
        setMessages(prev => [...prev, peerMsg]);
      }, 1500);
      setIsTyping(false);
      return;
    }

    // Check if Worker is enabled and configured
    const useWorker = CONFIG.ENABLE_WORKER_AGENT && CONFIG.WORKER_URL;
    
    if (useWorker) {
      try {
        // Get user ID
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        
        // Map session type to agent type
        const agentType = mapSessionTypeToAgentType(initialSession.type);
        
        // Create streaming AI message placeholder
        const aiMsgId = Date.now().toString();
        const aiMsg: Message = {
          id: aiMsgId,
          sender: 'ai',
          text: '',
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);
        
        // Stream response
        let accumulatedText = '';
        let toolResults: any[] = [];
        
        for await (const chunk of AgentService.chatStream(
          history,
          agentType,
          userId,
          loc,
          initialSession.id
        )) {
          if (chunk.type === 'token' && chunk.content) {
            accumulatedText += chunk.content;
            setMessages(prev => prev.map(msg => 
              msg.id === aiMsgId 
                ? { ...msg, text: accumulatedText }
                : msg
            ));
          } else if (chunk.type === 'tool_result' && chunk.content) {
            toolResults.push({
              tool_call: chunk.tool_call,
              content: chunk.content
            });
            
            // Parse tool result and update message payload
            const toolName = chunk.tool_call?.function?.name;
            if (toolName) {
              const parsed = parseToolResult(toolName, chunk.content, initialSession.type);
              
              setMessages(prev => prev.map(msg => 
                msg.id === aiMsgId 
                  ? {
                      ...msg,
                      text: accumulatedText || parsed.text || msg.text,
                      ...parsed
                    }
                  : msg
              ));
            }
          } else if (chunk.type === 'error') {
            throw new Error(chunk.error || 'Worker streaming error');
          } else if (chunk.type === 'done') {
            // Finalize message
            setMessages(prev => prev.map(msg => 
              msg.id === aiMsgId 
                ? { ...msg, text: accumulatedText || msg.text }
                : msg
            ));
          }
        }
        
        setIsTyping(false);
        return;
      } catch (workerError: any) {
        console.error('Worker error, falling back to Gemini:', workerError);
        // Fall through to GeminiService fallback
      }
    }
    
    // Fallback to GeminiService
    if (initialSession.type === 'support') {
      const responseText = await GeminiService.chatSupport(history, userText, attachment);
      const aiMsg: Message = { id: Date.now().toString(), sender: 'ai', text: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);

    } else if (initialSession.type === 'business') {
      const result = await GeminiService.chatBob(history, userText, loc, initialSession.isDemoMode, attachment);
      const aiMsg: Message = {
          id: Date.now().toString(),
          sender: 'ai',
          text: result.text,
          groundingLinks: result.groundingLinks,
          businessPayload: result.businessPayload,
          timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);

    } else if (initialSession.type === 'real_estate') {
      const result = await GeminiService.chatKeza(history, userText, loc, initialSession.isDemoMode, attachment);
      const aiMsg: Message = {
          id: Date.now().toString(),
          sender: 'ai',
          text: result.text,
          groundingLinks: result.groundingLinks,
          propertyPayload: result.propertyPayload,
          timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
      
    } else if (initialSession.type === 'legal') {
      const result = await GeminiService.chatGatera(history, userText, loc, initialSession.isDemoMode, attachment);
      const aiMsg: Message = {
        id: Date.now().toString(),
        sender: 'ai',
        text: result.text,
        legalPayload: result.legalPayload,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
    } else if (initialSession.type === 'mobility') {
      // Mobility: Use Worker or placeholder
      const aiMsg: Message = {
        id: Date.now().toString(),
        sender: 'ai',
        text: "Mobility matching is coming soon. Use Discovery page to find drivers/passengers.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
    }
  } catch (err) {
    console.error(err);
    const errorMsg: Message = {
      id: Date.now().toString(),
      sender: 'system',
      text: `⚠️ Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, errorMsg]);
  } finally {
    setIsTyping(false);
  }
};
```

---

## Testing Checklist

- [ ] Worker streaming works for support agent
- [ ] Worker streaming works for business/marketplace agent
- [ ] Worker streaming works for real_estate agent
- [ ] Worker streaming works for legal agent
- [ ] Worker streaming works for mobility agent
- [ ] Fallback to GeminiService when Worker URL not set
- [ ] Fallback to GeminiService when Worker request fails
- [ ] P2P sessions still work (mock)
- [ ] Tool results parsed correctly
- [ ] Message payloads set correctly
- [ ] UI components render tool cards correctly

---

**END OF PHASE 5 GUIDE**

