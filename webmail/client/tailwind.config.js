/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Les couleurs pointent vers les variables CSS de index.css
      // (palette Gmail). Un seul changement de variable rethématise tout.
      colors: {
        ink: 'var(--ink)',
        'ink-dim': 'var(--ink-dim)',
        'ink-faint': 'var(--ink-faint)',
        surface: 'var(--surface)',
        'surface-3': 'var(--surface-3)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        accent: 'var(--accent)',
        'accent-ink': 'var(--accent-ink)',
        'accent-soft': 'var(--accent-soft)',
        'accent-line': 'var(--accent-line)',
        'on-accent': 'var(--on-accent)',
        'row-hover': 'var(--row-hover)',
        selected: 'var(--selected)',
        'search-bg': 'var(--search-bg)',
        star: 'var(--star)',
        'star-line': 'var(--star-line)',
        danger: 'var(--danger)',
        brand: 'var(--brand)',
        'reader-bg': 'var(--reader-bg)',
        'canvas-bg': 'var(--canvas-bg)',
        'compose-bg': 'var(--compose-bg)',
        'compose-ink': 'var(--compose-ink)',
      },
    },
  },
  plugins: [],
};
