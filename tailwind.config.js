/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#289DB9',
          50:  '#E6F7FA',
          100: '#C0EFF5',
          200: '#8FDBEB',
          300: '#5EC9E0',
          400: '#289DB9',
          500: '#1F7E90',
          600: '#146F78',
          700: '#0E4F5A',
        },
        secondary: {
          DEFAULT: '#3F5965',
          50:  '#F1F4F6',
          100: '#D9E0E4',
          200: '#B6CBD5',
          300: '#93B6C6',
          400: '#6D9AB0',
          500: '#3F5965',
          600: '#324E59',
          700: '#243C45',
        },
      },
      boxShadow: {
        'input':       '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'input-focus': '0 0 0 2px rgba(40, 157, 185, 0.1)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
