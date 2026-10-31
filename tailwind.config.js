/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        felt: {
          dark: '#031509',
          green: '#145a32',
          emerald: '#217a48',
          light: '#2e7d32',
        },
        gold: {
          light: '#ffe082',
          DEFAULT: '#ffd54f',
          dark: '#c9a227',
        }
      },
      fontFamily: {
        persian: ['Vazirmatn', 'Tahoma', 'Segoe UI', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
