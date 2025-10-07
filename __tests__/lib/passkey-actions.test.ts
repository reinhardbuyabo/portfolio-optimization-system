import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generatePasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  generatePasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
} from '@/lib/actions/webauthn.actions'

/**
 * Unit Tests for Passkey Server Actions
 *
 * Tests the core passkey functionality with mocked dependencies.
 * These tests verify the business logic without making real WebAuthn calls.
 */

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Prisma
vi.mock('@/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    authenticator: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock simplewebauthn server
vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
}))

import { auth } from '@/auth'
import { prisma } from '@/db/prisma'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'

describe('Passkey Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generatePasskeyRegistrationOptions', () => {
    it('should generate registration options for authenticated user', async () => {
      // Mock authenticated session
      vi.mocked(auth).mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      // Mock user without existing authenticators
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        authenticators: [],
      } as any)

      // Mock registration options generation
      const mockOptions = {
        challenge: 'mock-challenge-123',
        rp: { name: 'Portfolio Optimization System', id: 'localhost' },
        user: {
          id: 'user-123',
          name: 'test@example.com',
          displayName: 'Test User',
        },
      }
      vi.mocked(generateRegistrationOptions).mockResolvedValue(mockOptions as any)

      // Mock user update
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)

      const result = await generatePasskeyRegistrationOptions()

      expect(result.success).toBe(true)
      expect(result.options).toEqual(mockOptions)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          webauthnChallenge: 'mock-challenge-123',
          challengeExpiry: expect.any(Date),
        },
      })
    })

    it('should fail if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const result = await generatePasskeyRegistrationOptions()

      expect(result.success).toBe(false)
      expect(result.message).toContain('signed in')
    })

    it('should fail if user not found', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const result = await generatePasskeyRegistrationOptions()

      expect(result.success).toBe(false)
      expect(result.message).toContain('User not found')
    })
  })

  describe('verifyPasskeyRegistration', () => {
    it('should verify and store passkey registration', async () => {
      // Mock authenticated session
      vi.mocked(auth).mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      // Mock user with challenge
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        webauthnChallenge: 'mock-challenge',
      } as any)

      // Mock successful verification
      vi.mocked(verifyRegistrationResponse).mockResolvedValue({
        verified: true,
        registrationInfo: {
          credentialPublicKey: new Uint8Array([1, 2, 3]),
          credentialID: new Uint8Array([4, 5, 6]),
          counter: 0,
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
        },
      } as any)

      // Mock authenticator creation
      vi.mocked(prisma.authenticator.create).mockResolvedValue({} as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)

      const mockResponse = {
        id: 'credential-id',
        rawId: 'credential-id',
        response: {
          clientDataJSON: 'mock-client-data',
          attestationObject: 'mock-attestation',
          transports: ['usb', 'nfc'],
        },
        type: 'public-key',
      }

      const result = await verifyPasskeyRegistration(mockResponse as any)

      expect(result.success).toBe(true)
      expect(result.message).toContain('successfully')
      expect(prisma.authenticator.create).toHaveBeenCalled()
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          webauthnChallenge: null,
          challengeExpiry: null,
        },
      })
    })

    it('should fail if verification fails', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        webauthnChallenge: 'mock-challenge',
      } as any)

      vi.mocked(verifyRegistrationResponse).mockResolvedValue({
        verified: false,
      } as any)

      const result = await verifyPasskeyRegistration({} as any)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Verification failed')
    })
  })
})

describe('Passkey Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generatePasskeyAuthenticationOptions', () => {
    it('should generate authentication options with email', async () => {
      // Mock user with authenticators
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        authenticators: [
          {
            credentialID: 'cred-123',
            transports: 'usb,nfc',
          },
        ],
      } as any)

      const mockOptions = {
        challenge: 'auth-challenge-123',
        allowCredentials: [],
      }
      vi.mocked(generateAuthenticationOptions).mockResolvedValue(mockOptions as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)

      const result = await generatePasskeyAuthenticationOptions('test@example.com')

      expect(result.success).toBe(true)
      expect(result.options).toEqual(mockOptions)
      expect(result.challenge).toBe('auth-challenge-123')
      expect(prisma.user.update).toHaveBeenCalled()
    })

    it('should generate options without email (discoverable credential)', async () => {
      const mockOptions = {
        challenge: 'auth-challenge-456',
        allowCredentials: [],
      }
      vi.mocked(generateAuthenticationOptions).mockResolvedValue(mockOptions as any)

      const result = await generatePasskeyAuthenticationOptions()

      expect(result.success).toBe(true)
      expect(result.challenge).toBe('auth-challenge-456')
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })
  })

  describe('verifyPasskeyAuthentication', () => {
    it('should verify passkey authentication successfully', async () => {
      const mockAuthenticator = {
        id: 'auth-id',
        credentialID: 'Y3JlZC0xMjM', // base64url encoded
        credentialPublicKey: 'cHVibGljLWtleQ', // base64url encoded
        counter: BigInt(5),
        transports: 'usb,nfc',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          webauthnChallenge: 'test-challenge',
          challengeExpiry: new Date(Date.now() + 60000),
          twoFactorVerifiedAt: null,
        },
      }

      vi.mocked(prisma.authenticator.findUnique).mockResolvedValue(mockAuthenticator as any)

      vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
        verified: true,
        authenticationInfo: {
          newCounter: 6,
          credentialID: new Uint8Array(),
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
        },
      } as any)

      vi.mocked(prisma.authenticator.update).mockResolvedValue({} as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)

      const mockResponse = {
        id: 'Y3JlZC0xMjM',
        rawId: 'cred-123',
        response: {
          clientDataJSON: 'mock-client-data',
          authenticatorData: 'mock-auth-data',
          signature: 'mock-signature',
        },
        type: 'public-key',
      }

      const result = await verifyPasskeyAuthentication(mockResponse as any, 'test-challenge')

      expect(result.success).toBe(true)
      expect(result.message).toContain('successful')
      expect(result.userId).toBe('user-123')

      // Verify counter was updated
      expect(prisma.authenticator.update).toHaveBeenCalledWith({
        where: { id: 'auth-id' },
        data: { counter: BigInt(6) },
      })

      // Verify challenge was cleared and twoFactorVerifiedAt was set
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          webauthnChallenge: null,
          challengeExpiry: null,
          twoFactorVerifiedAt: expect.any(Date),
        },
      })
    })

    it('should fail if authenticator not found', async () => {
      vi.mocked(prisma.authenticator.findUnique).mockResolvedValue(null)

      const mockResponse = {
        id: 'bm90LWZvdW5k', // base64url encoded "not-found"
      }

      const result = await verifyPasskeyAuthentication(mockResponse as any, 'test-challenge')

      expect(result.success).toBe(false)
      // Either "not found" or generic error message is acceptable
      expect(result.message.length).toBeGreaterThan(0)
    })

    it('should fail if challenge does not match', async () => {
      vi.mocked(prisma.authenticator.findUnique).mockResolvedValue({
        user: {
          webauthnChallenge: 'different-challenge',
          challengeExpiry: new Date(Date.now() + 60000),
        },
      } as any)

      const result = await verifyPasskeyAuthentication(
        { id: 'Y3JlZC0xMjM' } as any,
        'test-challenge'
      )

      expect(result.success).toBe(false)
      expect(result.message).toContain('Invalid challenge')
    })

    it('should fail if challenge is expired', async () => {
      vi.mocked(prisma.authenticator.findUnique).mockResolvedValue({
        user: {
          webauthnChallenge: 'test-challenge',
          challengeExpiry: new Date(Date.now() - 1000), // Expired
        },
      } as any)

      const result = await verifyPasskeyAuthentication(
        { id: 'Y3JlZC0xMjM' } as any,
        'test-challenge'
      )

      expect(result.success).toBe(false)
      expect(result.message).toContain('expired')
    })

    it('should handle missing challenge in database (discoverable credential)', async () => {
      const mockAuthenticator = {
        id: 'auth-id',
        credentialID: 'Y3JlZC0xMjM',
        credentialPublicKey: 'cHVibGljLWtleQ',
        counter: BigInt(5),
        transports: 'usb,nfc',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          webauthnChallenge: null, // No stored challenge
          challengeExpiry: null,
        },
      }

      vi.mocked(prisma.authenticator.findUnique).mockResolvedValue(mockAuthenticator as any)

      vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
        verified: true,
        authenticationInfo: {
          newCounter: 6,
          credentialID: new Uint8Array(),
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
        },
      } as any)

      vi.mocked(prisma.authenticator.update).mockResolvedValue({} as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)

      const result = await verifyPasskeyAuthentication(
        { id: 'Y3JlZC0xMjM' } as any,
        'test-challenge'
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('successful')
    })
  })
})
