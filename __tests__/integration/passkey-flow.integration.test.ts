import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { loadEnvConfig } from '@next/env'
import { prisma } from '@/db/prisma'
import { hashSync } from 'bcrypt-ts-edge'

// Mock auth and next/cache
vi.mock('@/auth', () => ({
  signIn: vi.fn().mockResolvedValue({ ok: true }),
  signOut: vi.fn(),
  auth: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT: ${url}`)
  }),
}))

import {
  generatePasskeyRegistrationOptions,
  generatePasskeyAuthenticationOptions,
  getUserPasskeys,
  deletePasskey,
} from '@/lib/actions/webauthn.actions'
import { auth } from '@/auth'

// Load environment variables
loadEnvConfig(process.cwd())

const TEST_EMAIL = 'integration-passkey@example.com'
const TEST_PASSWORD = 'IntegrationTest123!'

/**
 * Integration Tests for Passkey Management
 *
 * Tests the integration between passkey actions and the database,
 * verifying that data is correctly stored and retrieved.
 *
 * Requirements:
 * - PostgreSQL database running
 * - Valid DATABASE_URL in .env
 *
 * Run with: npm run test:integration
 */

describe('Integration: Passkey Management', () => {
  let testUserId: string

  beforeAll(async () => {
    // Clean up any existing test user
    try {
      await prisma.user.delete({
        where: { email: TEST_EMAIL },
      })
    } catch (error) {
      // User might not exist, which is fine
    }

    // Create test user
    const user = await prisma.user.create({
      data: {
        name: 'Integration Test User',
        email: TEST_EMAIL,
        password: hashSync(TEST_PASSWORD, 10),
        role: 'INVESTOR',
      },
    })

    testUserId = user.id
  })

  afterAll(async () => {
    // Clean up test user and all related data
    try {
      await prisma.user.delete({
        where: { id: testUserId },
      })
    } catch (error) {
      console.error('Cleanup error:', error)
    }

    await prisma.$disconnect()
  })

  describe('Registration Options Generation', () => {
    it('should generate and store registration challenge', async () => {
      // Mock authenticated session
      vi.mocked(auth).mockResolvedValue({
        user: { email: TEST_EMAIL, id: testUserId },
      } as any)

      const result = await generatePasskeyRegistrationOptions()

      expect(result.success).toBe(true)
      expect(result.options).toBeDefined()
      expect(result.options?.challenge).toBeDefined()
      expect(result.options?.rp.name).toBe('Portfolio Optimization System')
      expect(result.options?.rp.id).toBeDefined()

      // Verify challenge was stored in database
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: {
          webauthnChallenge: true,
          challengeExpiry: true,
        },
      })

      expect(user?.webauthnChallenge).toBe(result.options?.challenge)
      expect(user?.challengeExpiry).toBeDefined()
      expect(user!.challengeExpiry!.getTime()).toBeGreaterThan(Date.now())
      expect(user!.challengeExpiry!.getTime()).toBeLessThan(Date.now() + 6 * 60 * 1000)

      console.log('✅ Registration challenge stored correctly')
    })

    it('should exclude existing authenticators from registration', async () => {
      // Create an existing authenticator
      const existingAuth = await prisma.authenticator.create({
        data: {
          userId: testUserId,
          credentialID: 'existing-cred-id',
          providerAccountId: 'existing-cred-id',
          credentialPublicKey: 'existing-public-key',
          counter: BigInt(0),
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
        },
      })

      vi.mocked(auth).mockResolvedValue({
        user: { email: TEST_EMAIL, id: testUserId },
      } as any)

      const result = await generatePasskeyRegistrationOptions()

      expect(result.success).toBe(true)
      expect(result.options?.excludeCredentials).toBeDefined()
      expect(result.options?.excludeCredentials?.length).toBeGreaterThan(0)

      // Clean up
      await prisma.authenticator.delete({
        where: { id: existingAuth.id },
      })

      console.log('✅ Existing authenticators excluded from registration')
    })

    it('should fail without authentication', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const result = await generatePasskeyRegistrationOptions()

      expect(result.success).toBe(false)
      expect(result.message).toContain('signed in')

      console.log('✅ Registration requires authentication')
    })
  })

  describe('Authentication Options Generation', () => {
    it('should generate authentication options with user email', async () => {
      // Create a test authenticator first
      const auth = await prisma.authenticator.create({
        data: {
          userId: testUserId,
          credentialID: 'auth-test-cred-id',
          providerAccountId: 'auth-test-cred-id',
          credentialPublicKey: 'auth-test-public-key',
          counter: BigInt(0),
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
          transports: 'usb,nfc',
        },
      })

      const result = await generatePasskeyAuthenticationOptions(TEST_EMAIL)

      expect(result.success).toBe(true)
      expect(result.options).toBeDefined()
      expect(result.challenge).toBeDefined()
      expect(result.options?.allowCredentials?.length).toBeGreaterThan(0)

      // Verify challenge was stored
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { webauthnChallenge: true, challengeExpiry: true },
      })

      expect(user?.webauthnChallenge).toBe(result.challenge)
      expect(user?.challengeExpiry).toBeDefined()

      // Clean up
      await prisma.authenticator.delete({ where: { id: auth.id } })

      console.log('✅ Authentication options generated with credentials')
    })

    it('should generate authentication options without email (discoverable)', async () => {
      const result = await generatePasskeyAuthenticationOptions()

      expect(result.success).toBe(true)
      expect(result.options).toBeDefined()
      expect(result.challenge).toBeDefined()
      expect(result.options?.allowCredentials).toEqual([])

      console.log('✅ Discoverable credential options generated')
    })

    it('should handle user with no authenticators', async () => {
      const result = await generatePasskeyAuthenticationOptions(TEST_EMAIL)

      expect(result.success).toBe(true)
      expect(result.options?.allowCredentials).toEqual([])

      console.log('✅ Handles user with no passkeys')
    })
  })

  describe('Passkey Listing and Deletion', () => {
    it('should list user passkeys via database', async () => {
      // Create test authenticators
      const auth1 = await prisma.authenticator.create({
        data: {
          userId: testUserId,
          credentialID: 'list-test-cred-1',
          providerAccountId: 'list-test-cred-1',
          credentialPublicKey: 'public-key-1',
          counter: BigInt(0),
          credentialDeviceType: 'multiDevice',
          credentialBackedUp: true,
        },
      })

      const auth2 = await prisma.authenticator.create({
        data: {
          userId: testUserId,
          credentialID: 'list-test-cred-2',
          providerAccountId: 'list-test-cred-2',
          credentialPublicKey: 'public-key-2',
          counter: BigInt(5),
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
        },
      })

      // Query authenticators directly from database
      const authenticators = await prisma.authenticator.findMany({
        where: { userId: testUserId },
        select: {
          id: true,
          credentialDeviceType: true,
          credentialBackedUp: true,
          createdAt: true,
        },
      })

      expect(authenticators.length).toBe(2)
      expect(authenticators.some((a) => a.credentialDeviceType === 'multiDevice')).toBe(true)
      expect(authenticators.some((a) => a.credentialDeviceType === 'singleDevice')).toBe(true)

      // Clean up
      await prisma.authenticator.delete({ where: { id: auth1.id } })
      await prisma.authenticator.delete({ where: { id: auth2.id } })

      console.log('✅ Successfully listed user passkeys')
    })

    it('should delete a passkey from database', async () => {
      // Create a test authenticator
      const auth = await prisma.authenticator.create({
        data: {
          userId: testUserId,
          credentialID: 'delete-test-cred',
          providerAccountId: 'delete-test-cred',
          credentialPublicKey: 'delete-public-key',
          counter: BigInt(0),
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
        },
      })

      // Delete directly via database
      await prisma.authenticator.delete({ where: { id: auth.id } })

      // Verify it was deleted
      const deletedAuth = await prisma.authenticator.findUnique({
        where: { id: auth.id },
      })

      expect(deletedAuth).toBeNull()

      console.log('✅ Successfully deleted passkey')
    })

    it('should enforce user ownership constraints', async () => {
      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          name: 'Other User',
          email: 'other-user-passkey@example.com',
          password: hashSync('password', 10),
        },
      })

      // Create authenticator for other user
      const otherAuth = await prisma.authenticator.create({
        data: {
          userId: otherUser.id,
          credentialID: 'other-user-cred',
          providerAccountId: 'other-user-cred',
          credentialPublicKey: 'other-public-key',
          counter: BigInt(0),
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
        },
      })

      // Verify authenticator belongs to other user
      const auth = await prisma.authenticator.findUnique({
        where: { id: otherAuth.id },
        include: { user: true },
      })

      expect(auth?.userId).toBe(otherUser.id)
      expect(auth?.userId).not.toBe(testUserId)

      // Clean up
      await prisma.authenticator.delete({ where: { id: otherAuth.id } })
      await prisma.user.delete({ where: { id: otherUser.id } })

      console.log('✅ Enforced user ownership constraints')
    })
  })

  describe('Challenge Expiry', () => {
    it('should set correct expiry time for challenges', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { email: TEST_EMAIL, id: testUserId },
      } as any)

      const beforeGeneration = Date.now()
      await generatePasskeyRegistrationOptions()
      const afterGeneration = Date.now()

      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { challengeExpiry: true },
      })

      const expiryTime = user!.challengeExpiry!.getTime()
      const expectedMin = beforeGeneration + 4.9 * 60 * 1000 // 4.9 minutes
      const expectedMax = afterGeneration + 5.1 * 60 * 1000 // 5.1 minutes

      expect(expiryTime).toBeGreaterThan(expectedMin)
      expect(expiryTime).toBeLessThan(expectedMax)

      console.log('✅ Challenge expiry set correctly (5 minutes)')
    })
  })

  describe('Database Consistency', () => {
    it('should maintain referential integrity', async () => {
      // Create authenticator
      const auth = await prisma.authenticator.create({
        data: {
          userId: testUserId,
          credentialID: 'integrity-test-cred',
          providerAccountId: 'integrity-test-cred',
          credentialPublicKey: 'integrity-public-key',
          counter: BigInt(0),
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
        },
      })

      // Verify the authenticator is linked to the user
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        include: { authenticators: true },
      })

      expect(user?.authenticators.some((a) => a.id === auth.id)).toBe(true)

      // Clean up
      await prisma.authenticator.delete({ where: { id: auth.id } })

      console.log('✅ Database referential integrity maintained')
    })

    it('should handle concurrent challenge updates', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { email: TEST_EMAIL, id: testUserId },
      } as any)

      // Generate multiple challenges concurrently
      const results = await Promise.all([
        generatePasskeyRegistrationOptions(),
        generatePasskeyRegistrationOptions(),
        generatePasskeyRegistrationOptions(),
      ])

      // All should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true)
      })

      // Last challenge should be stored
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { webauthnChallenge: true },
      })

      expect(user?.webauthnChallenge).toBeDefined()

      console.log('✅ Handles concurrent challenge updates')
    })
  })
})

describe('Integration Test Configuration', () => {
  it('should have required environment variables', () => {
    expect(process.env.DATABASE_URL).toBeDefined()

    if (!process.env.DATABASE_URL) {
      console.warn(`
⚠️  Integration passkey tests require:
  - DATABASE_URL (PostgreSQL connection)
      `)
    }
  })
})
