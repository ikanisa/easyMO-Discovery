
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "https://esm.sh/@google/genai@0.1.1";

// Declare Deno for TypeScript in environments that don't know about it
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Get API Key exclusively from process.env.API_KEY as per guidelines.
    // In Edge Functions environment, we assume process.env is accessible or fall back to Deno.env for safety.
    const apiKey = (globalThis as any).process?.env?.API_KEY || Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('Missing API_KEY environment variable');
    }

    // 3. Parse Body
    const { prompt, tools, toolConfig } = await req.json();

    // 4. Initialize Gemini just-in-time for current request.
    const ai = new GoogleGenAI({ apiKey: (globalThis as any).process?.env?.API_KEY || apiKey });
    
    // Choose Model
    // Fix: Default to gemini-3-flash-preview for Basic Text Tasks.
    // Map grounding requires Gemini 2.5 series models.
    const isMaps = tools?.some((t: any) => t.googleMaps);
    const modelName = isMaps ? 'gemini-2.5-flash' : 'gemini-3-flash-preview';

    // 5. Construct Config
    const config: any = {};
    if (tools) config.tools = tools;
    if (toolConfig) config.toolConfig = toolConfig;

    // 6. Generate Content
    // Fix: Simplify content construction. If prompt is multi-part (array), wrap in a parts object. If string, pass directly.
    let contents = prompt;
    if (Array.isArray(prompt)) {
        contents = { parts: prompt };
    }

    // Fix: Query ai.models.generateContent using the model name and contents directly.
    const result = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: config
    });

    // Fix: Extract generated text directly from the .text property.
    const text = result.text;

    return new Response(
      JSON.stringify({ status: 'success', text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Gemini Error:', error);
    return new Response(
      JSON.stringify({ status: 'error', message: error.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
