/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        antigravity: {
          dark: '#121212',
          white: '#ffffff',
          navy: '#162a4b',
          blue: '#0021f5',
          cyan: '#39d0ff',
        }
      }
    },
  },
  plugins: [],
}
