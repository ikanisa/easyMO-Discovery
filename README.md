<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Ergpo9qShjEXsBGtV41JqJP315y4iVy_

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## AI Agents

### Gatera - Legal Expert

Gatera is the AI Legal Expert with **exactly 2 modes**:

1. **Legal Advisor** - Answers legal questions using Rwandan law (IRAC method) via Google Search
2. **Contract Drafter** - Generates professional legal documents

**Critical Rules:**
- Gatera does NOT use Google Maps
- Gatera does NOT find lawyers, notaries, or bailiffs
- Gatera ONLY uses Google Search for legal research
- To find legal professionals, users must use Bob agent in the Market tab

**Why?** Gatera is designed for legal content generation and advice, not as a business directory. Finding professionals is Bob's responsibility.
