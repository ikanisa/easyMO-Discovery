# PWA Permissions & Capability UX

## Principles
- Ask only after explicit user intent (button tap, feature entry).
- Explain why you need the permission and what the user gets.
- Provide a fallback if denied or unsupported.
- Remember user choice and offer a settings screen to re-enable.

## Capability Map (Current)
- Location: used for discovery + pickup suggestions.
  - UX: request on first feature use, offer manual entry if denied.
- Camera: used for QR scanning.
  - UX: prompt on scan screen, offer file upload fallback.
- Notifications: not enabled yet.
  - UX: soft prompt in settings, then system prompt.
  - Config: set `VITE_VAPID_PUBLIC_KEY` + `VITE_PUSH_ENDPOINT` to enable.
- Storage: request persistent storage in Settings to reduce eviction risk.

## When to Prompt
- Location: when user starts discovery or taps "Find Ride".
- Camera: when user opens QR Scanner.
- Notifications: after user opts in from Settings and sees value proposition.

## Fallbacks
- Location denied: allow manual location entry or city selector.
- Camera denied: allow image upload or QR code input.
- Notifications unsupported: in-app inbox + optional email/SMS.
