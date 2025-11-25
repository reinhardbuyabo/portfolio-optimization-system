# Portfolio Optimization System

A comprehensive portfolio optimization and management system built with Next.js 15, featuring advanced authentication, role-based access control, and ML-driven portfolio analysis tools.

## Features

### Authentication & Security
- **Google OAuth** for quick and secure sign-in
- **Two-Factor Authentication (2FA)** via email with time-limited codes
- **Password Reset** with secure token-based flow
- **Role-Based Access Control** (Admin, Portfolio Manager, Investor, Analyst)
- **NextAuth v5** with database session strategy and session management
- **Secure password hashing** with bcrypt

### Portfolio Management & Analysis
- Multi-user portfolio creation and management
- Asset allocation tracking
- **LSTM-based price forecasting** with confidence intervals
- **GARCH volatility forecasting** to model risk
- Portfolio optimization to maximize Sharpe ratio
- Historical performance simulation and backtesting
- Risk tolerance profiling (Low, Medium, High)
- **ARIMA vs. LSTM** model performance benchmarks

### User Profiles
- Investor profiles with budget and constraints
- Customizable investment preferences
- Portfolio status tracking (Draft, Active, Archived)

### Technology Stack
- **Frontend:** Next.js 15, React 19, TailwindCSS 4
- **Backend:** Next.js Server Actions, Prisma ORM
- **Database:** PostgreSQL with UUID primary keys
- **Authentication:** NextAuth v5 with Credentials provider
- **Email:** Resend API for transactional emails
- **Validation:** Zod schemas
- **Testing:** Vitest, Playwright (for E2E)
- **UI Components:** Radix UI, shadcn/ui patterns, Recharts

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL database
- Resend account (for email functionality)
- Python environment for the ML service (see [ML Quick Start](#machine-learning-integration))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd portfolio-optimization-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `AUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `RESEND_API_KEY`: Your Resend API key from https://resend.com
   - `NEXT_PUBLIC_APP_URL`: Your application URL (default: http://localhost:3000)
   - `GOOGLE_CLIENT_ID`: Your Google OAuth client ID (optional, for Google sign-in)
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret (optional, for Google sign-in)

4. **Set up the database**
   ```bash
   # Run Prisma migrations
   npx prisma migrate dev

   # (Optional) Seed with sample data
   npx prisma db seed
   ```

5. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

6. **Start the ML Service**
   See the [ML Quick Start](#machine-learning-integration) section below.

7. **Start the development server**
   ```bash
   npm run dev
   ```

8. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
npx prisma migrate dev      # Create and apply migrations
npx prisma migrate deploy   # Apply migrations (production)
npx prisma studio           # Open Prisma Studio GUI
npx prisma db seed          # Seed database
npx prisma generate         # Generate Prisma Client
```

### Testing
```bash
npm test                # Run all tests in watch mode
npm run test:unit       # Run unit tests only
npm run test:e2e        # Run end-to-end tests
npm run test:run        # Run tests once and exit
```
**Note:** The test suite is currently undergoing improvements to fix build errors and enhance UI component testing with libraries like `recharts`.

## Machine Learning Integration

This system includes advanced time-series forecasting models for stock price prediction and risk analysis.

### V4 LSTM Price Forecasting
- **5 stock-specific models** with 2-9% MAPE (SCOM, EQTY, KCB, BAMB, EABL)
- **50+ stocks** covered by a general model (~4.5% MAPE)
- Multiple prediction horizons: 1d, 5d, 10d, 30d
- LRU caching for fast predictions (<30ms cached)

### GARCH Volatility Forecasting
- Models volatility and risk for individual assets.
- Used in conjunction with LSTM predictions to provide a more complete financial picture.

### Benchmarks
- The repository includes scripts to benchmark the performance of LSTM models against classical ARIMA models.
- The latest comparison results can be found in `ml/trained_models/arima_vs_lstm_comparison.csv`.

### Quick Start (ML Service)
The ML models are served via a separate Python service.
```bash
# Navigate to the ml directory
cd ml

# Install dependencies and start the service
tox -e serve-dev

# To run benchmarks
python3 scripts/walk_forward_validation_v4.py --all
python3 scripts/arima_benchmark.py
```

See the [V4 Integration Guide](docs/v4-integration/README.md) for detailed ML setup and usage.

## Project Structure

```
portfolio-optimization-system/
├── app/
│   ├── (auth)/              # Authentication pages
│   ├── (dashboard)/         # Main application pages
│   └── api/                 # API routes
├── components/
│   ├── ui/                  # Reusable UI components
│   └── shared/              # Shared application components
├── lib/
│   └── actions/             # Server Actions
├── prisma/
│   └── schema.prisma        # Database schema
├── db/
│   ├── prisma.ts            # Prisma client
│   └── seed.ts              # Database seeding script
├── ml/
│   ├── scripts/             # Scripts for training, validation, and benchmarks
│   ├── trained_models/      # Saved model files
│   └── api/                 # FastAPI service code
├── __tests__/               # Test files
└── auth.ts                  # NextAuth configuration
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linter: `npm test` and `npm run lint`
4. Ensure the project builds: `npm run build`
5. Create a pull request

## License

This project is part of an academic assignment.

