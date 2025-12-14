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
      }
    },
  },
  plugins: [],
}

