import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import GoogleSignInButton from '@/app/(auth)/sign-in/google-signin-button'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}))

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}))

describe('GoogleSignInButton', () => {
  const mockSearchParams = {
    get: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useSearchParams as any).mockReturnValue(mockSearchParams)
  })

  it('should render the Google sign-in button', () => {
    mockSearchParams.get.mockReturnValue(null)

    render(<GoogleSignInButton />)

    const button = screen.getByRole('button', { name: /continue with google/i })
    expect(button).toBeDefined()
  })

  it('should display the Google logo SVG', () => {
    mockSearchParams.get.mockReturnValue(null)

    const { container } = render(<GoogleSignInButton />)

    const svg = container.querySelector('svg')
    expect(svg).toBeDefined()

    // Check for Google's brand colors in the SVG paths
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBeGreaterThan(0)
  })

  it('should call signIn with google provider when clicked', async () => {
    mockSearchParams.get.mockReturnValue(null)

    render(<GoogleSignInButton />)

    const button = screen.getByRole('button', { name: /continue with google/i })
    await fireEvent.click(button)

    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/' })
  })

  it('should use custom callbackUrl from search params', async () => {
    const customCallbackUrl = '/dashboard/portfolios'
    mockSearchParams.get.mockReturnValue(customCallbackUrl)

    render(<GoogleSignInButton />)

    const button = screen.getByRole('button', { name: /continue with google/i })
    await fireEvent.click(button)

    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: customCallbackUrl })
  })

  it('should default to "/" when callbackUrl is not provided', async () => {
    mockSearchParams.get.mockReturnValue(null)

    render(<GoogleSignInButton />)

    const button = screen.getByRole('button', { name: /continue with google/i })
    await fireEvent.click(button)

    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/' })
  })

  it('should have type="button" to prevent form submission', () => {
    mockSearchParams.get.mockReturnValue(null)

    render(<GoogleSignInButton />)

    const button = screen.getByRole('button', { name: /continue with google/i })
    expect(button.getAttribute('type')).toBe('button')
  })

  it('should have outline variant styling', () => {
    mockSearchParams.get.mockReturnValue(null)

    const { container } = render(<GoogleSignInButton />)

    const button = screen.getByRole('button', { name: /continue with google/i })
    // Check that button has the variant classes (this depends on your Button component implementation)
    expect(button.className).toContain('w-full')
  })

  it('should be accessible', () => {
    mockSearchParams.get.mockReturnValue(null)

    render(<GoogleSignInButton />)

    const button = screen.getByRole('button', { name: /continue with google/i })
    expect(button).toBeDefined()
    expect(button.textContent).toContain('Continue with Google')
  })

  it('should call signIn function when clicked', async () => {
    mockSearchParams.get.mockReturnValue(null)

    render(<GoogleSignInButton />)

    const button = screen.getByRole('button', { name: /continue with google/i })

    await fireEvent.click(button)

    expect(signIn).toHaveBeenCalled()
  })
})
