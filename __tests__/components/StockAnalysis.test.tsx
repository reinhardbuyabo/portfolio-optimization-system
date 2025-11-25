
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StockAnalysisPage from "@/app/(dashboard)/stock-analysis/page";
import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock the toast functions
vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("StockAnalysisPage", () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      if (url.includes('/api/stocks/available')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { "Telecommunication": [{ code: 'SCOM', name: 'Safaricom Plc', sector: 'Telecommunication' }] } }),
        } as Response);
      }
      if (url.includes('/api/stocks/historical')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            prices: Array.from({ length: 60 }, (_, i) => ({
              date: `2024-10-${i + 1}`,
              price: 16.5 + i * 0.01,
            })),
            latestPrice: 17.09,
          }),
        } as Response);
      }
      if (url.includes('/api/ml/v4/predict')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            prediction: 18.5,
            mape: 2.5,
            model_version: "v4_log_stock_specific",
            execution_time: 0.1,
            horizon: 10,
          }),
        } as Response);
      }
      if (url.includes('/api/ml/garch/predict')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            volatility_annualized: 0.25,
            forecasted_variance: 0.0001,
          }),
        } as Response);
      }
      if (url.includes('/api/portfolios')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]), // Mock an empty array of portfolios
        } as Response);
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the page title", async () => {
    render(<StockAnalysisPage />);
    await waitFor(() => {
        expect(screen.getByText("Stock Analysis: LSTM & GARCH Models")).toBeInTheDocument();
    })
  });

  it("runs a single stock prediction and displays the result", async () => {
    render(<StockAnalysisPage />);

    // Wait for the stock to be selected
    await waitFor(() => {
      expect(screen.getByDisplayValue("SCOM - Safaricom Plc (Telecommunication)")).toBeInTheDocument();
    });

    // Click the run button
    fireEvent.click(screen.getByText("Run LSTM"));

    // Wait for the prediction to be displayed
    await waitFor(() => {
      expect(screen.getByText("Predicted Price (1D)")).toBeInTheDocument();
      expect(screen.getByText("Ksh 18.50")).toBeInTheDocument();
    });
  });

  it("runs a garch prediction and displays the result", async () => {
    render(<StockAnalysisPage />);

    // Wait for the stock to be selected
    await waitFor(() => {
      expect(screen.getByDisplayValue("SCOM - Safaricom Plc (Telecommunication)")).toBeInTheDocument();
    });

    // Click GARCH tab
    fireEvent.click(screen.getByText("GARCH Volatility Analysis"));
    
    // Click the run button
    const runButtons = screen.getAllByText("Run GARCH");
    fireEvent.click(runButtons[0]);

    // Wait for the prediction to be displayed
    await waitFor(() => {
      expect(screen.getByText("Annualized Volatility")).toBeInTheDocument();
      expect(screen.getByText("25.00%")).toBeInTheDocument();
    });
  });
});
