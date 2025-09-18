import type { User, Portfolio, Asset, InvestorProfile } from "@prisma/client";
import type { SignInFormValues } from "@/lib/validators";

/**
 * App-wide type definitions
 */

// ---------- Auth ----------
export type { SignInFormValues };

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
