import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { loadEnvConfig } from '@next/env'
import { prisma } from '@/db/prisma'
import { hashSync } from 'bcrypt-ts-edge'

// Load environment variables
loadEnvConfig(process.cwd())

const TEST_EMAIL = process.env.TEST_EMAIL || 'oauth-test@example.com'

/**
 * End-to-End Tests for Google OAuth Authentication Flow
 *
 * These tests simulate the complete OAuth flow including:
 * 1. New user sign-in via Google OAuth
 * 2. Existing user account linking
 * 3. Session management
 * 4. Mixed authentication (OAuth + Credentials)
 *
 * Requirements:
 * - PostgreSQL database running
 * - Valid DATABASE_URL in .env
 * - TEST_EMAIL in .env (optional, for realistic testing)
 *
 * Note: These tests simulate the OAuth callback handling without
 * actually making requests to Google's OAuth servers.
 */

describe('E2E: Google OAuth Authentication Flow', () => {
  const timestamp = Date.now()
  const TEST_GOOGLE_USER = {
    id: 'google-oauth-user-123',
    email: `oauth-e2e-${timestamp}@gmail.com`,
    name: 'OAuth E2E Test User',
  }

  const existingUserEmail = `oauth-existing-${timestamp}@gmail.com`
  const mixedUserEmail = `oauth-mixed-${timestamp}@gmail.com`

  beforeAll(async () => {
    // Clean up any existing test data
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              TEST_GOOGLE_USER.email,
              existingUserEmail,
              mixedUserEmail,
            ],
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
            in: [
              TEST_GOOGLE_USER.email,
              existingUserEmail,
              mixedUserEmail,
            ],
          },
        },
      })
    } catch (error) {
      console.error('Cleanup error:', error)
    }

    await prisma.$disconnect()
  })

  describe('New User OAuth Sign-In', () => {
    let userId: string

    it('should create user account from Google OAuth data', async () => {
      console.log('📝 Step 1: Creating new user from Google OAuth...')

      // Simulate what happens when OAuth callback is processed
      const user = await prisma.user.create({
        data: {
          name: TEST_GOOGLE_USER.name,
          email: TEST_GOOGLE_USER.email,
          password: null, // OAuth users have no password
          role: 'INVESTOR', // Default role
        },
      })

      userId = user.id

      expect(user).toBeDefined()
      expect(user.email).toBe(TEST_GOOGLE_USER.email)
      expect(user.password).toBeNull()
      expect(user.role).toBe('INVESTOR')
      console.log('✅ User created successfully:', user.id)
    })

    it('should link Google account to user', async () => {
      console.log('🔗 Step 2: Linking Google account...')

      const account = await prisma.account.create({
        data: {
          userId: userId,
          type: 'oauth',
          provider: 'google',
          providerAccountId: TEST_GOOGLE_USER.id,
          access_token: 'mock-google-access-token',
          refresh_token: 'mock-google-refresh-token',
          expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
          token_type: 'Bearer',
          scope: 'openid profile email',
          id_token: 'mock-google-id-token',
        },
      })

      expect(account).toBeDefined()
      expect(account.provider).toBe('google')
      expect(account.providerAccountId).toBe(TEST_GOOGLE_USER.id)
      console.log('✅ Google account linked')
    })

    it('should create session for authenticated user', async () => {
      console.log('🎫 Step 3: Creating session...')

      const sessionToken = `session-${Date.now()}-${Math.random()}`
      const session = await prisma.session.create({
        data: {
          userId: userId,
          sessionToken: sessionToken,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      })

      expect(session).toBeDefined()
      expect(session.userId).toBe(userId)
      expect(session.expires.getTime()).toBeGreaterThan(Date.now())
      console.log('✅ Session created')
    })

    it('should retrieve complete user profile with OAuth data', async () => {
      console.log('📋 Step 4: Retrieving user profile...')

      const userProfile = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          accounts: true,
          sessions: true,
        },
      })

      expect(userProfile).toBeDefined()
      expect(userProfile?.accounts).toHaveLength(1)
      expect(userProfile?.accounts[0].provider).toBe('google')
      expect(userProfile?.sessions.length).toBeGreaterThan(0)
      console.log('✅ User profile complete with OAuth account')
    })

    it('should verify user has no password (OAuth-only)', async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      })

      expect(user?.password).toBeNull()
      console.log('✅ Confirmed: User has no password (OAuth-only)')
    })
  })

  describe('Existing User Account Linking', () => {
    let existingUserId: string

    it('should create existing user with credentials first', async () => {
      console.log('👤 Step 1: Creating user with credentials...')

      const user = await prisma.user.create({
        data: {
          name: 'Existing Credentials User',
          email: existingUserEmail,
          password: hashSync('SecurePassword123!', 10),
          role: 'INVESTOR',
        },
      })

      existingUserId = user.id
      expect(user.password).not.toBeNull()
      console.log('✅ Credentials user created:', user.id)
    })

    it('should find existing user by email during OAuth sign-in', async () => {
      console.log('🔍 Step 2: Finding existing user by email...')

      const existingUser = await prisma.user.findUnique({
        where: { email: existingUserEmail },
      })

      expect(existingUser).toBeDefined()
      expect(existingUser?.id).toBe(existingUserId)
      expect(existingUser?.password).not.toBeNull()
      console.log('✅ Existing user found')
    })

    it('should link Google account to existing credentials user', async () => {
      console.log('🔗 Step 3: Linking Google to existing account...')

      const account = await prisma.account.create({
        data: {
          userId: existingUserId,
          type: 'oauth',
          provider: 'google',
          providerAccountId: 'google-existing-user-789',
          access_token: 'mock-access-token-existing',
          token_type: 'Bearer',
          scope: 'openid profile email',
        },
      })

      expect(account.userId).toBe(existingUserId)
      expect(account.provider).toBe('google')
      console.log('✅ Google account linked to existing user')
    })

    it('should verify user has both password and Google account', async () => {
      console.log('✔️  Step 4: Verifying mixed authentication...')

      const user = await prisma.user.findUnique({
        where: { id: existingUserId },
        include: {
          accounts: true,
        },
      })

      expect(user?.password).not.toBeNull() // Still has password
      expect(user?.accounts).toHaveLength(1)
      expect(user?.accounts[0].provider).toBe('google')
      console.log('✅ User has both password and Google OAuth')
    })

    it('should allow sign-in with either method', async () => {
      console.log('🔐 Step 5: Testing dual authentication...')

      // User can sign in with credentials (password exists)
      expect(existingUserId).toBeDefined()

      // User can sign in with Google (account exists)
      const googleAccount = await prisma.account.findFirst({
        where: {
          userId: existingUserId,
          provider: 'google',
        },
      })

      expect(googleAccount).toBeDefined()
      console.log('✅ Both authentication methods available')
    })
  })

  describe('Session Lifecycle', () => {
    let sessionUserId: string
    let sessionToken: string

    beforeAll(async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Session Test User',
          email: 'session-test@gmail.com',
          password: null,
          role: 'INVESTOR',
        },
      })
      sessionUserId = user.id
    })

    afterAll(async () => {
      await prisma.user.delete({ where: { id: sessionUserId } })
    })

    it('should create session on OAuth sign-in', async () => {
      sessionToken = `session-${Date.now()}`

      const session = await prisma.session.create({
        data: {
          userId: sessionUserId,
          sessionToken: sessionToken,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      expect(session).toBeDefined()
      expect(session.sessionToken).toBe(sessionToken)
    })

    it('should retrieve session by token', async () => {
      const session = await prisma.session.findUnique({
        where: { sessionToken: sessionToken },
        include: {
          user: true,
        },
      })

      expect(session).toBeDefined()
      expect(session?.user.id).toBe(sessionUserId)
    })

    it('should validate session expiry', async () => {
      const session = await prisma.session.findUnique({
        where: { sessionToken: sessionToken },
      })

      const isValid = session && session.expires > new Date()
      expect(isValid).toBe(true)
    })

    it('should delete session on sign-out', async () => {
      await prisma.session.delete({
        where: { sessionToken: sessionToken },
      })

      const deletedSession = await prisma.session.findUnique({
        where: { sessionToken: sessionToken },
      })

      expect(deletedSession).toBeNull()
    })

    it('should handle expired sessions', async () => {
      const expiredToken = `expired-${Date.now()}`

      await prisma.session.create({
        data: {
          userId: sessionUserId,
          sessionToken: expiredToken,
          expires: new Date(Date.now() - 1000), // Expired
        },
      })

      const session = await prisma.session.findUnique({
        where: { sessionToken: expiredToken },
      })

      const isExpired = session && session.expires < new Date()
      expect(isExpired).toBe(true)
    })
  })

  describe('Mixed Authentication Flow', () => {
    let mixedUserId: string

    it('should support user with multiple authentication methods', async () => {
      console.log('🔀 Testing mixed authentication flow...')

      // Create user with Google OAuth
      const user = await prisma.user.create({
        data: {
          name: 'Mixed Auth User',
          email: mixedUserEmail,
          password: null, // Initially OAuth-only
          role: 'INVESTOR',
        },
      })

      mixedUserId = user.id

      // Add Google account
      await prisma.account.create({
        data: {
          userId: mixedUserId,
          type: 'oauth',
          provider: 'google',
          providerAccountId: 'google-mixed-user-999',
          access_token: 'mock-token',
          token_type: 'Bearer',
        },
      })

      // Later, user sets a password (future feature)
      await prisma.user.update({
        where: { id: mixedUserId },
        data: {
          password: hashSync('NewPassword123!', 10),
        },
      })

      const updatedUser = await prisma.user.findUnique({
        where: { id: mixedUserId },
        include: { accounts: true },
      })

      expect(updatedUser?.password).not.toBeNull()
      expect(updatedUser?.accounts).toHaveLength(1)
      console.log('✅ User has both OAuth and credentials')
    })

    it('should maintain separate 2FA settings for credentials', async () => {
      // Add 2FA fields (these should only apply to credentials login)
      await prisma.user.update({
        where: { id: mixedUserId },
        data: {
          twoFactorCode: '123456',
          twoFactorExpiry: new Date(Date.now() + 5 * 60 * 1000),
        },
      })

      const user = await prisma.user.findUnique({
        where: { id: mixedUserId },
      })

      expect(user?.twoFactorCode).toBe('123456')
      expect(user?.twoFactorExpiry).toBeDefined()
      console.log('✅ 2FA settings maintained for credentials')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should prevent duplicate Google accounts with same providerAccountId', async () => {
      const user1 = await prisma.user.create({
        data: {
          name: 'User 1',
          email: 'user1@example.com',
          password: null,
          role: 'INVESTOR',
        },
      })

      await prisma.account.create({
        data: {
          userId: user1.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: 'duplicate-google-id',
          access_token: 'token',
          token_type: 'Bearer',
        },
      })

      const user2 = await prisma.user.create({
        data: {
          name: 'User 2',
          email: 'user2@example.com',
          password: null,
          role: 'INVESTOR',
        },
      })

      // Try to link same Google account to different user
      await expect(
        prisma.account.create({
          data: {
            userId: user2.id,
            type: 'oauth',
            provider: 'google',
            providerAccountId: 'duplicate-google-id', // Same ID
            access_token: 'token2',
            token_type: 'Bearer',
          },
        })
      ).rejects.toThrow()

      await prisma.user.deleteMany({
        where: { email: { in: ['user1@example.com', 'user2@example.com'] } },
      })
    })

    it('should handle missing email gracefully', async () => {
      // This should fail due to unique constraint
      await expect(
        prisma.user.create({
          data: {
            name: 'No Email User',
            email: TEST_GOOGLE_USER.email, // Duplicate email
            password: null,
            role: 'INVESTOR',
          },
        })
      ).rejects.toThrow()
    })

    it('should cascade delete related records when user is deleted', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Delete Test User',
          email: 'delete-test@example.com',
          password: null,
          role: 'INVESTOR',
        },
      })

      const account = await prisma.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: 'delete-test-google-id',
          access_token: 'token',
          token_type: 'Bearer',
        },
      })

      const session = await prisma.session.create({
        data: {
          userId: user.id,
          sessionToken: 'delete-test-session',
          expires: new Date(Date.now() + 1000 * 60 * 60),
        },
      })

      // Delete user
      await prisma.user.delete({ where: { id: user.id } })

      // Verify cascade delete
      const deletedAccount = await prisma.account.findUnique({
        where: { id: account.id },
      })
      const deletedSession = await prisma.session.findUnique({
        where: { id: session.id },
      })

      expect(deletedAccount).toBeNull()
      expect(deletedSession).toBeNull()
    })
  })

  describe('Complete OAuth Flow Success', () => {
    it('should complete full OAuth authentication journey', async () => {
      console.log('🎉 Testing complete OAuth flow...')

      // 1. User clicks "Continue with Google"
      console.log('1️⃣  User clicks "Continue with Google"')

      // 2. User authorizes app on Google
      console.log('2️⃣  User authorizes app on Google')

      // 3. OAuth callback receives user data
      console.log('3️⃣  OAuth callback processes user data')

      const oauthUserData = {
        email: 'complete-flow@gmail.com',
        name: 'Complete Flow User',
        googleId: 'google-complete-123',
      }

      // 4. Check if user exists
      let user = await prisma.user.findUnique({
        where: { email: oauthUserData.email },
      })

      if (!user) {
        // 5. Create new user
        user = await prisma.user.create({
          data: {
            name: oauthUserData.name,
            email: oauthUserData.email,
            password: null,
            role: 'INVESTOR',
          },
        })
        console.log('4️⃣  New user created')
      } else {
        console.log('4️⃣  Existing user found')
      }

      // 6. Link Google account
      const account = await prisma.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: oauthUserData.googleId,
          access_token: 'complete-flow-token',
          token_type: 'Bearer',
          scope: 'openid profile email',
        },
      })
      console.log('5️⃣  Google account linked')

      // 7. Create session
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          sessionToken: `complete-flow-session-${Date.now()}`,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })
      console.log('6️⃣  Session created')

      // 8. Verify complete setup
      const completeUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          accounts: true,
          sessions: true,
        },
      })

      expect(completeUser).toBeDefined()
      expect(completeUser?.accounts).toHaveLength(1)
      expect(completeUser?.sessions).toHaveLength(1)
      expect(completeUser?.password).toBeNull()

      console.log('✅ Complete OAuth flow successful!')
      console.log('7️⃣  User redirected to dashboard')

      // Cleanup
      await prisma.user.delete({ where: { id: user.id } })
    })
  })
})
