# Portfolio Optimization System

A comprehensive portfolio optimization and management system built with Next.js 15, featuring advanced authentication, role-based access control, and portfolio analysis tools.

## Features

### Authentication & Security
- **Two-Factor Authentication (2FA)** via email with time-limited codes
- **Password Reset** with secure token-based flow
- **Role-Based Access Control** (Admin, Portfolio Manager, Investor, Analyst)
- **NextAuth v5** with JWT strategy and session management
- **Secure password hashing** with bcrypt

### Portfolio Management
- Multi-user portfolio creation and management
- Asset allocation tracking
- Portfolio optimization results (Sharpe ratio, Sortino ratio, max drawdown)
- Historical performance simulation
- Risk tolerance profiling (Low, Medium, High)

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
- **Testing:** Vitest with unit and integration tests
- **UI Components:** Radix UI, shadcn/ui patterns

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL database
- Resend account (for email functionality)

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

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
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
npm run test:integration # Run integration tests (requires RESEND_API_KEY)
npm run test:ui         # Run tests with UI
npm run test:run        # Run tests once and exit
```

See `__tests__/README.md` for detailed testing documentation.

## Project Structure

```
portfolio-optimization-system/
├── app/
│   ├── (auth)/              # Authentication pages (sign-in, sign-up, 2FA, password reset)
│   ├── (root)/              # Main application pages (dashboard, etc.)
│   ├── api/                 # API routes
│   │   └── auth/            # NextAuth API handlers
│   └── layout.tsx           # Root layout
├── components/
│   ├── ui/                  # Reusable UI components (Radix + Tailwind)
│   └── shared/              # Shared application components
├── lib/
│   ├── actions/             # Server Actions
│   │   ├── users.actions.ts
│   │   ├── portfolios.actions.ts
│   │   └── assets.actions.ts
│   ├── validators.ts        # Zod schemas
│   ├── utils.ts             # Utility functions
│   └── constants/           # Application constants
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Database migrations
├── db/
│   ├── prisma.ts            # Prisma client singleton
│   ├── seed.ts              # Database seeding script
│   └── sample-data.ts       # Sample data definitions
├── __tests__/               # Test files
│   ├── lib/                 # Unit tests
│   └── integration/         # Integration tests
├── types/                   # TypeScript type definitions
├── auth.ts                  # NextAuth configuration
└── CLAUDE.md                # AI assistant guidance

```

## Authentication Flow

### Sign Up
1. User provides name, email, and password
2. Password is hashed with bcrypt
3. Account is created in database
4. User is redirected to sign-in page

### Sign In with 2FA
1. User enters email and password
2. Credentials are validated against database
3. 6-digit verification code is generated and sent via email
4. User is redirected to 2FA verification page
5. User enters code (valid for 5 minutes)
6. Upon successful verification, session is created
7. User is redirected to dashboard

### Password Reset
1. User requests password reset with email
2. Secure token is generated and sent via email
3. User clicks link and enters new password
4. Password is updated and user signs in

## Database Schema

### Key Models
- **User**: Authentication, roles, 2FA fields, password reset tokens
- **InvestorProfile**: Budget, risk tolerance, investment preferences
- **Portfolio**: User portfolios with status tracking
- **Asset**: Investment assets with market data
- **MarketData**: OHLCV data with sentiment scores
- **OptimizationResult**: Portfolio performance metrics
- **Simulation**: Backtesting results

See `prisma/schema.prisma` for complete schema.

## Environment Variables

Required variables (see `.env.example`):

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `AUTH_SECRET` | NextAuth secret key | Generate with `openssl rand -base64 32` |
| `RESEND_API_KEY` | Resend API key for emails | `re_...` |
| `NEXT_PUBLIC_APP_URL` | Application base URL | `http://localhost:3000` |
| `TEST_EMAIL` | (Optional) Email for integration tests | `test@example.com` |

## Security Best Practices

- Passwords are hashed with bcrypt (10 rounds)
- 2FA codes are time-limited (5 minutes expiry)
- Password reset tokens expire after 1 hour
- JWT sessions expire after 30 days
- All sensitive operations use Server Actions with validation
- Database uses UUIDs for primary keys
- Email verification prevents unauthorized access

## Testing

The project includes comprehensive tests:

- **Unit Tests**: Fast, isolated tests with mocked dependencies
- **Integration Tests**: Real API calls to Resend for email testing

Run unit tests frequently during development:
```bash
npm run test:unit
```

Run integration tests before deployment (requires valid `RESEND_API_KEY`):
```bash
npm run test:integration
```

See `__tests__/README.md` for detailed testing guide.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm run test:unit`
4. Run linter: `npm run lint`
5. Build the project: `npm run build`
6. Create a pull request

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` in `.env` is correct
- Ensure PostgreSQL is running
- Check database user has proper permissions

### Email Not Sending
- Verify `RESEND_API_KEY` is valid
- Check sender domain is verified in Resend dashboard
- Ensure sender email is `onboarding@resend.dev` or your verified domain

### 2FA Code Issues
- Codes expire after 5 minutes
- Check spam/junk folder for emails
- Verify system clock is accurate
- Use "Resend Code" button if needed

### Build Errors
- Clear `.next` folder: `rm -rf .next`
- Regenerate Prisma Client: `npx prisma generate`
- Clear node_modules: `rm -rf node_modules && npm install`

## License

This project is part of an academic assignment.

## Support

For issues and questions, please create an issue in the repository.
