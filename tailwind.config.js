/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sigma: {
          50: '#eef5ff',
          100: '#d8e9ff',
          600: '#1d4ed8',
          700: '#1d3f99',
          900: '#0f172a',
        },
      },
    },
  },
  plugins: [],
}
