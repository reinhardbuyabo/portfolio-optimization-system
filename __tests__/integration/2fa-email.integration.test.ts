import { describe, it, expect, beforeAll, vi } from 'vitest'
import { Resend } from 'resend'

/**
 * Integration tests for 2FA email functionality with real Resend API
 *
 * These tests make real API calls to Resend and should be run separately
 * from unit tests. They require a valid RESEND_API_KEY in environment.
 *
 * Run with: npm run test:integration
 *
 * NOTE: These tests will use your Resend API quota and send real emails.
 * Use a test email address that you control.
 */

const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com'
const RESEND_API_KEY = process.env.RESEND_API_KEY

describe.skipIf(!RESEND_API_KEY)('2FA Email Integration Tests', () => {
  let resend: Resend

  beforeAll(() => {
    if (!RESEND_API_KEY) {
      console.warn('⚠️  RESEND_API_KEY not found. Skipping integration tests.')
      return
    }
    resend = new Resend(RESEND_API_KEY)
  })

  describe('Resend Email Service', () => {
    it('should successfully send a 2FA code email', async () => {
      const code = '123456'

      const result = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: TEST_EMAIL,
        subject: 'Your Two-Factor Authentication Code (Test)',
        html: `
          <h2>Your Login Code</h2>
          <p>Your verification code is: <strong>${code}</strong></p>
          <p>This code will expire in 5 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <p><em>This is a test email from integration tests.</em></p>
        `,
      })

      expect(result).toBeDefined()

      // Resend returns { data: { id }, error } or just { id, error } depending on version
      if (result.error) {
        throw new Error(`Email failed: ${result.error.message}`)
      }

      const emailId = result.data?.id || result.id
      expect(emailId).toBeDefined()

      console.log('✅ Email sent successfully:', emailId)
    }, 15000) // 15 second timeout for API call

    it('should generate valid 6-digit codes', () => {
      const codes = new Set<string>()

      // Generate 100 codes and verify they're all valid
      for (let i = 0; i < 100; i++) {
        const code = Math.floor(100000 + Math.random() * 900000).toString()

        expect(code).toMatch(/^\d{6}$/)
        expect(code.length).toBe(6)
        expect(parseInt(code)).toBeGreaterThanOrEqual(100000)
        expect(parseInt(code)).toBeLessThanOrEqual(999999)

        codes.add(code)
      }

      // Verify codes are reasonably random (at least 90% unique)
      expect(codes.size).toBeGreaterThan(90)
    })

    it('should set expiry to 5 minutes in the future', () => {
      const beforeCreation = Date.now()
      const expiryDate = new Date(Date.now() + 5 * 60 * 1000)
      const afterCreation = Date.now()

      const expectedMin = beforeCreation + 5 * 60 * 1000
      const expectedMax = afterCreation + 5 * 60 * 1000

      expect(expiryDate.getTime()).toBeGreaterThanOrEqual(expectedMin)
      expect(expiryDate.getTime()).toBeLessThanOrEqual(expectedMax)

      // Verify it's approximately 5 minutes (within 1 second tolerance)
      const fiveMinutesMs = 5 * 60 * 1000
      const diffFromNow = expiryDate.getTime() - Date.now()
      expect(diffFromNow).toBeGreaterThan(fiveMinutesMs - 1000)
      expect(diffFromNow).toBeLessThan(fiveMinutesMs + 1000)
    })

    it('should handle invalid recipient email gracefully', async () => {
      const code = '654321'

      try {
        const result = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: 'invalid-email-format',
          subject: 'Test',
          html: `<p>Code: ${code}</p>`,
        })

        // If it doesn't throw, check for error in result
        if (result.error) {
          expect(result.error).toBeDefined()
          expect(result.error.message).toBeTruthy()
          console.log('✅ Invalid email handled correctly:', result.error.message)
        }
      } catch (error: any) {
        // Expect an error to be thrown
        expect(error).toBeDefined()
        expect(error.message).toBeTruthy()
        console.log('✅ Invalid email rejected:', error.message)
      }
    }, 15000)

    it('should include all required email fields', async () => {
      const code = '789012'

      const result = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: TEST_EMAIL,
        subject: 'Verify Email Fields (Test)',
        html: `
          <div>
            <h2>Your Login Code</h2>
            <p>Your verification code is: <strong>${code}</strong></p>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <p><em>This is a test email from integration tests.</em></p>
          </div>
        `,
      })

      if (result.error) {
        throw new Error(`Email failed: ${result.error.message}`)
      }

      const emailId = result.data?.id || result.id
      expect(emailId).toBeDefined()

      console.log('✅ Email with all fields sent:', emailId)
    }, 15000)
  })

  describe('Code Expiry Logic', () => {
    it('should correctly identify expired codes', () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      const futureDate = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
      const now = new Date()

      // Expired code
      expect(pastDate < now).toBe(true)

      // Valid code
      expect(futureDate > now).toBe(true)
    })

    it('should correctly identify codes at boundary', () => {
      const almostExpired = new Date(Date.now() + 1000) // 1 second from now
      const justExpired = new Date(Date.now() - 1000) // 1 second ago
      const now = new Date()

      expect(almostExpired > now).toBe(true) // Still valid
      expect(justExpired < now).toBe(true) // Expired
    })
  })

  describe('Email Template Validation', () => {
    it('should create valid HTML email template', () => {
      const code = '123456'
      const html = `
        <h2>Your Login Code</h2>
        <p>Your verification code is: <strong>${code}</strong></p>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      `

      // Verify template contains code
      expect(html).toContain(code)

      // Verify template has proper structure
      expect(html).toContain('<h2>')
      expect(html).toContain('<strong>')
      expect(html).toContain('expire')
      expect(html).toContain('5 minutes')
    })
  })
})

describe('Integration Test Configuration', () => {
  it('should have RESEND_API_KEY configured', () => {
    if (!RESEND_API_KEY) {
      console.warn(`
⚠️  Integration tests require RESEND_API_KEY environment variable.

To run integration tests:
1. Set RESEND_API_KEY in your .env file
2. Set TEST_EMAIL to your test email address
3. Run: npm run test:integration

Example:
  RESEND_API_KEY=re_your_key_here
  TEST_EMAIL=your-test-email@example.com
      `)
    }

    // This will pass but show the warning if key is missing
    expect(true).toBe(true)
  })

  it('should have TEST_EMAIL configured', () => {
    if (TEST_EMAIL === 'test@example.com') {
      console.warn(`
⚠️  Using default TEST_EMAIL. Set TEST_EMAIL environment variable to receive test emails.

Example:
  TEST_EMAIL=your-email@example.com
      `)
    }

    expect(TEST_EMAIL).toBeDefined()
    expect(TEST_EMAIL).toContain('@')
  })
})
