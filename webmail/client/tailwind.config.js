/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Les couleurs pointent vers les variables CSS définies dans index.css :
      // un seul changement de variable rethématise toute l'application.
      colors: {
        ink: 'var(--ink)',
        'ink-dim': 'var(--ink-dim)',
        'ink-faint': 'var(--ink-faint)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        accent: 'var(--accent)',
        'accent-2': 'var(--accent-2)',
        'accent-ink': 'var(--accent-ink)',
        'accent-soft': 'var(--accent-soft)',
        'accent-line': 'var(--accent-line)',
        star: 'var(--star)',
        danger: 'var(--danger)',
      },
      borderColor: {
        DEFAULT: 'var(--line)',
      },
    },
  },
  plugins: [],
};
