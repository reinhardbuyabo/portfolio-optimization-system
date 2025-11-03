
import React from 'react';
import { render, screen } from '@testing-library/react';
import SyntheticMarketChart from '@/components/shared/synthetic-market-chart';

describe('SyntheticMarketChart', () => {
  it('should render the chart with mock data', () => {
    const mockData = [
      { date: new Date(), close: 100 },
      { date: new Date(), close: 102 },
    ];
    render(<SyntheticMarketChart data={mockData} />);
    const chartElement = screen.getByTestId('synthetic-market-chart');
    expect(chartElement).toBeInTheDocument();
  });
});
