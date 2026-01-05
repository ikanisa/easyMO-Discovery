# Cursor Mapping: easyMO Discovery Codebase

**Purpose:** Quick reference for Cursor to navigate the codebase and understand key patterns

---

## 🗺️ Quick Navigation

### Core Application Files

| File | Purpose | Key Exports |
|------|---------|-------------|
| `apps/pwa/index.tsx` | App entry point | React root, service worker registration |
| `apps/pwa/App.tsx` | Main app component | Route state, auth, navigation |
| `apps/pwa/components/Layout.tsx` | App shell | Bottom nav, header, drawer |
| `apps/pwa/pages/*.tsx` | Route pages | Lazy-loaded page components |

### Design System

| Location | Purpose |
|---------|---------|
| `apps/pwa/tailwind.config.js` | Design tokens (spacing, colors, typography) |
| `apps/pwa/index.css` | Global styles, safe area, reduced motion |
| `apps/pwa/components/Button.tsx` | Primary button component |
| `apps/pwa/components/LoadingScreen.tsx` | Skeleton/loading states |

### State & Context

| Location | Purpose |
|---------|---------|
| `apps/pwa/state/uiStore.ts` | Zustand global state |
| `apps/pwa/context/ThemeContext.tsx` | Dark/light theme |
| `apps/pwa/src/context/DataSaverContext.tsx` | Data saver mode |

### Services & API

| Location | Purpose |
|---------|---------|
| `apps/pwa/services/supabase.ts` | Supabase client, auth, network |
| `apps/pwa/services/api.ts` | API client, offline queue |
| `apps/pwa/services/offlineQueue.ts` | Offline mutation queue |
| `services/agent-runtime/src/` | Cloudflare Worker (MCP server) |

### Widgets & Actions (ChatGPT Apps SDK)

| Location | Purpose | Key Pattern |
|---------|---------|-------------|
| `apps/pwa/components/ai/*.tsx` | Widget components | Card, ListView, forms |
| `apps/pwa/components/ai/ToolCard.tsx` | Base widget card | onClickAction=ActionConfig |
| `apps/pwa/components/ai/MobilityMatchCard.tsx` | Mobility results | Button with action |
| `apps/pwa/components/ai/ListingResultsCard.tsx` | Marketplace results | ListView pattern |
| `apps/pwa/components/ai/PaymentQRCard.tsx` | Payment QR | Card with image |

**Widget Streaming Rules:**
- Text/Markdown widgets **MUST** have `id="..."` for streaming updates
- Set `streaming={true}` while updating, then `streaming={false}` when complete
- Actions: `onClickAction={ActionConfig(...)}` → handled server-side via `action(...)` handler

**Widget Priority:**
1. **Card** - Fastest route to native-feeling interactions
2. **ListView** - For lists of results
3. **Forms** - Select, Input, RadioGroup for user input

---

## 🎨 Design System Patterns

### Spacing Scale (Tailwind)

```
xs: 0.5rem (8px)
sm: 0.75rem (12px)
base: 1rem (16px)
lg: 1.5rem (24px)
xl: 2rem (32px)
2xl: 3rem (48px)
```

### Typography Scale

```
text-xs: 0.75rem (12px)
text-sm: 0.875rem (14px)
text-base: 1rem (16px) - minimum body
text-lg: 1.125rem (18px)
text-xl: 1.25rem (20px)
text-2xl: 1.5rem (24px) - headings
```

### Tap Targets

**Minimum:** 44px × 44px (WCAG AA)
- Primary buttons: `min-h-[44px]`
- Nav buttons: `w-16` (64px) ✅
- Icon buttons: `p-3` (48px) ✅

### Safe Area (iOS)

```css
padding-bottom: calc(1rem + env(safe-area-inset-bottom))
padding-top: calc(1rem + env(safe-area-inset-top))
```

**Usage in Layout:**
- Bottom nav: `paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))'`
- Main content: `paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))'`

---

## 🧩 Component Patterns

### Button Component

```tsx
<Button 
  variant="primary" | "secondary" | "glass" | "danger"
  fullWidth={boolean}
  icon={ReactNode}
  className="..."
>
  Label
</Button>
```

**Accessibility:**
- ✅ `min-h-[44px]` (tap target)
- ✅ `active:scale-[0.98]` (haptic feedback)
- ✅ `disabled:opacity-50` (disabled state)

### Bottom Navigation

**Location:** `apps/pwa/components/Layout.tsx`

**Pattern:**
- Fixed bottom with safe area padding
- Glassmorphism style (`glass-panel`)
- 4 primary actions (Home, Ride, Market, Services)
- Active state: blue color + translate-y animation

### Loading States

**Location:** `apps/pwa/components/LoadingScreen.tsx`

**Pattern:**
- Skeleton screens for content
- Spinner for actions
- Optimistic UI for mutations

---

## 🔌 API Patterns

### Backend Calls

```tsx
import { callBackend } from '../services/api';

const result = await callBackend({
  action: 'search_listings',
  query: '...',
  location: { lat, lng }
}, { skipQueue: false });
```

**Offline Handling:**
- Automatically queued if offline
- Replayed on reconnect
- `skipQueue: true` for reads

### MCP Server (ChatGPT Apps SDK)

**Location:** `services/agent-runtime/src/mcp-server-enhanced.ts`

**Tool Pattern:**
```typescript
{
  name: 'tool_name',
  description: '...',
  inputSchema: {
    type: 'object',
    properties: { ... }
  }
}
```

**Action Handler:**
```typescript
// Server-side (Worker)
async function action(payload: ActionConfig) {
  // Handle button click, form submit, etc.
  // Return updated widget state
}
```

---

## 🗄️ Database Patterns

### Supabase Client

```tsx
import { supabase } from '../services/supabase';

// Query with RLS
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', 'value');
```

### RPC Functions

```tsx
const { data } = await supabase.rpc('function_name', {
  param1: value1,
  param2: value2
});
```

**Key Functions:**
- `get_nearby_presence(role, lat, lng, radius_m, limit)`
- `create_or_refresh_presence(...)`
- `create_match_candidates(intent_id, limit)`

---

## 🎯 Routing Patterns

### Route State

**Location:** `apps/pwa/App.tsx`

**Pattern:**
```tsx
const [mode, setMode] = useState<AppMode>(AppMode.HOME);

// Deep link parsing
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const modeParam = params.get('mode');
  if (modeParam) {
    setMode(modeMap[modeParam]);
    window.history.replaceState({}, '', window.location.pathname);
  }
}, []);
```

**AppMode Enum:**
- `HOME` - ChatHome component
- `DISCOVERY` - Mobility matching
- `BUSINESS` - Marketplace
- `SERVICES` - Support hub
- `SETTINGS` - User preferences
- `MOMO_GENERATOR` - QR payment
- `SCANNER` - QR scanner
- `ONBOARDING` - Business registration

---

## 🚀 Deployment

### Build Commands

```bash
pnpm install          # Install dependencies
pnpm run build        # Build PWA
pnpm run dev          # Dev server
pnpm run worker:deploy # Deploy Worker
```

### Environment Variables

**Frontend:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WORKER_URL`

**Worker:**
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

---

## 📝 Key Conventions

### File Naming
- Components: `PascalCase.tsx`
- Services: `camelCase.ts`
- Types: `types.ts` or `@easymo/shared/types`

### Import Paths
- Relative: `../components/Button`
- Alias: `@/components/Button`
- Package: `@easymo/shared/constants`

### State Management
- Local state: `useState`
- Global UI state: Zustand (`state/uiStore.ts`)
- Server state: TanStack Query
- Theme: Context (`context/ThemeContext.tsx`)

---

## 🔍 Common Tasks

### Add a New Page

1. Create `apps/pwa/pages/NewPage.tsx`
2. Add `AppMode.NEW_PAGE` to enum
3. Lazy load in `App.tsx`: `const NewPage = React.lazy(() => import('./pages/NewPage'));`
4. Add route handler in `renderContent()`
5. Add nav button in `Layout.tsx` (if needed)

### Add a New Widget

1. Create `apps/pwa/components/ai/NewWidget.tsx`
2. Extend `ToolCard` base component
3. Add `onClickAction={ActionConfig(...)}` to buttons
4. Handle action server-side in Worker `action()` handler
5. Return updated widget state

### Add a New Tool (MCP)

1. Add tool definition in `services/agent-runtime/src/mcp-server-enhanced.ts`
2. Implement handler in `services/agent-runtime/src/tools/`
3. Add tool to tools array
4. Test via `/mcp/tools/call` endpoint

---

## 🐛 Debugging

### Service Worker
- Dev: Auto-unregister in dev mode
- Prod: Check `dist/service-worker.js`
- Cache: Check DevTools → Application → Cache Storage

### Offline Queue
- Check: `services/offlineQueue.ts`
- View: `OfflineQueue.getCount()`
- Flush: `flushQueuedRequests()`

### Build Issues
- Check: `apps/pwa/vite.config.ts`
- Type errors: Check `apps/pwa/vite-env.d.ts`
- Import paths: Check `apps/pwa/tsconfig.json`

---

**Last Updated:** 2025-01-29  
**Maintained By:** Development Team

