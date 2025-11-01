import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CreatePortfolioPage from '@/app/(root)/dashboard/portfolios/create/page';
import { useFormState } from 'react-dom';

vi.mock('react-dom', () => ({
  useFormState: vi.fn(),
}));

vi.mock('@/lib/actions/portfolios.actions', () => ({
  createPortfolio: vi.fn(),
}));

describe('CreatePortfolioPage', () => {
  it('should render the form correctly', () => {
    vi.mocked(useFormState).mockReturnValue([ { message: '' }, vi.fn() ]);
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
    vi.mocked(useFormState).mockReturnValue([ { message: '' }, formAction ]);
    render(<CreatePortfolioPage />);

    fireEvent.change(screen.getByLabelText('Portfolio Name'), { target: { value: 'My Test Portfolio' } });
    fireEvent.click(screen.getByLabelText('High'));
    fireEvent.change(screen.getByLabelText('Target Return (%)'), { target: { value: '12' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Portfolio' }));

    expect(formAction).toHaveBeenCalled();
  });

  it('should display a success message when the form is submitted successfully', async () => {
    vi.mocked(useFormState).mockReturnValue([ { message: 'Portfolio created successfully.' }, vi.fn() ]);

    render(<CreatePortfolioPage />);

    expect(await screen.findByText('Portfolio created successfully.')).toBeInTheDocument();
  });

  it('should display an error message when the form submission fails', async () => {
    vi.mocked(useFormState).mockReturnValue([ { message: 'An unexpected error occurred.', issues: [] }, vi.fn() ]);

    render(<CreatePortfolioPage />);

    expect(await screen.findByText('An unexpected error occurred.')).toBeInTheDocument();
  });
});
