import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Le frontend ne parle qu'à l'API locale (localhost uniquement).
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: false,
      },
    },
  },
});
