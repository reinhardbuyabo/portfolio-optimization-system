import '@testing-library/jest-dom'
import { beforeAll, vi } from 'vitest'
import { loadEnvConfig } from '@next/env'

// Load environment variables from .env files
const projectDir = process.cwd()
loadEnvConfig(projectDir)

// Set default test environment variables if not already set
beforeAll(() => {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
  }
  if (!process.env.AUTH_SECRET) {
    process.env.AUTH_SECRET = 'test_secret'
  }
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  }
})

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '',
  redirect: vi.fn(),
}))
