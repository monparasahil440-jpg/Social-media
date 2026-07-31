/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
        'dm-sans': ['DM Sans', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],   // default sans = DM Sans
      },
    },
  },
  plugins: [],
}