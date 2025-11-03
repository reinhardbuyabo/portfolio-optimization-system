import { describe, it, expect, vi } from 'vitest';
import { createPortfolio } from '@/lib/actions/portfolios.actions';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));
vi.mock('@/db/prisma', () => ({
  prisma: {
    portfolio: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('createPortfolio', () => {
  it('should create a portfolio successfully', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: '1', role: 'INVESTOR' },
    } as any);

    const formData = new FormData();
    formData.append('name', 'My Portfolio');
    formData.append('riskTolerance', 'MEDIUM');
    formData.append('targetReturn', '8');

    const state = { message: '', success: false };
    const result = await createPortfolio(state, formData);

    expect(prisma.portfolio.create).toHaveBeenCalledWith({
      data: {
        userId: '1',
        name: 'My Portfolio',
        riskTolerance: 'MEDIUM',
        targetReturn: 8,
      },
    });
    expect(result.message).toBe('Portfolio created successfully.');
  });

  it('should return an error if the user is not logged in', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const formData = new FormData();
    formData.append('name', 'My Portfolio');
    formData.append('riskTolerance', 'MEDIUM');
    formData.append('targetReturn', '8');

    const state = { message: '', success: false };
    const result = await createPortfolio(state, formData);

    expect(result.message).toBe('Unauthorized: You must be logged in to create a portfolio.');
  });

  it('should return an error if the user is not an INVESTOR or PORTFOLIO_MANAGER', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: '1', role: 'ANALYST' },
    } as any);

    const formData = new FormData();
    formData.append('name', 'My Portfolio');
    formData.append('riskTolerance', 'MEDIUM');
    formData.append('targetReturn', '8');

    const state = { message: '', success: false };
    const result = await createPortfolio(state, formData);

    expect(result.message).toBe('Forbidden: You do not have permission to create a portfolio.');
  });

  it('should return an error if the form data is invalid', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: '1', role: 'INVESTOR' },
    } as any);

    const formData = new FormData();
    formData.append('name', 'a');
    formData.append('riskTolerance', 'INVALID');
    const state = { message: '', success: false };
    const result = await createPortfolio(state, formData);

    expect(result.message).toBe('Portfolio name must be at least 3 characters. Invalid option: expected one of "LOW"|"MEDIUM"|"HIGH". Invalid input: expected number, received NaN');
    expect(result.issues).toBeUndefined();
  });

  it('should return an error if a portfolio with the same name already exists', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: '1', role: 'INVESTOR' },
    } as any);

    vi.mocked(prisma.portfolio.findFirst).mockResolvedValueOnce({} as any);

    const formData = new FormData();
    formData.append('name', 'My Portfolio');
    formData.append('riskTolerance', 'MEDIUM');
    formData.append('targetReturn', '8');

    const state = { message: '', success: false };
    const result = await createPortfolio(state, formData);

    expect(result.message).toBe('A portfolio with this name already exists.');
  });
});
