/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './popup.html',
    './dashboard.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3da9fc',
        headline: '#094067',
        paragraph: '#5f6c7b',
        background: '#fffffe',
        'border-light': '#e2e8f0',
        secondary: '#90b4ce',
        tertiary: '#ef4565',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};
