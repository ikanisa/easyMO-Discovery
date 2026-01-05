/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
    './state/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // Spacing scale (mobile-first, thumb-friendly)
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
        'thumb-zone': '88px', // Bottom safe zone for thumb (2x 44px)
      },
      // Typography scale (minimum 16px for body, 14px for labels)
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],      // 12px
        'sm': ['0.875rem', { lineHeight: '1.5' }],     // 14px - minimum label
        'base': ['1rem', { lineHeight: '1.5' }],       // 16px - minimum body
        'lg': ['1.125rem', { lineHeight: '1.5' }],    // 18px
        'xl': ['1.25rem', { lineHeight: '1.5' }],     // 20px
        '2xl': ['1.5rem', { lineHeight: '1.4' }],     // 24px - headings
        '3xl': ['1.875rem', { lineHeight: '1.3' }],   // 30px
      },
      // Border radius (mobile-friendly, rounded)
      borderRadius: {
        'xs': '0.5rem',    // 8px
        'sm': '0.75rem',   // 12px
        'base': '1rem',    // 16px
        'lg': '1.25rem',   // 20px
        'xl': '1.5rem',    // 24px
        '2xl': '1.75rem',  // 28px
        '3xl': '2rem',     // 32px
      },
      // Shadows (mobile-optimized, subtle)
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'base': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      },
      // Tap target sizes (WCAG AA: minimum 44px)
      minHeight: {
        'tap': '44px',     // Minimum tap target
        'tap-lg': '56px',  // Large tap target (primary actions)
      },
      minWidth: {
        'tap': '44px',
        'tap-lg': '56px',
      },
      // Colors (high contrast, accessible)
      colors: {
        'primary': {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',  // Primary
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
};
