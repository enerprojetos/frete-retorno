import forms from '@tailwindcss/forms'
import containerQueries from '@tailwindcss/container-queries'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#C0392B',
        'accent-red': '#ef4444',
        'background-light': '#FFFFFF',
        'background-dark': '#FFFFFF',
        'surface-dark': '#F9FAFB',
        'border-dark': '#E5E7EB',
        'text-main': '#111827',
        'text-muted': '#4B5563',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [forms, containerQueries],
}
