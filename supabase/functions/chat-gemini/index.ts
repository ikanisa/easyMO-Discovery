import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

type GroundingLink = { title: string; uri: string };
type FunctionCall = { name: string; args: Record<string, unknown> };

const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const buildGenerationConfig = (overrides?: any) => {
  const base = {
    temperature: 0.7,
    maxOutputTokens: 2048,
  };
  if (!overrides || typeof overrides !== 'object') return base;

  return {
    ...base,
    ...overrides,
    temperature: clampNumber(overrides.temperature, 0, 2, base.temperature),
    maxOutputTokens: clampNumber(overrides.maxOutputTokens, 1, 2048, base.maxOutputTokens),
  };
};

const normalizeContents = (prompt?: string, contents?: any) => {
  if (Array.isArray(contents) && contents.length > 0) return contents;
  return [{ role: 'user', parts: [{ text: prompt || '' }] }];
};

const extractText = (data: any): string => {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    return parts
      .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
      .join('')
      .trim();
  }
  return '';
};

const extractGroundingLinks = (data: any): GroundingLink[] => {
  const links: GroundingLink[] = [];
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return links;

  for (const chunk of chunks) {
    const uri = chunk?.web?.uri || chunk?.maps?.uri || chunk?.retrievedContext?.uri;
    if (typeof uri !== 'string' || uri.length === 0) continue;
    if (links.some((l) => l.uri === uri)) continue;

    const title =
      chunk?.web?.title ||
      chunk?.maps?.title ||
      chunk?.retrievedContext?.title ||
      uri;

    links.push({ title, uri });
  }

  return links;
};

const extractFunctionCalls = (data: any): FunctionCall[] => {
  const calls: FunctionCall[] = [];
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return calls;

  for (const part of parts) {
    const call = part?.functionCall;
    if (!call || typeof call?.name !== 'string' || call.name.length === 0) continue;

    let args: unknown = call.args ?? {};
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch {
        args = {};
      }
    }

    calls.push({
      name: call.name,
      args: args && typeof args === 'object' ? (args as Record<string, unknown>) : {},
    });
  }

  return calls;
};

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { prompt, contents, tools, toolConfig, generationConfig } = await req.json();

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const payload: any = {
      contents: normalizeContents(prompt, contents),
      generationConfig: buildGenerationConfig(generationConfig),
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
    }

    if (toolConfig) {
      payload.toolConfig = toolConfig;
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API Error: ${error}`);
    }

    const data = await response.json();
    const text = extractText(data);
    const groundingLinks = extractGroundingLinks(data);
    const functionCalls = extractFunctionCalls(data);

    return new Response(
      JSON.stringify({ status: 'success', text, groundingLinks, functionCalls }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    console.error('Gemini Edge Function Error:', error);
    return new Response(
      JSON.stringify({ status: 'error', error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
