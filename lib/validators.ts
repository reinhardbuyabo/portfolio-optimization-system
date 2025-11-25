import { z } from "zod";

// Schema for initial sign in (credentials only)
export const signInFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Schema for 2FA code verification
export const verify2FASchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "Code must be exactly 6 digits").regex(/^\d+$/, "Code must contain only digits"),
});

// Schema for signing up a user
export const signUpFormSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .min(6, "Confirm password must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Schema for creating a new portfolio
export const createPortfolioSchema = z.object({
  name: z.string().min(3, "Portfolio name must be at least 3 characters"),
  riskTolerance: z.enum(["LOW", "MEDIUM", "HIGH"]),
  targetReturn: z.number().min(0, "Target return must be at least 0").max(100, "Target return must be at most 100"),
});

export const updatePortfolioAllocationsSchema = z.array(z.object({
  assetId: z.string().uuid(),
  weight: z.number().min(0).max(1),
})).refine(allocations => {
  const totalWeight = allocations.reduce((sum, alloc) => sum + alloc.weight, 0);
  return Math.abs(totalWeight - 1) < 0.0001; // Allow for small floating point inaccuracies
}, {
  message: "The sum of all asset weights must be 100%.",
});

// Schema for creating a portfolio with stocks (used in API routes)
export const portfolioSchema = z.object({
  name: z.string().min(3, "Portfolio name must be at least 3 characters"),
  riskTolerance: z.enum(["LOW", "MEDIUM", "HIGH"]),
  targetReturn: z.number().min(0, "Target return must be at least 0").max(1, "Target return must be at most 1"),
  userId: z.string().uuid().optional(),
  stocks: z.array(z.object({
    ticker: z.string().min(1, "Ticker is required"),
    weight: z.number().min(0).max(1),
  })).optional(),
});
