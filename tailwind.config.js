/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './views/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './viewmodels/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        win: '#22c55e',
        loss: '#ef4444',
        skip: '#f59e0b',
        flat: '#6b7280',
        dark: '#1e293b',
        lighter: '#0f172a',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
}