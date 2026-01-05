# Image Optimization Pipeline Setup

This document describes how to set up automatic image optimization for the easyMO Discovery PWA.

## Overview

The blueprint requires:
- **AVIF preferred, WebP fallback** format
- **Responsive srcset** with multiple sizes
- **Never ship original camera images** (optimize all user-uploaded images)
- **Blur-up placeholders** for better perceived performance

## Installation

### Option 1: vite-imagetools (Recommended)

```bash
cd apps/pwa
npm install -D vite-imagetools
```

Update `vite.config.ts`:

```typescript
import { imagetools } from 'vite-imagetools';

export default defineConfig({
  plugins: [
    react(),
    imagetools({
      defaultDirectives: (url) => {
        if (url.searchParams.has('unoptimized')) {
          return new URLSearchParams();
        }
        return new URLSearchParams({
          format: 'avif;webp',
          quality: '80',
        });
      },
    }),
    // ... other plugins
  ],
});
```

### Option 2: @rollup/plugin-image (Alternative)

```bash
cd apps/pwa
npm install -D @rollup/plugin-image
```

## Usage in Components

### Basic Optimized Image

```tsx
import heroImage from '@/assets/hero.jpg?w=800;1200;1600&format=avif;webp';

// Use in component:
<img 
  src={heroImage.src} 
  srcSet={heroImage.srcSet} 
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
  alt="Hero image"
  loading="lazy"
/>
```

### With Blur Placeholder

```tsx
import heroImage from '@/assets/hero.jpg?w=800&format=avif;webp&blur=20';

<img 
  src={heroImage.placeholder} 
  data-src={heroImage.src}
  srcSet={heroImage.srcSet}
  className="blur-sm"
  alt="Hero"
  loading="lazy"
  onLoad={(e) => {
    // Remove blur when loaded
    e.currentTarget.classList.remove('blur-sm');
  }}
/>
```

### Responsive Image Component

Create a reusable component:

```tsx
// components/OptimizedImage.tsx
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  sizes = '(max-width: 768px) 100vw, 800px',
  className,
  priority = false,
}) => {
  // In a real implementation, import the image with vite-imagetools directives
  // For now, this is a placeholder showing the pattern
  
  return (
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
};
```

## User-Uploaded Images

For images uploaded by users (via Supabase Storage, R2, etc.), optimize on the server/edge:

### Cloudflare Workers (Recommended)

```typescript
// worker/optimize-image.ts
export async function optimizeImage(imageBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  // Use Cloudflare Images API or transform via Worker
  // This ensures user uploads are automatically optimized
}
```

### Supabase Edge Function

```typescript
// supabase/functions/optimize-image/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  
  // Optimize using Sharp or similar
  const optimized = await optimize(file);
  
  return new Response(optimized, {
    headers: { 'Content-Type': 'image/avif' },
  });
});
```

## Data Saver Mode Integration

When data saver mode is enabled, serve lower quality images:

```tsx
import { useDataSaver } from '../context/DataSaverContext';

const { shouldReduceImages } = useDataSaver();

const imageQuality = shouldReduceImages ? 60 : 80;
const imageSrc = `/api/images/${id}?quality=${imageQuality}&format=webp`;
```

## Build-Time Optimization

Images in `public/` directory are copied as-is. For optimization:

1. Move images to `src/assets/` or `assets/`
2. Import them in components to trigger optimization
3. Or use a build script to pre-optimize `public/` images

## Checklist

- [ ] Install `vite-imagetools` or alternative
- [ ] Configure vite.config.ts
- [ ] Update existing `<img>` tags to use optimized imports
- [ ] Set up server-side optimization for user uploads
- [ ] Test responsive images on various screen sizes
- [ ] Verify AVIF/WebP formats are served (check Network tab)
- [ ] Ensure data saver mode reduces image quality
- [ ] Add blur placeholders for above-the-fold images

## Performance Budget

Images should:
- **Never exceed 500KB** (per budget)
- Use **AVIF** when supported (better compression)
- **WebP fallback** for older browsers
- **Lazy load** below-the-fold images
- **Responsive srcset** to avoid oversized images on mobile

## Testing

```bash
# Check image formats in build output
npm run build
ls -lh apps/pwa/dist/assets/*.{avif,webp}

# Verify responsive sizes
npm run preview
# Open DevTools > Network > Filter by Images
# Check that appropriate sizes are loaded based on viewport
```

