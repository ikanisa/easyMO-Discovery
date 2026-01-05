# ChatKit Widget Pack

TypeScript library for building ChatKit widgets for the easyMO Discovery app.

## Overview

This package provides typed widget builders for creating agent-first UI components using OpenAI's ChatKit widget system. Widgets are composable, type-safe, and follow ChatKit's action-based interaction model.

## Installation

This is an internal workspace package. Install dependencies from the monorepo root:

```bash
npm install
```

## Usage

### Basic Example

```typescript
import { ModePickerCard, PassengerRideRequestCard } from '@easymo/chatkit-widget-pack';

// Generate a widget
const widget = ModePickerCard();

// Return from your agent
return { widget };
```

### Actions

All widgets use typed actions defined in `actions.ts`. Actions follow the pattern `easymo.v1.*`:

```typescript
import { Actions } from '@easymo/chatkit-widget-pack';

// Action types are available as constants
Actions.MODE_SELECT // "easymo.v1.mode.select"
Actions.RIDE_REQUEST_SUBMIT // "easymo.v1.ride.request_submit"
```

### Widget Categories

#### Mobility Widgets

- `ModePickerCard()` - Choose passenger/driver/marketplace mode
- `PassengerRideRequestCard()` - Request a ride with pickup/dropoff
- `DriverAvailabilityCard()` - Set driver availability
- `MatchesCard(candidates)` - Show ranked driver matches
- `HandoffCard(summary)` - Handoff confirmation

#### Marketplace Widgets

- `MarketplaceSearchCard()` - Search products/services
- `ListingsCard(listings)` - Display search results

#### Broadcast Widgets

- `BroadcastComposerCard()` - Compose WhatsApp broadcast
- `BroadcastTargetsPreviewCard(targets, payload)` - Preview selected businesses
- `BroadcastProgressCard(stats, targets)` - Show broadcast progress
- `IncomingResponsesCard(campaign_id, responses)` - Display business responses

### Primitives

Low-level widget builders are available for custom widgets:

```typescript
import { card, title, text, button, form, input, action } from '@easymo/chatkit-widget-pack';

const customWidget = card([
  title("Custom Widget"),
  text("This is a custom widget"),
  button("Click me", action("custom.action", { data: "value" })),
]);
```

## Demo

Run the demo to see example widgets:

```bash
npx tsx packages/chatkit-widget-pack/demo.ts
```

This prints JSON representations of all widget types.

## Architecture

### Widget Flow

1. **Agent generates widget** - Your agent calls a widget function (e.g., `ModePickerCard()`)
2. **ChatKit renders widget** - ChatKit displays the widget in the chat UI
3. **User interacts** - User clicks a button or submits a form
4. **Action is emitted** - ChatKit emits an action with `type` and `payload`
5. **Agent handles action** - Your backend/agent processes the action and returns the next widget

### Action Handling

Actions can be handled:
- **Server-side (default)** - Your agent receives the action and responds with a new widget
- **Client-side** - Use `handler: "client"` in ActionConfig (not implemented in this pack)

### External Events

You can inject external events (e.g., WhatsApp webhook responses) into ChatKit:

```typescript
// When a WhatsApp response arrives via Supabase realtime
chatKit.sendAction({
  type: 'easymo.v1.broadcast.inbound_response',
  payload: { campaign_id, business_id, text, ts },
});
```

## Type Safety

All widgets are typed using `@openai/chatkit` types. TypeScript will catch:
- Invalid widget structures
- Missing required fields
- Incorrect action types

## Building

```bash
npm run build
```

Outputs to `dist/` directory.

## Integration with Agent

### Example: Mobility Agent

```typescript
import { ModePickerCard, PassengerRideRequestCard, MatchesCard } from '@easymo/chatkit-widget-pack';

async function handleAction(action: ActionConfig) {
  switch (action.type) {
    case 'easymo.v1.mode.select':
      if (action.payload?.mode === 'passenger') {
        return { widget: PassengerRideRequestCard() };
      }
      break;
    
    case 'easymo.v1.ride.request_submit':
      const matches = await findMatches(action.payload);
      return { widget: MatchesCard(matches) };
  }
}
```

## Notes

- Widgets conform to ChatKit's widget API (see Widgets.pdf)
- Actions use versioned namespaces (`easymo.v1.*`)
- Form field values are merged into action payload by field name
- Long-running actions use `loadingBehavior: "container"` to block UI

## See Also

- `/docs/CHATKIT_WIDGETS.md` - Widget usage guide
- `/docs/WHATSAPP_BROADCAST.md` - WhatsApp broadcast implementation
- OpenAI ChatKit Documentation

