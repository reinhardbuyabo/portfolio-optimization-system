import type { User, Portfolio, Asset, InvestorProfile } from "@prisma/client";

/**
 * App-wide type definitions
 */

// ---------- Auth ----------
// Auth types are inferred from Zod schemas in @/lib/validators

// Example: user session type (extend later when adding auth)
export interface SessionUser {
    id: string;
    name: string;
    email: string;
    role: User["role"];
}

// ---------- Database Models ----------
export type DbUser = User & {
    investorProfile?: InvestorProfile | null;
    portfolios?: Portfolio[];
};

export type DbPortfolio = Portfolio & {
    allocations?: any[]; // can refine later with Prisma include types
    results?: any | null;
};

export type DbAsset = Asset & {
    marketData?: any[]; // refine with Prisma model
};

// ---------- UI ----------
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
