<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Ergpo9qShjEXsBGtV41JqJP315y4iVy_

## 🚀 Quick Start

**Prerequisites:** Node.js 18+

### ⚡ Fast Track (3 Steps)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Add your Gemini API key to `.env.local`:**
   ```bash
   GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **Run the app:**
   ```bash
   npm run dev
   ```

🎉 **That's it!** Your app should now be running at http://localhost:5173

### 📚 New to this project?
- Read [QUICKSTART.md](QUICKSTART.md) for detailed setup instructions
- See [DEPENDENCY_FIX_REPORT.md](DEPENDENCY_FIX_REPORT.md) for what's been fixed
- **IMPORTANT:** Review [SECURITY.md](SECURITY.md) for credential management

## 💻 Development Commands

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run preview       # Preview production build
npm run lint          # Check code quality
npm run format        # Auto-format code
npm run format:check  # Check if code needs formatting
```

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
