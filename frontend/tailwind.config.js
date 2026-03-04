/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'mitacs-blue': '#005FAF',
        'mitacs-navy': '#0A2473',
        'mitacs-lime': '#cde44b',
        'mitacs-focus': '#109cde',
        'mitacs-light': '#DCE7F0',
      },
      fontFamily: {
        sans: ['questa-sans', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
