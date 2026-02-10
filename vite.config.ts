/// <reference types="vitest" />
/// <reference types="vite/client" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // No aliases needed - using real adapters now
    },
  },
  optimizeDeps: {
    exclude: ['sql.js'],
  },
  assetsInclude: ['**/*.sql', '**/*.wasm'],
  server: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: false,
    fs: {
      // Exclude playwright-report from scanning
      deny: ['**/playwright-report/**'],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    // Note: setting `exclude` overrides Vitest defaults, so include node_modules here explicitly.
    exclude: ['**/node_modules/**', 'e2e/**', 'android/**', 'dist/**'],
  },
})
