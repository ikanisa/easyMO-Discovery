/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Design tokens: Colors
      colors: {
        glass: 'rgba(255, 255, 255, 0.1)',
        glassBorder: 'rgba(255, 255, 255, 0.2)',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      },
      // Design tokens: Border radius (mobile prototype style)
      borderRadius: {
        'card': '1.5rem',      // 24px - for cards
        'button': '1rem',      // 16px - for buttons
        'pill': '2rem',        // 32px - for pill-shaped elements
        'widget': '1.25rem',   // 20px - for home widgets
      },
      // Design tokens: Max width (phone canvas)
      maxWidth: {
        'phone': '420px',      // Main app frame
      },
      // Design tokens: Spacing rhythm
      spacing: {
        'nav': '5rem',         // Bottom nav height
        'header': '4rem',      // Page header height
      },
      // Design tokens: Shadows
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}

