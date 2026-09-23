import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Without Firebase keys the app silently runs in demo mode (local data, sample classmates).
  // That must never reach production, so a production build without keys fails unless demo is explicit.
  const env = loadEnv(mode, process.cwd(), '');
  if (mode === 'production' && !env.VITE_FIREBASE_API_KEY && env.VITE_ALLOW_DEMO_BUILD !== 'true') {
    throw new Error('VITE_FIREBASE_API_KEY is not set. Add the Firebase keys, or set VITE_ALLOW_DEMO_BUILD=true for a demo build.');
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
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/functions',
            'firebase/storage',
            'firebase/app-check',
          ],
          'vendor-utils': ['fuse.js', 'clsx', 'tailwind-merge'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
};
});
