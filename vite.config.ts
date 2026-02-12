/// <reference types="vitest" />
/// <reference types="vite/client" />
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
) as { version?: string }
const appVersion = packageJson.version ?? '0.0.0'
const buildHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return 'dev'
  }
})()

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Baked into the bundle at build time; used for the in-app debug footer.
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_HASH__: JSON.stringify(buildHash),
  },
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
      deny: [],
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
