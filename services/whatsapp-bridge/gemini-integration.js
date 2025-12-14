// Gemini AI Integration for WhatsApp Agent
// Extracts lead information from buyer messages

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

async function callGeminiAgent(userMessage, context = {}) {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not configured');
    return {
      text: "Kwizera here! Tell me what you're looking for, where you are, and your budget.",
      extracted: null
    };
  }

  const systemPrompt = `You are "Kwizera", a helpful assistant for easyMO - Rwanda's marketplace connecting buyers with local businesses.

Your job:
1. Have a natural, friendly conversation in English or Kinyarwanda
2. Extract these details from the conversation:
   - item: what they need (product or service)
   - location: where they are in Rwanda (district, sector, or landmark)
   - budget: their budget range (optional)
   - quantity: how much they need (optional)

3. When you have item + location, respond with:
   "Perfect! I'll find businesses near you that have [item]. You'll get WhatsApp messages from up to 30 nearby vendors with their quotes. Just wait a moment!"

4. If missing info, ask friendly follow-up questions.

Response format:
{
  "text": "your natural response",
  "extracted": {
    "item": "laptop" or null,
    "location": "Kicukiro" or null,
    "budget": "500000 RWF" or null,
    "quantity": "1" or null,
    "ready_for_broadcast": true or false
  }
}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUser message: "${userMessage}"\n\nContext: ${JSON.stringify(context)}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500
        }
      })
    });

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      throw new Error('No response from Gemini');
    }

    // Try to parse JSON from response
    let parsed;
    try {
      // Extract JSON if wrapped in markdown code blocks
      const jsonMatch = aiText.match(/```json\n([\s\S]*?)\n```/) || aiText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiText);
    } catch {
      // If not valid JSON, return as plain text
      parsed = {
        text: aiText,
        extracted: null
      };
    }

    return parsed;
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      text: "Kwizera here! Tell me what you're looking for, where you are, and your budget.",
      extracted: null
    };
  }
}

module.exports = { callGeminiAgent };
