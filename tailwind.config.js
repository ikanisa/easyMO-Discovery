/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        glass: 'rgba(255, 255, 255, 0.1)',
        glassBorder: 'rgba(255, 255, 255, 0.2)',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      },
      backdropBlur: {
        xs: '2px',
      },
      maxWidth: {
        'app': '28rem', // 448px - phone canvas width
      },
      borderRadius: {
        'card': '1.5rem',
        'widget': '2rem',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
}

