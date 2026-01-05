# ChatGPT UI Bundle

Minimal embedded UI for ChatGPT Apps SDK. Renders tool cards in an iframe-safe environment.

## Development

```bash
npm install
npm run dev
# Runs on http://localhost:3001
```

## Build

```bash
npm run build
# Outputs to dist/
```

## Deployment

Deploy `dist/` to static hosting:
- Cloudflare Pages
- Vercel
- Netlify
- Any static hosting service

## Usage

The UI listens for tool results via `window.openai` APIs:

```javascript
// Tool result received
window.openai.toolOutput({
  tool_name: 'set_presence',
  success: true,
  // ... tool-specific data
});
```

## Components

- `ToolCard` - Base card component
- `MobilityMatchCard` - Renders mobility matching results
- `ListingResultsCard` - Renders marketplace listings
- `PaymentQRCard` - Renders MoMo QR codes
- `ScannerResultCard` - Renders QR scan results

## Requirements

- Works in iframe
- Uses `window.openai` APIs
- Minimal dependencies
- Responsive design

