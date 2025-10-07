import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom', // Default to jsdom for component tests
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    environmentMatchGlobs: [
      ['**/*.e2e.test.ts', 'node'],
      ['**/integration/**', 'node'],
      ['**/__tests__/lib/**', 'node'],
      ['**/__tests__/components/**', 'jsdom'], // Use jsdom for component tests
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
})
