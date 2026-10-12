/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'bg-main': 'var(--bg-main)',
        'bg-card': 'var(--bg-card)',
        'bg-header': 'var(--bg-header)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        text: 'var(--text)',
        'text-sub': 'var(--text-sub)',
        'text-muted': 'var(--text-muted)',
        'text-strong': 'var(--text-strong)',
        accent: 'var(--accent)',
        'accent-light': 'var(--accent-light)',
        status: {
          online: 'var(--status-online)',
          'online-to': 'var(--status-online-to)',
          warning: 'var(--status-warning)',
          critical: 'var(--status-critical)',
          offline: 'var(--status-offline)',
        }
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
