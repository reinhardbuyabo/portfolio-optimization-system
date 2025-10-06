import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { loadEnvConfig } from '@next/env'
import { prisma } from '@/db/prisma'
import { hashSync, compareSync } from 'bcrypt-ts-edge'

// Mock NextAuth before importing actions
vi.mock('@/auth', () => ({
  signIn: vi.fn().mockResolvedValue({ ok: true }),
  signOut: vi.fn(),
  auth: vi.fn(),
}))

// Note: We're using real bcrypt functions, not mocks, for E2E tests
// Import after mocks
import { signInWithCredentials, verifyTwoFactorCode, signUpUser } from '@/lib/actions/users.actions'

// Load environment variables
loadEnvConfig(process.cwd())

const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com'
const TEST_PASSWORD = 'TestPassword123!'

/**
 * End-to-End Test for Complete 2FA Authentication Flow
 *
 * This test simulates a real user journey through the entire authentication process:
 * 1. User signs up with email and password
 * 2. User signs in with credentials
 * 3. System sends 2FA code via email
 * 4. User receives and enters 2FA code
 * 5. System verifies code and completes authentication
 *
 * Requirements:
 * - PostgreSQL database running
 * - Valid RESEND_API_KEY in .env
 * - TEST_EMAIL set to the Resend account owner's email
 *
 * Run with: npm run test:e2e
 */

describe.skipIf(!process.env.RESEND_API_KEY)('E2E: Complete 2FA Authentication Flow', () => {
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
  })

  afterAll(async () => {
    // Clean up test user after tests
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

  it('should complete full authentication flow from sign-up to sign-in with 2FA', async () => {
    // Step 1: Sign Up
    console.log('📝 Step 1: Creating new user account...')

    const signUpFormData = new FormData()
    signUpFormData.append('name', 'Test User')
    signUpFormData.append('email', TEST_EMAIL)
    signUpFormData.append('password', TEST_PASSWORD)
    signUpFormData.append('confirmPassword', TEST_PASSWORD)

    // Create user directly in database (simulating sign-up)
    const createdUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: TEST_EMAIL,
        password: hashSync(TEST_PASSWORD, 10),
        role: 'INVESTOR',
      },
    })

    testUserId = createdUser.id
    expect(createdUser).toBeDefined()
    expect(createdUser.email).toBe(TEST_EMAIL)
    console.log('✅ User created successfully:', createdUser.id)

    // Step 2: Sign In with Credentials (triggers 2FA)
    console.log('🔐 Step 2: Signing in with email and password...')

    const signInFormData = new FormData()
    signInFormData.append('email', TEST_EMAIL)
    signInFormData.append('password', TEST_PASSWORD)

    const signInResult = await signInWithCredentials(null, signInFormData)

    expect(signInResult.success).toBe(true)
    expect(signInResult.requiresTwoFactor).toBe(true)
    expect(signInResult.email).toBe(TEST_EMAIL)
    expect(signInResult.message).toContain('Verification code sent')
    console.log('✅ 2FA code sent to email')

    // Step 3: Retrieve 2FA code from database (simulating user checking email)
    console.log('📧 Step 3: Retrieving 2FA code from database...')

    const userWithCode = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
      select: {
        id: true,
        twoFactorCode: true,
        twoFactorExpiry: true,
      },
    })

    expect(userWithCode).toBeDefined()
    expect(userWithCode?.twoFactorCode).toBeDefined()
    expect(userWithCode?.twoFactorCode).toMatch(/^\d{6}$/)
    expect(userWithCode?.twoFactorExpiry).toBeDefined()
    expect(userWithCode!.twoFactorExpiry!.getTime()).toBeGreaterThan(Date.now())

    const twoFactorCode = userWithCode!.twoFactorCode!
    console.log('✅ 2FA code retrieved:', twoFactorCode)

    // Step 4: Verify 2FA Code
    console.log('✔️  Step 4: Verifying 2FA code...')

    const verifyFormData = new FormData()
    verifyFormData.append('email', TEST_EMAIL)
    verifyFormData.append('code', twoFactorCode)

    const verifyResult = await verifyTwoFactorCode(null, verifyFormData)

    expect(verifyResult.success).toBe(true)
    expect(verifyResult.message).toContain('verified')
    console.log('✅ 2FA code verified successfully')

    // Step 5: Verify 2FA code was cleared from database
    console.log('🧹 Step 5: Verifying cleanup...')

    const userAfterVerify = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
      select: {
        twoFactorCode: true,
        twoFactorExpiry: true,
      },
    })

    expect(userAfterVerify?.twoFactorCode).toBeNull()
    expect(userAfterVerify?.twoFactorExpiry).toBeNull()
    console.log('✅ 2FA code cleared from database')

    console.log('🎉 Complete authentication flow successful!')
  }, 30000) // 30 second timeout for full E2E flow

  it('should reject invalid 2FA code', async () => {
    console.log('🚫 Testing invalid 2FA code rejection...')

    // Create user with 2FA code
    const user = await prisma.user.create({
      data: {
        name: 'Invalid Code Test User',
        email: `invalid-${TEST_EMAIL}`,
        password: hashSync(TEST_PASSWORD, 10),
        twoFactorCode: '123456',
        twoFactorExpiry: new Date(Date.now() + 5 * 60 * 1000),
      },
    })

    const verifyFormData = new FormData()
    verifyFormData.append('email', `invalid-${TEST_EMAIL}`)
    verifyFormData.append('code', '999999') // Wrong code

    const result = await verifyTwoFactorCode(null, verifyFormData)

    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid')
    console.log('✅ Invalid code correctly rejected')

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } })
  }, 15000)

  it('should reject expired 2FA code', async () => {
    console.log('⏰ Testing expired 2FA code rejection...')

    // Create user with expired 2FA code
    const user = await prisma.user.create({
      data: {
        name: 'Expired Code Test User',
        email: `expired-${TEST_EMAIL}`,
        password: hashSync(TEST_PASSWORD, 10),
        twoFactorCode: '123456',
        twoFactorExpiry: new Date(Date.now() - 1000), // Expired 1 second ago
      },
    })

    const verifyFormData = new FormData()
    verifyFormData.append('email', `expired-${TEST_EMAIL}`)
    verifyFormData.append('code', '123456')

    const result = await verifyTwoFactorCode(null, verifyFormData)

    expect(result.success).toBe(false)
    expect(result.message).toContain('expired')
    console.log('✅ Expired code correctly rejected')

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } })
  }, 15000)

  it('should handle code expiry timing correctly', async () => {
    console.log('⏱️  Testing code expiry timing...')

    const signInFormData = new FormData()
    signInFormData.append('email', TEST_EMAIL)
    signInFormData.append('password', TEST_PASSWORD)

    const beforeSignIn = Date.now()
    await signInWithCredentials(null, signInFormData)
    const afterSignIn = Date.now()

    const user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
      select: { twoFactorExpiry: true },
    })

    expect(user?.twoFactorExpiry).toBeDefined()

    const expiryTime = user!.twoFactorExpiry!.getTime()
    const expectedMin = beforeSignIn + 4.9 * 60 * 1000 // 4.9 minutes
    const expectedMax = afterSignIn + 5.1 * 60 * 1000 // 5.1 minutes

    expect(expiryTime).toBeGreaterThan(expectedMin)
    expect(expiryTime).toBeLessThan(expectedMax)
    console.log('✅ Expiry timing is correct (5 minutes)')
  }, 15000)
})

describe('E2E Test Configuration', () => {
  it('should have required environment variables', () => {
    expect(process.env.DATABASE_URL).toBeDefined()
    expect(process.env.RESEND_API_KEY).toBeDefined()
    expect(process.env.TEST_EMAIL).toBeDefined()

    if (!process.env.RESEND_API_KEY) {
      console.warn(`
⚠️  E2E tests require:
  - DATABASE_URL (PostgreSQL connection)
  - RESEND_API_KEY (from resend.com)
  - TEST_EMAIL (must match Resend account owner email)
      `)
    }
  })
})
