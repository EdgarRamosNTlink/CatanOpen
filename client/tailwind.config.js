/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Colores de recursos para el HUD (usan variables CSS definidas en index.css).
        wood: '#6b8f3c',
        brick: '#b45a3c',
        sheep: '#9fd17f',
        wheat: '#e0c34a',
        ore: '#8a8d99',
        sand: '#e3c98b',
      },
      fontFamily: {
        display: ['"Cinzel"', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
