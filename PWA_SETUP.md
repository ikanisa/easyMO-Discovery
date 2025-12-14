# PWA Setup Documentation

## Overview

easyMO Discovery is a Progressive Web App (PWA) with modern installation, update, and offline capabilities.

## Architecture

### Core Components

1. **PWAProvider** (`hooks/usePWA.tsx`)
   - Context provider for PWA state management
   - Manages install prompt, update notifications, and offline status
   - Auto-registers service worker via vite-plugin-pwa

2. **InstallPrompt** (`components/pwa/InstallPrompt.tsx`)
   - Shows installation banner when app is installable
   - Auto-dismisses for 7 days when user clicks "Not now"
   - Responsive design with gradient UI

3. **UpdatePrompt** (`components/pwa/UpdatePrompt.tsx`)
   - Notifies users when new version is available
   - One-click update with loading state
   - Positioned at top of screen for visibility

4. **OfflineIndicator** (`components/pwa/OfflineIndicator.tsx`)
   - Shows amber banner when device goes offline
   - Auto-hides when connection restored
   - Positioned at top with high z-index

### Directory Structure

```
├── components/pwa/          # PWA UI components
│   ├── InstallPrompt.tsx
│   ├── UpdatePrompt.tsx
│   ├── OfflineIndicator.tsx
│   └── index.ts
├── hooks/
│   └── usePWA.tsx          # PWA state management hook
├── types/
│   └── pwa.d.ts            # TypeScript definitions
├── scripts/
│   ├── generate-pwa-icons.sh
│   └── setup-pwa.sh
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── icon.svg           # Source icon
│   ├── icons/             # Generated PNG icons
│   └── screenshots/       # App store screenshots
└── vite.config.ts         # PWA plugin configuration
```

## Features

### 🚀 Installation
- **Desktop**: Shows install banner with custom UI
- **Mobile**: Native install prompt + custom banner
- **iOS**: Special instructions for Add to Home Screen

### 🔄 Updates
- Automatic update detection
- User-prompted updates (no forced reload)
- Background service worker updates
- Update check every hour when tab visible

### 📴 Offline Support
- Core app functionality cached
- Supabase storage/functions cached (5min)
- Google Fonts cached (1 year)
- Visual offline indicator

### 🎨 Icons
- 9 PWA icon sizes (72px - 512px)
- Maskable icon for adaptive displays
- SVG source for scalability

## Usage

### For Developers

1. **Wrap App with PWAProvider** (already done in `index.tsx`):
```tsx
import { PWAProvider } from './hooks/usePWA';

<PWAProvider>
  <App />
</PWAProvider>
```

2. **Add PWA Components** (already done in `App.tsx`):
```tsx
import { InstallPrompt, UpdatePrompt, OfflineIndicator } from './components/pwa';

<OfflineIndicator />
<UpdatePrompt />
<InstallPrompt />
```

3. **Use PWA Hook** (in any component):
```tsx
import { usePWA } from '../hooks/usePWA';

const MyComponent = () => {
  const { 
    isInstalled, 
    isOffline, 
    needsUpdate, 
    installApp, 
    updateApp 
  } = usePWA();
  
  // Use PWA state
};
```

### For Users

**Desktop (Chrome/Edge)**:
1. Click "Install" button when prompted
2. Or use browser menu: "Install easyMO"

**Mobile (Android)**:
1. Tap "Add to Home Screen" when prompted
2. Or browser menu → "Install app"

**iOS**:
1. Safari → Share button
2. "Add to Home Screen"
3. Tap "Add"

## Configuration

### Manifest (`public/manifest.json`)
- App name, description, colors
- Icons and screenshots
- Shortcuts to key features
- Share target configuration

### Service Worker (`vite.config.ts`)
- Runtime caching strategies
- NetworkFirst for API calls
- CacheFirst for static assets
- Custom cache expiration

### Build Output
```bash
npm run build
```
- Generates optimized service worker
- Creates precache manifest
- Outputs to `dist/`

## Testing

### Development
```bash
npm run dev
```
- Service worker enabled in dev mode
- Test install prompt
- Test offline behavior

### Production Preview
```bash
npm run build
npm run preview
```
- Test production service worker
- Verify caching behavior
- Check update flow

### Browser DevTools
1. **Application Tab**:
   - Service Workers → View registration
   - Manifest → Verify PWA compliance
   - Storage → Check cached assets

2. **Network Tab**:
   - Throttle to "Offline"
   - Verify offline functionality

3. **Lighthouse**:
   - Run PWA audit
   - Check installability
   - Verify performance

## Icon Generation

### Automatic (requires ImageMagick)
```bash
brew install imagemagick
./scripts/generate-pwa-icons.sh
```

### Manual
Use online tools:
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [PWABuilder](https://www.pwabuilder.com/imageGenerator)
- [Maskable.app](https://maskable.app/editor)

Generate these sizes: 72, 96, 128, 144, 152, 192, 384, 512
Plus: maskable-512.png with safe zone padding

## Troubleshooting

### Install Prompt Not Showing
- Check browser support (Chrome 80+, Edge 80+)
- Verify manifest.json is valid
- Ensure HTTPS (or localhost)
- Check if already installed
- Check 7-day dismissal window

### Service Worker Not Registering
- Check browser console for errors
- Verify vite-plugin-pwa configuration
- Clear browser cache
- Check scope in manifest.json

### Update Not Working
- Check `registerType: 'prompt'` in vite.config.ts
- Verify service worker update logic
- Check browser update throttling
- Force refresh (Ctrl+Shift+R)

### Offline Mode Issues
- Check runtime caching configuration
- Verify cached routes in DevTools
- Check network handlers
- Ensure precache includes critical assets

## Best Practices

1. **Always test on real devices** - Emulators don't fully support PWA
2. **Test offline first** - Ensure core functionality works offline
3. **Monitor cache size** - Keep under 50MB for performance
4. **Version service worker** - Force updates when needed
5. **Graceful degradation** - App should work without PWA features

## Resources

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev PWA](https://web.dev/progressive-web-apps/)
- [vite-plugin-pwa Docs](https://vite-pwa-org.netlify.app/)
- [Workbox Docs](https://developer.chrome.com/docs/workbox/)

## Version History

- **v1.0.0** - Initial PWA implementation with install, update, and offline support
