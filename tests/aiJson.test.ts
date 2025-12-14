import { describe, it, expect } from 'vitest';
import { bobAiSchema, kezaAiSchema, parseJsonWithSchema } from '../services/aiJson';

describe('AI JSON extraction + validation', () => {
  it('parses fenced JSON blocks', () => {
    const text = `
Here you go:
\`\`\`json
{ "query_summary": "ok", "matches": [ { "name": "Shop A" } ] }
\`\`\`
`;
    const parsed = parseJsonWithSchema(text, bobAiSchema);
    expect(parsed?.data.matches[0]?.name).toBe('Shop A');
  });

  it('tolerates trailing commas', () => {
    const text = `{ "query_summary": "ok", "matches": [ { "name": "Shop A", }, ], }`;
    const parsed = parseJsonWithSchema(text, bobAiSchema);
    expect(parsed?.data.query_summary).toBe('ok');
    expect(parsed?.data.matches.length).toBe(1);
  });

  it('prefers the last JSON block in text', () => {
    const text = `
\`\`\`json
{ "matches": [ { "name": "First" } ] }
\`\`\`

\`\`\`json
{ "matches": [ { "name": "Second" } ] }
\`\`\`
`;
    const parsed = parseJsonWithSchema(text, bobAiSchema);
    expect(parsed?.data.matches[0]?.name).toBe('Second');
  });

  it('validates Keza schema separately from Bob', () => {
    const text = `{ "query_summary": "ok", "matches": [ { "title": "2BR Apartment" } ] }`;
    const parsed = parseJsonWithSchema(text, kezaAiSchema);
    expect(parsed?.data.matches[0]?.title).toBe('2BR Apartment');
  });
});

