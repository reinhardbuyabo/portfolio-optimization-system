import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CreatePortfolioPage from '@/app/(root)/dashboard/portfolios/create/page';
import { useActionState } from 'react'; // Corrected import
import { PortfolioFormState } from '@/lib/actions/portfolios.actions';

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useActionState: vi.fn<[], [PortfolioFormState, Function, boolean]>(),
  };
});

vi.mock('@/lib/actions/portfolios.actions', () => ({
  createPortfolio: vi.fn(),
}));

describe('CreatePortfolioPage', () => {
  it('should render the form correctly', () => {
    vi.mocked(useActionState).mockReturnValue([ { message: '', success: false }, vi.fn(), false ]);
    render(<CreatePortfolioPage />);

    expect(screen.getByLabelText('Portfolio Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Low')).toBeInTheDocument();
    expect(screen.getByLabelText('Medium')).toBeInTheDocument();
    expect(screen.getByLabelText('High')).toBeInTheDocument();
    expect(screen.getByLabelText('Target Return (%)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Portfolio' })).toBeInTheDocument();
  });

  it('should submit the form with the correct data', () => {
    const formAction = vi.fn();
    vi.mocked(useActionState).mockReturnValue([ { message: '', success: false }, formAction, false ]);
    render(<CreatePortfolioPage />);

    fireEvent.change(screen.getByLabelText('Portfolio Name'), { target: { value: 'My Test Portfolio' } });
    fireEvent.click(screen.getByLabelText('High'));
    fireEvent.change(screen.getByLabelText('Target Return (%)'), { target: { value: '12' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Portfolio' }));

    expect(formAction).toHaveBeenCalled();
  });

  it('should display a success message when the form is submitted successfully', async () => {
    vi.mocked(useActionState).mockReturnValue([ { message: 'Portfolio created successfully.', success: true }, vi.fn(), false ]);

    render(<CreatePortfolioPage />);

    expect(await screen.findByText('Portfolio created successfully.')).toBeInTheDocument();
  });

  it('should display an error message when the form submission fails', async () => {
    vi.mocked(useActionState).mockReturnValue([ { message: 'An unexpected error occurred.', issues: [], success: false }, vi.fn(), false ]);

    render(<CreatePortfolioPage />);

    expect(await screen.findByText('An unexpected error occurred.')).toBeInTheDocument();
  });
});
