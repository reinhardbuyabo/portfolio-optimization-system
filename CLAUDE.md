# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 15 portfolio optimization system with authentication, role-based access control, and two-factor authentication. Built with TypeScript, Prisma (PostgreSQL), NextAuth v5, and TailwindCSS.

## Key Commands

### Development
```bash
npm run dev          # Start development server (Next.js dev)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
npx prisma generate  # Generate Prisma Client (runs automatically after install)
npx prisma migrate dev      # Create and apply migrations in dev
npx prisma migrate deploy   # Apply migrations in production
npx prisma studio           # Open database GUI
npx prisma db seed          # Seed database with sample data
```

## Architecture

### Authentication System
- **NextAuth v5** with database session strategy (30-day sessions)
- **Google OAuth** for quick sign-in (optional, requires credentials)
- Credentials provider with bcrypt password hashing
- Two-factor authentication via email (5-minute expiry codes)
- Password reset flow with time-limited tokens (1-hour expiry)
- Role-based access: ADMIN, PORTFOLIO_MANAGER, INVESTOR, ANALYST
- Auth config: `auth.ts` (main setup), `app/api/auth/[...nextauth]/route.ts` (NextAuth handlers)
- User actions: `lib/actions/users.actions.ts` (sign-in, sign-up, 2FA, password reset)
- Setup guide: See `GOOGLE_OAUTH_SETUP.md` for Google OAuth configuration

### Database Schema (Prisma)
- **Users**: Authentication, roles, 2FA fields, password reset tokens
  - `password` is optional for OAuth users
  - `emailVerified` tracks OAuth email verification
  - `image` stores OAuth profile pictures
- **Account**: OAuth provider accounts (Google, etc.) linked to users
- **Session**: Database-stored sessions for NextAuth
- **InvestorProfile**: Budget, risk tolerance (LOW/MEDIUM/HIGH), constraints/preferences (JSON)
- **Portfolio**: Draft/Active/Archived status, belongs to user
- **Asset**: Ticker-based assets with market data and allocations
- **MarketData**: OHLCV data plus sentiment scores
- **OptimizationResult**: Portfolio metrics (Sharpe, Sortino, max drawdown, etc.)
- **Simulation**: Backtesting with performance metrics (JSON)
- UUIDs generated via `gen_random_uuid()` (PostgreSQL)

### Route Structure
- **App Router** with route groups:
  - `(auth)`: Sign-in, sign-up, password reset (unauthenticated layout)
  - `(root)`: Dashboard and main app pages (authenticated layout)
- Path alias: `@/*` maps to root directory

### Server Actions Pattern
All mutations use Next.js Server Actions (`"use server"`):
- `lib/actions/users.actions.ts`: User management, auth flows, 2FA
- `lib/actions/portfolios.actions.ts`: Portfolio operations
- `lib/actions/assets.actions.ts`: Asset operations
- Return `{ success: boolean, message: string }` structure
- Use Zod schemas from `lib/validators.ts` for validation

### Email Integration
- **Resend** for transactional emails (2FA codes, password reset)
- Sender: `onboarding@resend.dev` (must be verified in Resend dashboard)
- Requires `RESEND_API_KEY` environment variable

## Environment Variables

Required in `.env`:
```
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # For password reset links
RESEND_API_KEY="re_..."
AUTH_SECRET="..."  # Generate with: openssl rand -base64 32

# Optional (for Google OAuth)
GOOGLE_CLIENT_ID="..."  # From Google Cloud Console
GOOGLE_CLIENT_SECRET="..."  # From Google Cloud Console
```

See `GOOGLE_OAUTH_SETUP.md` for detailed setup instructions.

## Important Patterns

### Form Validation
- Zod schemas in `lib/validators.ts` define input rules
- Server actions parse FormData with Zod before processing
- Errors formatted by `lib/utils.ts:formatError()` (handles Zod + Prisma errors)

### NextAuth Customization
- JWT callback sets `role`, `id`, and handles default names
- Session callback exposes `user.id` and `user.role` to client
- Redirect errors must be re-thrown in Server Actions (check with `isRedirectError()`)

### Database Access
- Singleton Prisma client: `db/prisma.ts`
- Sample data: `db/sample-data.ts`
- Seed script: `db/seed.ts`

### Component Organization
- `components/ui/`: Radix UI + TailwindCSS primitives (shadcn-style)
- `components/shared/`: Reusable app components
- `components/footer.tsx`: Global footer
- Styling utility: `lib/utils.ts:cn()` (clsx + tailwind-merge)
