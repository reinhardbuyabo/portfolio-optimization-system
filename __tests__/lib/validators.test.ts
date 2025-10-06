import { describe, it, expect } from 'vitest'
import { signInFormSchema, verify2FASchema } from '@/lib/validators'

describe('2FA Validators', () => {
  describe('signInFormSchema', () => {
    it('should validate correct email and password', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      }

      const result = signInFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      }

      const result = signInFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject password less than 6 characters', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '12345',
      }

      const result = signInFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject missing email', () => {
      const invalidData = {
        password: 'password123',
      }

      const result = signInFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject missing password', () => {
      const invalidData = {
        email: 'test@example.com',
      }

      const result = signInFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('verify2FASchema', () => {
    it('should validate correct email and 6-digit code', () => {
      const validData = {
        email: 'test@example.com',
        code: '123456',
      }

      const result = verify2FASchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject code with less than 6 digits', () => {
      const invalidData = {
        email: 'test@example.com',
        code: '12345',
      }

      const result = verify2FASchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject code with more than 6 digits', () => {
      const invalidData = {
        email: 'test@example.com',
        code: '1234567',
      }

      const result = verify2FASchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject code with non-numeric characters', () => {
      const invalidData = {
        email: 'test@example.com',
        code: '12345a',
      }

      const result = verify2FASchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        code: '123456',
      }

      const result = verify2FASchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject missing email', () => {
      const invalidData = {
        code: '123456',
      }

      const result = verify2FASchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject missing code', () => {
      const invalidData = {
        email: 'test@example.com',
      }

      const result = verify2FASchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
