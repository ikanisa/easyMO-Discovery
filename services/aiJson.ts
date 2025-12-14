import { z } from 'zod';

const SMART_QUOTES: Array<[string, string]> = [
  ['\u201C', '"'],
  ['\u201D', '"'],
  ['\u201E', '"'],
  ['\u00AB', '"'],
  ['\u00BB', '"'],
  ['\u2018', "'"],
  ['\u2019', "'"],
];

const normalizeLikelyJsonText = (input: string): string => {
  let text = input.trim().replace(/^\uFEFF/, '');
  for (const [from, to] of SMART_QUOTES) text = text.replaceAll(from, to);
  text = text.replace(/,\s*([}\]])/g, '$1');
  return text;
};

const scanBalancedJson = (text: string, startIndex: number): number | null => {
  const startChar = text[startIndex];
  if (startChar !== '{' && startChar !== '[') return null;

  const stack: Array<'{' | '['> = [startChar as '{' | '['];
  let inString = false;
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (let i = startIndex + 1; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (quote && ch === quote) {
        inString = false;
        quote = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      continue;
    }

    if (ch === '{' || ch === '[') {
      stack.push(ch);
      continue;
    }

    if (ch === '}' || ch === ']') {
      const top = stack[stack.length - 1];
      const isMatch = (ch === '}' && top === '{') || (ch === ']' && top === '[');
      if (!isMatch) return null;
      stack.pop();
      if (stack.length === 0) return i;
    }
  }

  return null;
};

export const extractJsonCandidateStrings = (text: string): string[] => {
  const candidates: string[] = [];

  const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
  for (const match of text.matchAll(fenceRegex)) {
    if (match[1]) candidates.push(match[1].trim());
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== '{' && ch !== '[') continue;
    const end = scanBalancedJson(text, i);
    if (end === null) continue;
    candidates.push(text.slice(i, end + 1));
    i = end;
  }

  // Prefer the last block (agents instructed to end with JSON)
  const uniq = new Set<string>();
  const ordered: string[] = [];
  for (const candidate of candidates.reverse()) {
    const normalized = candidate.trim();
    if (!normalized) continue;
    if (uniq.has(normalized)) continue;
    uniq.add(normalized);
    ordered.push(normalized);
  }
  return ordered;
};

export const safeJsonParse = (input: string): unknown | null => {
  const normalized = normalizeLikelyJsonText(input);
  if (!normalized) return null;
  if (normalized === 'null') return null;
  try {
    return JSON.parse(normalized);
  } catch {
    return null;
  }
};

export const parseJsonWithSchema = <T>(
  text: string,
  schema: z.ZodType<T>,
): { data: T; raw: unknown } | null => {
  for (const candidate of extractJsonCandidateStrings(text)) {
    const raw = safeJsonParse(candidate);
    if (raw === null) continue;
    const parsed = schema.safeParse(raw);
    if (parsed.success) return { data: parsed.data, raw };
  }
  return null;
};

export const locationAiSchema = z
  .object({
    address: z.string().min(1),
    lat: z.number().optional(),
    lng: z.number().optional(),
    name: z.string().optional(),
  })
  .passthrough();

export const memoryAiSchema = z
  .object({
    fact: z.string().min(1),
    category: z.enum(['preference', 'fact', 'context']).optional(),
  })
  .passthrough();

export const bobAiSchema = z
  .object({
    query_summary: z.string().optional(),
    need_description: z.string().optional(),
    user_location_label: z.string().optional(),
    category: z.string().optional(),
    matches: z.array(z.object({ name: z.string().min(1) }).passthrough()),
  })
  .passthrough();

export const kezaAiSchema = z
  .object({
    query_summary: z.string().optional(),
    market_insight: z.string().optional(),
    filters_detected: z.record(z.unknown()).optional(),
    filters_applied: z.record(z.unknown()).optional(),
    matches: z.array(z.object({ title: z.string().min(1) }).passthrough()),
    disclaimer: z.string().optional(),
    next_steps: z.array(z.string()).optional(),
    pagination: z.record(z.unknown()).optional(),
  })
  .passthrough();

