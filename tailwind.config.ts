import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f8ff',
          100: '#e6efff',
          200: '#cddfff',
          300: '#a8c4ff',
          400: '#7ea2ff',
          500: '#4b77ff',
          600: '#2d58f7',
          700: '#2346d4',
          800: '#203aa8',
          900: '#1f3587',
        },
      },
      boxShadow: {
        'glow': '0 10px 30px rgba(75, 119, 255, 0.25)'
      },
    },
  },
  plugins: [],
} satisfies Config
