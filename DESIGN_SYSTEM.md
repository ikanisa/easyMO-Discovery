# Design System - Mobile-First Architecture

## 🎯 Philosophy

This app is designed **mobile-first**. Desktop is not a stretched version—it shows the mobile UI centered with a backdrop. Every component obeys a constrained "phone canvas" at all breakpoints.

## 📐 Layout System

### App Frame
The entire app lives within a constrained frame:
- **Width**: `420px` max (token: `max-w-phone`)
- **Desktop**: Centered with gray backdrop
- **Mobile**: Full width, no backdrop

```tsx
// Use the app-frame class automatically applied via Layout.tsx
<div className="app-frame">
  {/* Your content here */}
</div>
```

### Fixed Elements
All fixed UI (nav, modals, toasts) must:
1. Use `max-w-phone` to stay within frame
2. Center with `left-1/2 -translate-x-1/2`

```tsx
<nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-phone">
  {/* Nav content */}
</nav>
```

## 🎨 Design Tokens

### Border Radius
```css
rounded-card      /* 1.5rem (24px) - Cards */
rounded-button    /* 1rem (16px) - Buttons */
rounded-pill      /* 2rem (32px) - Pills/Nav */
rounded-widget    /* 1.25rem (20px) - Home widgets */
```

### Spacing
```css
pb-24             /* Bottom padding for nav clearance */
px-6              /* Standard horizontal padding */
space-y-6         /* Section spacing */
```

### Colors
```css
/* Use semantic tokens, not raw colors */
text-primary      /* Primary blue */
text-accent       /* Purple accent */
```

### Component Classes
```css
.glass-panel      /* Glass morphism panel */
.card-shadow      /* Consistent card shadow */
.soft-border      /* Subtle border */
.app-title        /* Page titles */
.app-subtitle     /* Subtitles */
.app-body         /* Body text */
```

## 🏠 Home Screen Layout

### Structure
```tsx
<div className="flex flex-col min-h-full pb-24">
  {/* Header: pt-12 px-6 pb-6 */}
  <div className="pt-12 px-6 pb-6">
    <h1 className="app-title">easyMO</h1>
    <p className="app-subtitle">Your Everyday Companion</p>
  </div>

  {/* Search: px-6 pb-8 */}
  <div className="px-6 pb-8">
    {/* Search bar */}
  </div>

  {/* Content: px-6 pb-6 space-y-6 */}
  <div className="px-6 pb-6 space-y-6">
    {/* Widget grids */}
    <div className="grid grid-cols-2 gap-4">
      {/* Widgets */}
    </div>
  </div>
</div>
```

### Widget Grid
- **Columns**: 2 on phone
- **Gap**: `gap-4` (1rem)
- **Height**: `h-40` consistent

## 🌓 Dark Mode

All components use `.dark:` variants:
```tsx
<div className="bg-white dark:bg-slate-900">
  <p className="text-slate-900 dark:text-slate-100">
    {/* Content */}
  </p>
</div>
```

### Glass Panel Behavior
- **Light**: White glass with subtle border
- **Dark**: Transparent glass with bright border

## 📱 Responsive Rules

### Mobile (default)
- Full width within phone frame
- No extra margins

### Desktop (auto-applied)
- Phone canvas centered
- Desktop backdrop visible
- Subtle frame shadow

### No lg: breakpoints
Unless building an intentional desktop layout, avoid `lg:` classes. The mobile design is shown at all sizes.

## ✅ Quality Checklist

Before shipping:
- [ ] All fixed elements use `max-w-phone`
- [ ] No `max-w-md` nested inside another `max-w-md`
- [ ] Spacing uses tokens (no random `p-5` without reason)
- [ ] Border radius uses tokens (`rounded-card`, not `rounded-xl`)
- [ ] Dark mode tested on every component
- [ ] Desktop looks like centered phone, not stretched

## 🚀 Usage Examples

### Card
```tsx
<div className="glass-panel rounded-card card-shadow p-5">
  <h3 className="app-title">Title</h3>
  <p className="app-body">Content</p>
</div>
```

### Button
```tsx
<button className="px-6 py-3 bg-primary text-white rounded-button card-shadow">
  Click Me
</button>
```

### Widget
```tsx
<HomeWidget
  icon={ICONS.Bike}
  label="Find Ride"
  subLabel="Moto & Cab"
  onClick={handleClick}
  gradient="from-indigo-500 to-blue-500"
  delay={0}
/>
```

## 🔧 Maintenance

### Adding New Components
1. Use existing tokens first
2. If adding new values, add to `tailwind.config.js`
3. Document in this file
4. Update components to use new tokens

### Changing Tokens
1. Update `tailwind.config.js`
2. Update `index.css` if needed
3. Search codebase for hardcoded values
4. Test on mobile AND desktop

## 📊 Visual Regression Testing

Coming soon: Playwright screenshots in `ui-parity/`

---

**Last Updated**: 2025-12-14
**Maintainer**: Product Team
