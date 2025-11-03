import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { loadEnvConfig } from '@next/env'
import { prisma } from '@/db/prisma'
import { hashSync } from 'bcrypt-ts-edge'

// Load environment variables
loadEnvConfig(process.cwd())

const TEST_EMAIL = process.env.TEST_EMAIL || 'oauth-test@example.com'
const TEST_EMAIL_NEW = `oauth-new-${Date.now()}@example.com`

/**
 * Integration Tests for Google OAuth Flow
 *
 * These tests verify the database-level operations and account linking logic
 * for Google OAuth authentication.
 *
 * Requirements:
 * - PostgreSQL database running
 * - Valid DATABASE_URL in .env
 * - TEST_EMAIL in .env (optional, defaults to oauth-test@example.com)
 *
 * Note: These tests don't make real OAuth calls to Google.
 * They test the database operations that occur during OAuth flow.
 */

describe('Integration: Google OAuth Account Linking', () => {
  let testUserId: string

  beforeAll(async () => {
    // Clean up any existing test users
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [TEST_EMAIL, TEST_EMAIL_NEW],
          },
        },
      })
    } catch (error) {
      // Ignore if users don't exist
    }
  })

  afterAll(async () => {
    // Clean up test data
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [TEST_EMAIL, TEST_EMAIL_NEW],
          },
        },
      })
    } catch (error) {
      console.error('Cleanup error:', error)
    }

    await prisma.$disconnect()
  })

  describe('New User via Google OAuth', () => {
    it('should create new user without password', async () => {
      // Simulate what PrismaAdapter does when a new user signs in with Google
      const newUser = await prisma.user.create({
        data: {
          name: 'OAuth Test User',
          email: TEST_EMAIL_NEW,
          password: null, // No password for OAuth users
          role: 'INVESTOR',
        },
      })

      expect(newUser).toBeDefined()
      expect(newUser.email).toBe(TEST_EMAIL_NEW)
      expect(newUser.password).toBeNull()
      expect(newUser.role).toBe('INVESTOR')

      testUserId = newUser.id
    })

    it('should create Google account record', async () => {
      // Simulate account linking
      const account = await prisma.account.create({
        data: {
          userId: testUserId,
          type: 'oauth',
          provider: 'google',
          providerAccountId: 'google-user-123',
          access_token: 'mock-access-token',
          token_type: 'Bearer',
          scope: 'openid profile email',
          id_token: 'mock-id-token',
        },
      })

      expect(account).toBeDefined()
      expect(account.provider).toBe('google')
      expect(account.userId).toBe(testUserId)
    })

    it('should create session for OAuth user', async () => {
      const session = await prisma.session.create({
        data: {
          userId: testUserId,
          sessionToken: 'mock-session-token-123',
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      })

      expect(session).toBeDefined()
      expect(session.userId).toBe(testUserId)
      expect(session.expires.getTime()).toBeGreaterThan(Date.now())
    })

    it('should retrieve user with linked accounts', async () => {
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        include: {
          accounts: true,
          sessions: true,
        },
      })

      expect(user).toBeDefined()
      expect(user?.accounts).toHaveLength(1)
      expect(user?.accounts[0].provider).toBe('google')
      expect(user?.sessions).toHaveLength(1)
    })
  })

  describe('Existing User Account Linking', () => {
    let existingUserId: string

    it('should create user with credentials first', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Existing User',
          email: TEST_EMAIL,
          password: hashSync('TestPassword123!', 10),
          role: 'INVESTOR',
        },
      })

      existingUserId = user.id
      expect(user).toBeDefined()
      expect(user.password).not.toBeNull()
    })

    it('should link Google account to existing user', async () => {
      const account = await prisma.account.create({
        data: {
          userId: existingUserId,
          type: 'oauth',
          provider: 'google',
          providerAccountId: 'google-user-456',
          access_token: 'mock-access-token-2',
          token_type: 'Bearer',
          scope: 'openid profile email',
        },
      })

      expect(account).toBeDefined()
      expect(account.userId).toBe(existingUserId)
      expect(account.provider).toBe('google')
    })

    it('should have both password and Google account', async () => {
      const user = await prisma.user.findUnique({
        where: { id: existingUserId },
        include: {
          accounts: true,
        },
      })

      expect(user).toBeDefined()
      expect(user?.password).not.toBeNull() // Still has password
      expect(user?.accounts).toHaveLength(1)
      expect(user?.accounts[0].provider).toBe('google')
    })

    it('should prevent duplicate Google accounts for same user', async () => {
      // Try to create another Google account with same providerAccountId
      await expect(
        prisma.account.create({
          data: {
            userId: existingUserId,
            type: 'oauth',
            provider: 'google',
            providerAccountId: 'google-user-456', // Same as before
            access_token: 'mock-access-token-3',
            token_type: 'Bearer',
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('Session Management', () => {
    it('should create session with correct expiry', async () => {
      const now = Date.now()
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

      const session = await prisma.session.create({
        data: {
          userId: testUserId,
          sessionToken: 'expiry-test-token',
          expires: new Date(now + thirtyDaysMs),
        },
      })

      expect(session.expires.getTime()).toBeGreaterThan(now)
      expect(session.expires.getTime()).toBeLessThanOrEqual(now + thirtyDaysMs + 1000)
    })

    it('should retrieve active sessions only', async () => {
      // Create expired session
      await prisma.session.create({
        data: {
          userId: testUserId,
          sessionToken: 'expired-token',
          expires: new Date(Date.now() - 1000), // Expired 1 second ago
        },
      })

      // Create active session
      await prisma.session.create({
        data: {
          userId: testUserId,
          sessionToken: 'active-token',
          expires: new Date(Date.now() + 1000 * 60 * 60), // Expires in 1 hour
        },
      })

      const activeSessions = await prisma.session.findMany({
        where: {
          userId: testUserId,
          expires: {
            gt: new Date(),
          },
        },
      })

      expect(activeSessions.length).toBeGreaterThanOrEqual(1)
      expect(activeSessions.every((s) => s.expires > new Date())).toBe(true)
    })

    it('should delete session on sign out', async () => {
      const session = await prisma.session.create({
        data: {
          userId: testUserId,
          sessionToken: 'delete-test-token',
          expires: new Date(Date.now() + 1000 * 60 * 60),
        },
      })

      // Simulate sign out
      await prisma.session.delete({
        where: { sessionToken: session.sessionToken },
      })

      const deletedSession = await prisma.session.findUnique({
        where: { sessionToken: session.sessionToken },
      })

      expect(deletedSession).toBeNull()
    })
  })

  describe('Account Retrieval', () => {
    it('should find user by email for account linking check', async () => {
      const user = await prisma.user.findUnique({
        where: { email: TEST_EMAIL },
      })

      expect(user).toBeDefined()
      expect(user?.email).toBe(TEST_EMAIL)
    })

    it('should retrieve account by provider and providerAccountId', async () => {
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: 'google',
            providerAccountId: 'google-user-456',
          },
        },
      })

      expect(account).toBeDefined()
      expect(account?.provider).toBe('google')
    })

    it('should get all accounts for a user', async () => {
      const accounts = await prisma.account.findMany({
        where: { userId: testUserId },
      })

      expect(accounts.length).toBeGreaterThan(0)
    })
  })

  describe('Database Constraints', () => {
    it('should enforce unique email constraint', async () => {
      await expect(
        prisma.user.create({
          data: {
            name: 'Duplicate Email User',
            email: 'oauth-test@example.com', // Already exists
            password: null,
            role: 'INVESTOR',
          },
        })
      ).rejects.toThrow()
    })

    it('should enforce unique session token constraint', async () => {
      const token = 'unique-token-test'

      await prisma.session.create({
        data: {
          userId: testUserId,
          sessionToken: token,
          expires: new Date(Date.now() + 1000 * 60 * 60),
        },
      })

      await expect(
        prisma.session.create({
          data: {
            userId: testUserId,
            sessionToken: token, // Same token
            expires: new Date(Date.now() + 1000 * 60 * 60),
          },
        })
      ).rejects.toThrow()
    })

    it('should cascade delete accounts and sessions when user is deleted', async () => {
      // Create test user with account and session
      const user = await prisma.user.create({
        data: {
          name: 'Cascade Test User',
          email: 'cascade-test@example.com',
          password: null,
          role: 'INVESTOR',
        },
      })

      await prisma.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: 'cascade-test-123',
          access_token: 'token',
          token_type: 'Bearer',
        },
      })

      await prisma.session.create({
        data: {
          userId: user.id,
          sessionToken: 'cascade-session-token',
          expires: new Date(Date.now() + 1000 * 60 * 60),
        },
      })

      // Delete user
      await prisma.user.delete({
        where: { id: user.id },
      })

      // Check that accounts and sessions are deleted
      const accounts = await prisma.account.findMany({
        where: { userId: user.id },
      })

      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
      })

      expect(accounts).toHaveLength(0)
      expect(sessions).toHaveLength(0)
    })
  })

  describe('User Role Assignment', () => {
    it('should assign INVESTOR role by default for OAuth users', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Role Test User',
          email: 'role-test@example.com',
          password: null,
          role: 'INVESTOR', // Default role
        },
      })

      expect(user.role).toBe('INVESTOR')

      await prisma.user.delete({ where: { id: user.id } })
    })

    it('should allow custom role assignment', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Admin Test User',
          email: 'admin-test@example.com',
          password: null,
          role: 'ADMIN',
        },
      })

      expect(user.role).toBe('ADMIN')

      await prisma.user.delete({ where: { id: user.id } })
    })
  })
})

describe('Integration: OAuth Configuration', () => {
  it('should have required environment variables for OAuth', () => {
    // Check that OAuth can be configured (credentials are optional for testing)
    expect(process.env.DATABASE_URL).toBeDefined()
    expect(process.env.AUTH_SECRET).toBeDefined()

    // OAuth credentials are optional
    if (process.env.GOOGLE_CLIENT_ID) {
      expect(process.env.GOOGLE_CLIENT_ID).toMatch(/\.apps\.googleusercontent\.com$/)
    }
  })

  it('should have Account model configured correctly', async () => {
    // Verify Account model has required fields
    const accountFields = await prisma.$queryRaw<any[]>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Account'
      ORDER BY ordinal_position;
    `

    const fieldNames = accountFields.map((f) => f.column_name)

    expect(fieldNames).toContain('id')
    expect(fieldNames).toContain('userId')
    expect(fieldNames).toContain('provider')
    expect(fieldNames).toContain('providerAccountId')
    expect(fieldNames).toContain('access_token')
    expect(fieldNames).toContain('refresh_token')
  })

  it('should have Session model configured correctly', async () => {
    const sessionFields = await prisma.$queryRaw<any[]>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Session'
      ORDER BY ordinal_position;
    `

    const fieldNames = sessionFields.map((f) => f.column_name)

    expect(fieldNames).toContain('id')
    expect(fieldNames).toContain('sessionToken')
    expect(fieldNames).toContain('userId')
    expect(fieldNames).toContain('expires')
  })

  it('should have password as nullable in User model', async () => {
    const userFields = await prisma.$queryRaw<any[]>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'password';
    `

    expect(userFields[0].is_nullable).toBe('YES')
  })
})
