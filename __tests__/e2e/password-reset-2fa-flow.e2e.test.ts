import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { loadEnvConfig } from '@next/env'
import { prisma } from '@/db/prisma'
import { hashSync } from 'bcrypt-ts-edge'
import crypto from 'crypto'

// Mock NextAuth
vi.mock('@/auth', () => ({
  signIn: vi.fn().mockImplementation(async (provider: string, options?: any) => {
    // If redirectTo is specified, simulate NextAuth redirect behavior
    if (options?.redirectTo) {
      const error = new Error('NEXT_REDIRECT') as Error & { digest: string }
      error.digest = `NEXT_REDIRECT;replace;${options.redirectTo};307;`
      throw error
    }
    return { ok: true }
  }),
  signOut: vi.fn(),
  auth: vi.fn(),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock redirect
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    const error = new Error('NEXT_REDIRECT') as Error & { digest: string }
    error.digest = `NEXT_REDIRECT;replace;${url};307;`
    throw error
  }),
}))

import { resetPassword, updatePassword, signInWithCredentials, verifyTwoFactorCode } from '@/lib/actions/users.actions'

// Load environment variables
loadEnvConfig(process.cwd())

// Use unique email for each test run to avoid conflicts
const TEST_EMAIL = `password-reset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`
const OLD_PASSWORD = 'OldPassword123!'
const NEW_PASSWORD = 'NewPassword456!'

/**
 * End-to-End Test for Password Reset with 2FA Flow
 *
 * This test simulates the complete password reset journey:
 * 1. User has an existing account
 * 2. User requests password reset
 * 3. User receives reset link and sets new password
 * 4. User signs in with new password
 * 5. User receives 2FA code
 * 6. User verifies 2FA code
 * 7. User should be redirected appropriately (setup-passkey or verify-passkey)
 * 8. After completing second factor, user accesses dashboard
 *
 * Requirements:
 * - PostgreSQL database running
 * - Valid DATABASE_URL in .env
 *
 * Run with: npm run test:e2e
 */

describe('E2E: Password Reset with 2FA Flow', () => {
  let testUserId: string
  let resetToken: string

  beforeAll(async () => {
    // Clean up any existing test user (deleteMany handles foreign keys better)
    try {
      await prisma.user.deleteMany({
        where: { email: TEST_EMAIL },
      })
      await prisma.user.deleteMany({
        where: { email: { contains: 'password-reset-test' } },
      })
    } catch (error) {
      // Ignore cleanup errors
    }

    // Create test user with old password
    const user = await prisma.user.create({
      data: {
        name: 'Password Reset Test User',
        email: TEST_EMAIL,
        password: hashSync(OLD_PASSWORD, 10),
        role: 'INVESTOR',
      },
    })

    testUserId = user.id
  })

  afterAll(async () => {
    // Clean up test user
    try {
      if (testUserId) {
        await prisma.user.delete({
          where: { id: testUserId },
        })
      }
    } catch (error) {
      console.error('Cleanup error:', error)
    }

    await prisma.$disconnect()
  })

  it('should complete full password reset and 2FA verification flow for user without passkey', async () => {
    // ============================================================
    // STEP 1: User Requests Password Reset
    // ============================================================
    console.log('📧 Step 1: Requesting password reset...')

    const resetFormData = new FormData()
    resetFormData.append('email', TEST_EMAIL)

    const resetResult = await resetPassword(null, resetFormData)

    expect(resetResult.success).toBe(true)
    expect(resetResult.message).toContain('reset link')
    console.log('✅ Password reset link sent')

    // Retrieve reset token from database
    const userWithToken = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
      select: {
        resetToken: true,
        resetTokenExpiry: true,
      },
    })

    expect(userWithToken?.resetToken).toBeDefined()
    expect(userWithToken?.resetTokenExpiry).toBeDefined()
    expect(userWithToken!.resetTokenExpiry!.getTime()).toBeGreaterThan(Date.now())

    resetToken = userWithToken!.resetToken!
    console.log('✅ Reset token retrieved from database')

    // ============================================================
    // STEP 2: User Updates Password
    // ============================================================
    console.log('🔑 Step 2: Updating password...')

    const updateFormData = new FormData()
    updateFormData.append('password', NEW_PASSWORD)
    updateFormData.append('confirmPassword', NEW_PASSWORD)

    const updateResult = await updatePassword(resetToken, updateFormData)

    expect(updateResult.success).toBe(true)
    expect(updateResult.message).toContain('updated successfully')
    expect(updateResult.redirectTo).toBe('/sign-in')
    console.log('✅ Password updated successfully')

    // Verify password was updated and reset token cleared
    const userAfterReset = await prisma.user.findUnique({
      where: { id: testUserId },
      select: {
        password: true,
        resetToken: true,
        resetTokenExpiry: true,
      },
    })

    expect(userAfterReset?.password).toBeDefined()
    expect(userAfterReset?.resetToken).toBeNull()
    expect(userAfterReset?.resetTokenExpiry).toBeNull()
    console.log('✅ Reset token cleared')

    // ============================================================
    // STEP 3: User Signs In with New Password
    // ============================================================
    console.log('🔐 Step 3: Signing in with new password...')

    const signInFormData = new FormData()
    signInFormData.append('email', TEST_EMAIL)
    signInFormData.append('password', NEW_PASSWORD)

    const signInResult = await signInWithCredentials(null, signInFormData)

    expect(signInResult.success).toBe(true)
    expect(signInResult.requiresTwoFactor).toBe(true)
    expect(signInResult.email).toBe(TEST_EMAIL)
    expect(signInResult.message).toContain('Verification code sent')
    console.log('✅ Sign-in successful, 2FA code sent')

    // ============================================================
    // STEP 4: User Retrieves and Verifies 2FA Code
    // ============================================================
    console.log('📱 Step 4: Retrieving 2FA code...')

    const userWithCode = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
      select: {
        id: true,
        twoFactorCode: true,
        twoFactorExpiry: true,
        authenticators: true,
      },
    })

    expect(userWithCode?.twoFactorCode).toBeDefined()
    expect(userWithCode?.twoFactorCode).toMatch(/^\d{6}$/)
    expect(userWithCode?.twoFactorExpiry).toBeDefined()
    expect(userWithCode!.twoFactorExpiry!.getTime()).toBeGreaterThan(Date.now())

    const twoFactorCode = userWithCode!.twoFactorCode!
    console.log('✅ 2FA code retrieved:', twoFactorCode)

    // ============================================================
    // STEP 5: User Verifies 2FA Code
    // ============================================================
    console.log('✔️  Step 5: Verifying 2FA code...')

    const verifyFormData = new FormData()
    verifyFormData.append('email', TEST_EMAIL)
    verifyFormData.append('code', twoFactorCode)

    // User has no passkey, so should be redirected to setup-passkey
    try {
      await verifyTwoFactorCode(null, verifyFormData)
      expect.fail('Expected redirect to /setup-passkey but none occurred')
    } catch (error) {
      const err = error as Error & { digest?: string }
      expect(err.message).toBe('NEXT_REDIRECT')
      expect(err.digest).toContain('/setup-passkey')
      console.log('✅ User redirected to passkey setup (no passkey)')
    }

    // Verify 2FA code was cleared and twoFactorVerifiedAt was set
    const userAfter2FA = await prisma.user.findUnique({
      where: { id: testUserId },
      select: {
        twoFactorCode: true,
        twoFactorExpiry: true,
        twoFactorVerifiedAt: true,
      },
    })

    expect(userAfter2FA?.twoFactorCode).toBeNull()
    expect(userAfter2FA?.twoFactorExpiry).toBeNull()
    expect(userAfter2FA?.twoFactorVerifiedAt).toBeDefined()

    // Verify timestamp is recent (within 1 minute for 2FA bypass)
    const verifiedRecently =
      new Date().getTime() - userAfter2FA!.twoFactorVerifiedAt!.getTime() < 60000

    expect(verifiedRecently).toBe(true)
    console.log('✅ 2FA code verified, user authenticated')

    console.log('🎉 Complete password reset with 2FA flow successful!')
  }, 60000) // 60 second timeout

  it('should complete flow for user with existing passkey', async () => {
    console.log('🔒 Testing password reset flow with existing passkey...')

    // Create a user with a passkey
    const userWithPasskey = await prisma.user.create({
      data: {
        name: 'User With Passkey',
        email: `passkey-${TEST_EMAIL}`,
        password: hashSync(OLD_PASSWORD, 10),
        role: 'INVESTOR',
      },
    })

    // Create a passkey for this user
    const uniqueCredId = `test-cred-id-with-passkey-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const authenticator = await prisma.authenticator.create({
      data: {
        userId: userWithPasskey.id,
        credentialID: uniqueCredId,
        providerAccountId: uniqueCredId,
        credentialPublicKey: 'test-public-key',
        counter: BigInt(0),
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
      },
    })

    // Request password reset
    const resetFormData = new FormData()
    resetFormData.append('email', `passkey-${TEST_EMAIL}`)
    await resetPassword(null, resetFormData)

    // Get reset token
    const user = await prisma.user.findUnique({
      where: { email: `passkey-${TEST_EMAIL}` },
      select: { resetToken: true },
    })

    // Update password
    const updateFormData = new FormData()
    updateFormData.append('password', NEW_PASSWORD)
    updateFormData.append('confirmPassword', NEW_PASSWORD)
    await updatePassword(user!.resetToken!, updateFormData)

    // Sign in with new password
    const signInFormData = new FormData()
    signInFormData.append('email', `passkey-${TEST_EMAIL}`)
    signInFormData.append('password', NEW_PASSWORD)
    await signInWithCredentials(null, signInFormData)

    // Get 2FA code
    const userWithCode = await prisma.user.findUnique({
      where: { email: `passkey-${TEST_EMAIL}` },
      select: { twoFactorCode: true },
    })

    // Verify 2FA - should redirect to verify-passkey (not setup)
    const verifyFormData = new FormData()
    verifyFormData.append('email', `passkey-${TEST_EMAIL}`)
    verifyFormData.append('code', userWithCode!.twoFactorCode!)

    try {
      await verifyTwoFactorCode(null, verifyFormData)
      expect.fail('Expected redirect to /verify-passkey but none occurred')
    } catch (error) {
      const err = error as Error & { digest?: string }
      expect(err.message).toBe('NEXT_REDIRECT')
      expect(err.digest).toContain('/verify-passkey')
      console.log('✅ User with passkey redirected to verify-passkey')
    }

    // Cleanup
    await prisma.authenticator.delete({ where: { id: authenticator.id } })
    await prisma.user.delete({ where: { id: userWithPasskey.id } })

    console.log('✅ Password reset flow with passkey verified')
  }, 30000)

  it('should reject sign-in with old password after reset', async () => {
    console.log('🚫 Testing rejection of old password...')

    // Try to sign in with old password (should fail)
    const signInFormData = new FormData()
    signInFormData.append('email', TEST_EMAIL)
    signInFormData.append('password', OLD_PASSWORD)

    const result = await signInWithCredentials(null, signInFormData)

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid')
    console.log('✅ Old password correctly rejected')
  }, 15000)

  it('should accept sign-in with new password', async () => {
    console.log('✅ Testing sign-in with new password...')

    const signInFormData = new FormData()
    signInFormData.append('email', TEST_EMAIL)
    signInFormData.append('password', NEW_PASSWORD)

    const result = await signInWithCredentials(null, signInFormData)

    expect(result.success).toBe(true)
    expect(result.requiresTwoFactor).toBe(true)
    console.log('✅ New password accepted')
  }, 15000)
})

describe('E2E Test Configuration', () => {
  it('should have required environment variables', () => {
    expect(process.env.DATABASE_URL).toBeDefined()

    if (!process.env.DATABASE_URL) {
      console.warn(`
⚠️  E2E password reset tests require:
  - DATABASE_URL (PostgreSQL connection)
      `)
    }
  })
})
