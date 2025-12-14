<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# easyMO Discovery

**AI-Powered Discovery & Connection Platform for Rwanda**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ecf8e.svg)](https://supabase.com/)

</div>

## 📋 Overview

easyMO Discovery is a **discovery and connection platform** that helps users in Rwanda find businesses, services, and professionals nearby using AI (Google Gemini), then connects buyers directly with sellers via WhatsApp.

> **Important**: This system does NOT handle orders, payments, or transactions internally — it facilitates discovery and initial contact, after which buyers and sellers communicate directly via WhatsApp.

## ✨ Features

| Feature | Description |
|---------|-------------|
| **AI Discovery** | Search for products, services, and professionals using "Bob" AI agent |
| **WhatsApp Connection** | Broadcast inquiries to vendors and receive verified responses |
| **Mobility** | Find nearby drivers (moto/cab) via real-time presence tracking |
| **Legal Drafting** | Generate contracts using "Gatera" AI agent |
| **MoMo QR** | Generate Mobile Money QR codes/USSD for Rwanda/Uganda/Kenya |
| **PWA** | Installable Progressive Web App with offline support |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React PWA)                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │Discovery│  │ Market  │  │Services │  │Settings │            │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
│       │            │            │            │                   │
│  ┌────┴────────────┴────────────┴────────────┴────┐             │
│  │              AI Agents (Gemini)                  │             │
│  │  Bob (Discovery) │ Gatera (Legal) │ Support     │             │
│  └────────────────────────┬─────────────────────────┘             │
└───────────────────────────┼───────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
        ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐
        │ Supabase  │ │ WhatsApp  │ │  Gemini   │
        │(Auth/DB)  │ │  Bridge   │ │   API     │
        └───────────┘ └───────────┘ └───────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Google AI Studio API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ikanisa/easyMO-Discovery.git
   cd easyMO-Discovery
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your credentials:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
easyMO-Discovery/
├── App.tsx                 # Main app component with routing
├── index.tsx               # React entry point
├── index.html              # HTML entry with import maps
├── config.ts               # Feature flags
├── types.ts                # TypeScript interfaces
│
├── components/
│   ├── Business/           # Business cards and search results
│   ├── Chat/               # Message bubbles
│   ├── Address/            # Address book
│   └── ...                 # UI components
│
├── pages/
│   ├── Discovery.tsx       # Driver/rider matching
│   ├── Business.tsx        # Marketplace categories
│   ├── ChatSession.tsx     # AI chat interface
│   ├── Services.tsx        # Service hub (Legal, Support)
│   ├── MomoGenerator.tsx   # MoMo QR generator
│   └── ...
│
├── services/
│   ├── supabase.ts         # Supabase client
│   ├── gemini.ts           # AI agents (Bob, Gatera, Support)
│   ├── whatsapp.ts         # Broadcast service
│   ├── presence.ts         # Real-time location
│   └── whatsapp-bridge/    # Node.js Twilio webhook server
│
└── supabase/
    └── schema.sql          # Database schema
```

## 🤖 AI Agents

### Bob - Procurement & Discovery
Finds products, services, and professionals in Rwanda.

```typescript
// Example: Finding hardware stores
const results = await GeminiService.chatBob(
  history,
  "I need 2 bags of cement",
  { lat: -1.9403, lng: 29.8739 }
);
```

### Gatera - Legal Drafter
Generates contracts and legal documents.

```typescript
// Example: Drafting a sale agreement
const contract = await GeminiService.chatGatera(
  history,
  "Draft a car sale agreement",
  { lat: -1.9403, lng: 29.8739 }
);
```

## 📱 WhatsApp Broadcast Flow

1. User searches for a product/service via Bob
2. AI returns business results with phone numbers
3. User clicks "Ask All" to broadcast inquiry
4. Vendors receive WhatsApp message via Twilio
5. Vendors reply "HAVE IT" / "NO STOCK"
6. App shows verified matches
7. User contacts vendor directly via WhatsApp

## 🗄️ Database Schema

The app uses Supabase with PostGIS for geographic queries:

- **profiles** - User profiles (passengers, drivers, vendors)
- **presence** - Real-time location tracking
- **request_logs** - Analytics and debugging

See [`supabase/schema.sql`](supabase/schema.sql) for complete schema.

## 🔧 WhatsApp Bridge Setup

The WhatsApp bridge is a separate Node.js service for Twilio webhooks.

```bash
cd services/whatsapp-bridge
npm install
```

Configure environment variables:
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890
ADMIN_API_KEY=your_secure_api_key
```

Deploy to Cloud Run, Railway, or any Node.js hosting.

## 📖 API Reference

### Supabase Edge Functions

| Function | Purpose |
|----------|---------|
| `chat-gemini` | Proxy for Gemini AI calls |
| `whatsapp-broadcast` | Send WhatsApp broadcasts |
| `whatsapp-status` | Check message delivery status |
| `log-request` | Analytics logging |

## 🛡️ Security

- Supabase credentials stored in environment variables
- Row Level Security (RLS) enabled on all tables
- Twilio webhook signature validation
- Admin API key protection for bridge endpoints

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support, use the in-app Support page or contact via WhatsApp.
