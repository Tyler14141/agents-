import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Forward assistant API calls to the local proxy that holds the Claude key.
const apiProxy = {
  '/api': {
    target: 'http://localhost:8787',
    changeOrigin: true,
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
});
