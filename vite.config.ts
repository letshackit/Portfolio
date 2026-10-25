import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  build: {
    target: ['es2020', 'safari14'],
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 800, // three is ~700 kB raw; the real gate is scripts/check-budgets.mjs
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/three/') ||
            id.includes('node_modules/@react-three/') ||
            id.includes('node_modules/react-reconciler') ||
            id.includes('node_modules/zustand') ||
            id.includes('node_modules/its-fine') ||
            id.includes('node_modules/suspend-react') ||
            id.includes('node_modules/react-use-measure')
          )
            return 'three';
          if (id.includes('node_modules/gsap')) return 'motion';
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler')
          )
            return 'vendor-react';
        },
      },
    },
  },
  // Loopback only, and never serve the repo's own metadata (.git holds the remote URL, .sdlc the decision record).
  server: { fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.sdlc/**'] } },
  preview: { port: 4173 },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
});
