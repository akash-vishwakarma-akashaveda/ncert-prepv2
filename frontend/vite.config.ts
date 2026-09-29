import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Every request goes to the backend at VITE_API_URL — a production build without it would
  // silently point at localhost:4000 (see services/api/client.ts's fallback), which fails loudly
  // enough in the browser console, but this fails at build time instead so it's caught sooner.
  const env = loadEnv(mode, process.cwd(), '');
  if (mode === 'production' && !env.VITE_API_URL) {
    throw new Error('VITE_API_URL is not set. Point it at the backend, e.g. https://your-domain.com (no /api suffix).');
  }
  return {
  plugins: [react()],
  server: {
    port: 3000,
    open: false,
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-utils': ['fuse.js', 'clsx', 'tailwind-merge'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
};
});
