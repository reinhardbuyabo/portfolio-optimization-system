import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { loadEnvConfig } from '@next/env'
import { prisma } from '@/db/prisma'
import { hashSync } from 'bcrypt-ts-edge'

// Load environment variables
loadEnvConfig(process.cwd())

const TEST_EMAIL = process.env.TEST_EMAIL || 'oauth-test@example.com'

/**
 * Simple Google OAuth Tests
 *
 * These tests verify the core OAuth functionality without complex scenarios.
 * Uses TEST_EMAIL environment variable for realistic testing.
 *
 * Requirements:
 * - PostgreSQL database running
 * - Valid DATABASE_URL in .env
 * - (Optional) TEST_EMAIL in .env for realistic email testing
 */

describe('Google OAuth - Core Functionality', () => {
  const timestamp = Date.now()
  const testEmails = {
    new: `oauth-new-${timestamp}@test.com`,
    existing: `oauth-existing-${timestamp}@test.com`,
    mixed: `oauth-mixed-${timestamp}@test.com`,
  }

  let newUserId: string
  let existingUserId: string

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: Object.values(testEmails),
        },
      },
    })
  })

  afterAll(async () => {
    // Clean up test data - delete in order: sessions, accounts, users
    try {
      await prisma.session.deleteMany({
        where: {
          user: {
            email: {
              in: Object.values(testEmails),
            },
          },
        },
      })

      await prisma.account.deleteMany({
        where: {
          user: {
            email: {
              in: Object.values(testEmails),
            },
          },
        },
      })

      await prisma.user.deleteMany({
        where: {
          email: {
            in: Object.values(testEmails),
          },
        },
      })
    } catch (error) {
      console.error('Cleanup error:', error)
    }

    await prisma.$disconnect()
  })

  describe('New User OAuth Sign-Up', () => {
    it('should create user without password for OAuth', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'New OAuth User',
          email: testEmails.new,
          password: null, // OAuth users have no password
          role: 'INVESTOR',
        },
      })

      newUserId = user.id

      expect(user.email).toBe(testEmails.new)
      expect(user.password).toBeNull()
      expect(user.role).toBe('INVESTOR')
    })

    it('should create Google account for user', async () => {
      const account = await prisma.account.create({
        data: {
          userId: newUserId,
          type: 'oauth',
          provider: 'google',
          providerAccountId: `google-${timestamp}`,
          access_token: 'mock-token',
          token_type: 'Bearer',
          scope: 'openid profile email',
        },
      })

      expect(account.provider).toBe('google')
      expect(account.userId).toBe(newUserId)
    })

    it('should create session for OAuth user', async () => {
      const session = await prisma.session.create({
        data: {
          userId: newUserId,
          sessionToken: `token-${timestamp}`,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      expect(session.userId).toBe(newUserId)
      expect(session.expires.getTime()).toBeGreaterThan(Date.now())
    })
  })

  describe('Existing User Account Linking', () => {
    it('should create existing credentials user', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Existing User',
          email: testEmails.existing,
          password: hashSync('Password123!', 10),
          role: 'INVESTOR',
        },
      })

      existingUserId = user.id

      expect(user.password).not.toBeNull()
    })

    it('should link Google to existing credentials user', async () => {
      const account = await prisma.account.create({
        data: {
          userId: existingUserId,
          type: 'oauth',
          provider: 'google',
          providerAccountId: `google-existing-${timestamp}`,
          access_token: 'mock-token-2',
          token_type: 'Bearer',
        },
      })

      expect(account.userId).toBe(existingUserId)
    })

    it('should have both password and Google account', async () => {
      const user = await prisma.user.findUnique({
        where: { id: existingUserId },
        include: { accounts: true },
      })

      expect(user?.password).not.toBeNull()
      expect(user?.accounts).toHaveLength(1)
      expect(user?.accounts[0].provider).toBe('google')
    })
  })

  describe('Session Management', () => {
    it('should retrieve active sessions', async () => {
      const sessions = await prisma.session.findMany({
        where: {
          userId: newUserId,
          expires: { gt: new Date() },
        },
      })

      expect(sessions.length).toBeGreaterThan(0)
    })

    it('should delete session', async () => {
      const sessions = await prisma.session.findMany({
        where: { userId: newUserId },
      })

      if (sessions.length > 0) {
        await prisma.session.delete({
          where: { id: sessions[0].id },
        })

        const remaining = await prisma.session.findMany({
          where: { userId: newUserId },
        })

        expect(remaining.length).toBe(sessions.length - 1)
      }
    })
  })

  describe('Database Schema Validation', () => {
    it('should have nullable password field', async () => {
      const user = await prisma.user.findUnique({
        where: { id: newUserId },
        select: { password: true },
      })

      expect(user?.password).toBeNull()
    })

    it('should enforce unique provider+providerAccountId', async () => {
      const account = await prisma.account.findFirst({
        where: { userId: newUserId },
      })

      if (account) {
        await expect(
          prisma.account.create({
            data: {
              userId: existingUserId,
              type: 'oauth',
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: 'duplicate-attempt',
              token_type: 'Bearer',
            },
          })
        ).rejects.toThrow()
      }
    })
  })

  describe('Using TEST_EMAIL', () => {
    it('should support configured TEST_EMAIL', () => {
      console.log(`📧 TEST_EMAIL configured as: ${TEST_EMAIL}`)
      expect(TEST_EMAIL).toBeDefined()
      expect(TEST_EMAIL).toContain('@')
    })

    it('should work with any valid email format', () => {
      const emails = [
        testEmails.new,
        testEmails.existing,
        TEST_EMAIL,
      ]

      emails.forEach((email) => {
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      })
    })
  })
})
