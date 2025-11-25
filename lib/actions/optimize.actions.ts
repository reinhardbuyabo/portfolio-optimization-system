
"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { formatError } from "../utils";

const optimizePortfolioSchema = z.object({
  portfolio_id: z.string(),
  assets: z.array(z.string()),
  prices: z.array(z.number()),
  weights: z.array(z.number()),
});

export type OptimizePortfolioInput = z.infer<typeof optimizePortfolioSchema>;

export async function optimizePortfolio(values: OptimizePortfolioInput) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PORTFOLIO_MANAGER") {
    return { error: "Unauthorized: Only Portfolio Managers can optimize portfolios." };
  }

  const validatedFields = optimizePortfolioSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: "Invalid input." };
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/api/portfolios/${validatedFields.data.portfolio_id}/optimize`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedFields.data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.detail || "An error occurred during optimization." };
    }

    const results = await response.json();
    return { results };
  } catch (error) {
    return { error: formatError(error) };
  }
}
