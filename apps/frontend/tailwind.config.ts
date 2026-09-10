import type { Config } from 'tailwindcss';

const config: Config = {
  // TODO: Add safelist for dynamically composed class strings (e.g. statusColors, item.color) to prevent JIT purging
  // TODO: explicitly add ./src/app/**/*.ts and ./src/components/**/*.ts to content — verify non-.tsx TS files aren't missed by the glob on some Tailwind versions
  // TODO: verify content glob covers all .ts files (not just .tsx) — utility modules or config files using dynamic classes may be purged if only .ts extension is present
  // TODO: add darkMode: 'class' if dark-theme toggle is planned — without it, dark: variant classes are always purged
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
        secondary: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
      },
    },
  },
  // TODO: add darkMode: 'class' if dark-theme toggle is planned — without it, dark: variant classes are always purged
  plugins: [],
};

export default config;
