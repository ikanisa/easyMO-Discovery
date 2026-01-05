# Widget & Action Patterns (ChatGPT Apps SDK)

**Purpose:** Reference for implementing widgets with actions in the ChatGPT Apps SDK integration

---

## 🎯 Core Principles

### Widget Streaming Rules

1. **Text/Markdown Streaming:**
   - **MUST** have `id="..."` attribute for streaming updates to apply
   - Set `streaming={true}` while updating
   - Set `streaming={false}` when complete

```tsx
// ✅ CORRECT: Streaming text with stable ID
<Text id="result-123" streaming={isStreaming}>
  {streamingContent}
</Text>

// ❌ WRONG: No ID, streaming won't work
<Text streaming={isStreaming}>
  {streamingContent}
</Text>
```

2. **Widget Updates:**
   - Widgets can be returned directly from tool calls
   - Widgets can be streamed by yielding updated widget versions
   - Use stable IDs for widgets that update over time

### Action Handling

**Pattern:** Buttons/forms carry `onClickAction={ActionConfig(...)}` and actions are handled server-side.

```tsx
// Client-side (Widget)
<Button 
  onClickAction={{
    type: 'request_ride',
    intentId: 'abc-123',
    driverId: 'xyz-789'
  }}
>
  Request Ride
</Button>

// Server-side (Worker action handler)
async function action(payload: ActionConfig) {
  const { type, intentId, driverId } = payload;
  
  if (type === 'request_ride') {
    // Handle ride request
    const result = await createRideRequest(intentId, driverId);
    
    // Return updated widget state
    return {
      widget: <MobilityMatchCard 
        status="requested"
        driverId={driverId}
        intentId={intentId}
      />
    };
  }
}
```

---

## 🧩 Widget Toolbox Priority

### 1. Card (Highest Priority)

**Fastest route to native-feeling interactions**

```tsx
<Card>
  <CardHeader>
    <CardTitle>Driver Match</CardTitle>
  </CardHeader>
  <CardContent>
    <p>2.3 km away</p>
    <Button onClickAction={actionConfig}>
      Request Ride
    </Button>
  </CardContent>
</Card>
```

**Use Cases:**
- Mobility matches
- Business listings
- Payment QR codes
- Scanner results

### 2. ListView

**For lists of results**

```tsx
<ListView>
  {items.map(item => (
    <ListItem key={item.id}>
      <ListItemContent>
        <ListItemTitle>{item.title}</ListItemTitle>
        <ListItemDescription>{item.description}</ListItemDescription>
      </ListItemContent>
      <ListItemAction>
        <Button onClickAction={actionConfig}>
          Select
        </Button>
      </ListItemAction>
    </ListItem>
  ))}
</ListView>
```

**Use Cases:**
- Search results
- Nearby drivers
- Business listings
- Category grids

### 3. Forms (Select/Input/RadioGroup)

**For user input**

```tsx
<Form onSubmit={handleSubmit}>
  <Input 
    label="Pickup Location"
    value={pickup}
    onChange={setPickup}
  />
  <Select
    label="Vehicle Type"
    options={['moto', 'cab', 'bus']}
    value={vehicleType}
    onChange={setVehicleType}
  />
  <RadioGroup
    label="Payment Method"
    options={['cash', 'momo']}
    value={payment}
    onChange={setPayment}
  />
  <Button type="submit" onClickAction={actionConfig}>
    Submit
  </Button>
</Form>
```

**Use Cases:**
- Ride request forms
- Business onboarding
- Settings
- Search filters

---

## 📋 Implementation Checklist

### Client-Side (Widget Components)

- [ ] Use `Card` for single-item results
- [ ] Use `ListView` for multiple items
- [ ] Use `Form` components for user input
- [ ] Add `onClickAction={ActionConfig(...)}` to interactive elements
- [ ] Use stable `id` attributes for streaming widgets
- [ ] Set `streaming={true/false}` appropriately

### Server-Side (Action Handler)

- [ ] Implement `action(payload: ActionConfig)` handler in Worker
- [ ] Validate action payloads (treat as untrusted)
- [ ] Return updated widget state after action
- [ ] Handle errors gracefully
- [ ] Log actions for debugging

---

## 🔍 Example: Mobility Match Card

### Widget Component

```tsx
// apps/pwa/components/ai/MobilityMatchCard.tsx
interface MobilityMatchCardProps {
  driverId: string;
  driverName: string;
  distance: number;
  vehicleType: 'moto' | 'cab';
  status: 'available' | 'requested' | 'accepted';
  intentId?: string;
}

export const MobilityMatchCard: React.FC<MobilityMatchCardProps> = ({
  driverId,
  driverName,
  distance,
  vehicleType,
  status,
  intentId,
}) => {
  const actionConfig: ActionConfig = {
    type: 'request_ride',
    driverId,
    intentId,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{driverName}</CardTitle>
        <CardDescription>
          {distance.toFixed(1)} km away • {vehicleType}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'available' && (
          <Button onClickAction={actionConfig}>
            Request Ride
          </Button>
        )}
        {status === 'requested' && (
          <p>Request sent...</p>
        )}
        {status === 'accepted' && (
          <Button onClickAction={{ type: 'reveal_contact', driverId }}>
            Get Contact
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
```

### Action Handler

```typescript
// services/agent-runtime/src/actions/mobility.ts
export async function handleMobilityAction(
  payload: ActionConfig,
  env: Env
): Promise<WidgetUpdate> {
  const { type, driverId, intentId } = payload;

  switch (type) {
    case 'request_ride':
      // Create ride intent
      const intent = await createRideIntent(intentId, driverId);
      
      // Return updated widget
      return {
        widget: <MobilityMatchCard
          driverId={driverId}
          driverName={intent.driverName}
          distance={intent.distance}
          vehicleType={intent.vehicleType}
          status="requested"
          intentId={intent.id}
        />,
      };

    case 'reveal_contact':
      // Get driver contact (with permission check)
      const contact = await getDriverContact(driverId);
      
      return {
        widget: <MobilityMatchCard
          driverId={driverId}
          driverName={contact.name}
          distance={contact.distance}
          vehicleType={contact.vehicleType}
          status="accepted"
          phoneNumber={contact.phone}
        />,
      };

    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}
```

---

## 🚨 Security Considerations

### Untrusted Payloads

**Always validate action payloads server-side:**

```typescript
// ❌ WRONG: Trusting client payload
async function action(payload: ActionConfig) {
  await database.update(payload.userId, payload.data);
}

// ✅ CORRECT: Validating and extracting trusted data
async function action(payload: ActionConfig, userId: string) {
  // Validate payload structure
  if (!payload.type || !payload.intentId) {
    throw new Error('Invalid action payload');
  }
  
  // Use server-side userId, not client-provided
  const intent = await database.getIntent(payload.intentId);
  if (intent.userId !== userId) {
    throw new Error('Unauthorized');
  }
  
  // Process action
  await processAction(payload.type, intent);
}
```

### Rate Limiting

- Implement rate limiting on action handlers
- Prevent abuse of expensive operations
- Log suspicious activity

---

## 📚 References

- [Apps SDK UI Guidelines](https://platform.openai.com/docs/guides/apps-sdk/ui-guidelines)
- [ChatKit Widgets](https://github.com/openai/chatkit-js)
- [MCP Server Documentation](./CHATGPT_APPS_SDK_IMPLEMENTATION.md)

---

**Last Updated:** 2025-01-29

