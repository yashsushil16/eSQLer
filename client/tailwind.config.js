/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Public Sans"', 'system-ui', 'sans-serif'],
        display: ['"Public Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        none: '0',
        sm: '0',
        DEFAULT: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
        full: '9999px',
      },
      boxShadow: {
        sm: 'none',
        DEFAULT: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
        inner: 'none',
        none: 'none',
      },
      colors: {
        // Professional, rich colors (no pure white, no neon, no pastel)
        canvas: '#F3F4F6',
        card: '#F9FAFB',
        textMain: '#111827', 
        textMuted: '#4B5563', 
        borderMain: '#D1D5DB', 
        primary: {
          400: '#3B82F6', 
          500: '#2563EB', 
          600: '#1D4ED8', 
        },
        secondary: {
          500: '#059669', 
          600: '#047857', 
        },
        accent: {
          500: '#D97706', 
          600: '#B45309', 
        },
      },
    },
  },
  plugins: [],
}
